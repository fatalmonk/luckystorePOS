#!/usr/bin/env node
/**
 * Collects release-gate evidence. Fail-closed: refuses to emit "pass" evidence
 * without verified credentials and real query results.
 *
 * Modes:
 *   local-versions --out <file>
 *   project-history --project-ref <ref> --access-token-env <ENV> --out <file>
 *   remote-versions --project-ref <ref> --access-token-env <ENV> --out <file>
 *   rpc-contracts --project-ref <ref> --db-url-env <ENV> --manifest <file> --out <file>
 *   test-validation --source <file|value> --out <file>
 *
 * Remote DB introspection requires credentials not assumed to exist in all
 * environments; the command exits non-zero with a clear message when missing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_HISTORY_EVIDENCE_SCHEMA = 'luckystore.supabase-project-migration-evidence/v1';
const SUPABASE_MANAGEMENT_API = 'https://api.supabase.com/v1';

function arg(name, argv = process.argv.slice(2)) {
  const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined;
}
function req(name, argv) { const v = arg(name, argv); if (!v) throw new Error(`Missing ${name}`); return v; }

function writeJson(out, value) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(value, null, 2)}\n`);
}

export function normalizeMigrationHistoryRows(data) {
  const input = Array.isArray(data) ? data : data?.migrations;
  if (!Array.isArray(input)) throw new Error('Migration history response must be an array or contain a migrations array.');
  const byVersion = new Map();
  for (const [index, row] of input.entries()) {
    if (!row || typeof row.version !== 'string' || !/^\d{14}$/.test(row.version)) {
      throw new Error(`Migration history contains an invalid version entry at index ${index}.`);
    }
    const name = typeof row.name === 'string' && row.name.trim() ? row.name.trim() : null;
    let statementsPresent = null;
    if ('statements' in row) {
      if (row.statements == null) statementsPresent = false;
      else if (Array.isArray(row.statements)) statementsPresent = row.statements.length > 0;
      else statementsPresent = true;
    }
    if (!byVersion.has(row.version)) {
      byVersion.set(row.version, { version: row.version, name, statementsPresent });
      continue;
    }
    const previous = byVersion.get(row.version);
    if (previous.name != null && name != null && previous.name !== name) {
      throw new Error(`Migration history contains conflicting names for version ${row.version}.`);
    }
    if (previous.statementsPresent != null && statementsPresent != null && previous.statementsPresent !== statementsPresent) {
      throw new Error(`Migration history contains conflicting statement metadata for version ${row.version}.`);
    }
    if (previous.name == null && name != null) previous.name = name;
    if (previous.statementsPresent == null && statementsPresent != null) previous.statementsPresent = statementsPresent;
  }
  return [...byVersion.values()].sort((a, b) => a.version.localeCompare(b.version));
}

async function fetchManagementJson(url, label, { accessToken, fetchImpl, method = 'GET', body }) {
  const response = await fetchImpl(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`Failed to query ${label}: HTTP ${response.status}.`);
  return response.json();
}

export async function collectProjectMigrationEvidence({
  projectRef,
  accessToken,
  fetchImpl = fetch,
  now = () => new Date(),
} = {}) {
  if (!/^[a-z]{20}$/.test(String(projectRef || ''))) throw new Error(`Invalid Supabase project ref: ${projectRef ?? '(missing)'}`);
  if (!accessToken) throw new Error('Supabase access token is required for independent project and migration-history evidence.');

  const projectUrl = `${SUPABASE_MANAGEMENT_API}/projects/${projectRef}`;
  const project = await fetchManagementJson(projectUrl, 'project identity', { accessToken, fetchImpl });
  if (project?.ref !== projectRef) {
    throw new Error(`Supabase Management API returned project ${project?.ref ?? '(missing)'}; expected ${projectRef}.`);
  }

  const historyUrl = `${projectUrl}/database/migrations`;
  const historyData = await fetchManagementJson(historyUrl, 'migration history', { accessToken, fetchImpl });
  const checkedAt = now().toISOString();
  return {
    schema: PROJECT_HISTORY_EVIDENCE_SCHEMA,
    source: 'supabase-management-api',
    requestedProjectRef: projectRef,
    checkedAt,
    identity: {
      source: 'supabase-management-api',
      projectRef: project.ref,
      status: typeof project.status === 'string' ? project.status : null,
      method: 'GET /v1/projects/{ref}',
      checkedAt,
    },
    history: {
      source: 'supabase-management-api',
      projectRef: project.ref,
      method: 'GET /v1/projects/{ref}/database/migrations',
      checkedAt,
      rows: normalizeMigrationHistoryRows(historyData),
    },
  };
}

export async function collectProjectFunctionEvidence({
  projectRef,
  accessToken,
  functionContract,
  fetchImpl = fetch,
  now = () => new Date(),
} = {}) {
  if (!/^[a-z]{20}$/.test(String(projectRef || ''))) throw new Error(`Invalid Supabase project ref: ${projectRef ?? '(missing)'}`);
  if (!accessToken) throw new Error('Supabase access token is required for live function evidence.');
  const { schema, name, argTypes } = functionContract ?? {};
  if (!/^[a-z_][a-z0-9_]*$/.test(String(schema || '')) || !/^[a-z_][a-z0-9_]*$/.test(String(name || ''))) {
    throw new Error('Function evidence requires safe lowercase schema and function identifiers.');
  }
  if (!Array.isArray(argTypes) || argTypes.length === 0 || argTypes.some((type) => !/^[a-z_][a-z0-9_ ]*(?:\[\])?$/.test(String(type || '')))) {
    throw new Error('Function evidence requires safe PostgreSQL argument types.');
  }

  const signature = `${schema}.${name}(${argTypes.join(',')})`;
  const query = `select pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_args, p.prosrc as body, pg_catalog.pg_get_function_result(p.oid) as result_type, l.lanname as language, case p.provolatile when 'i' then 'immutable' when 's' then 'stable' else 'volatile' end as volatility, p.prosecdef as security_definer, pg_catalog.pg_get_userbyid(p.proowner) as owner, coalesce(p.proconfig, array[]::text[]) as proconfig, coalesce((select array_agg((case when acl.grantee = 0 then 'PUBLIC' else pg_catalog.pg_get_userbyid(acl.grantee) end) || ' ' || acl.privilege_type order by acl.grantee, acl.privilege_type) from pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) acl), array[]::text[]) as grants from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace join pg_catalog.pg_language l on l.oid = p.prolang where p.oid = pg_catalog.to_regprocedure('${signature}')`;
  const url = `${SUPABASE_MANAGEMENT_API}/projects/${projectRef}/database/query/read-only`;
  const rows = await fetchManagementJson(url, 'read-only function catalog evidence', {
    accessToken,
    fetchImpl,
    method: 'POST',
    body: { query },
  });
  if (!Array.isArray(rows) || rows.length !== 1 || typeof rows[0]?.body !== 'string') {
    throw new Error(`Read-only function catalog query returned ${Array.isArray(rows) ? rows.length : 'an invalid response'} rows; expected exactly one.`);
  }
  const row = rows[0];
  const searchPathSetting = Array.isArray(row.proconfig)
    ? row.proconfig.find((value) => typeof value === 'string' && value.startsWith('search_path='))
    : null;
  const configuredSearchPath = searchPathSetting ? searchPathSetting.slice('search_path='.length) : null;
  const searchPath = configuredSearchPath === '""' ? '' : configuredSearchPath;
  return {
    source: 'supabase-management-api-read-only',
    projectRef,
    method: 'POST /v1/projects/{ref}/database/query/read-only',
    checkedAt: now().toISOString(),
    function: {
      schema,
      name,
      argTypes,
      identityArgs: typeof row.identity_args === 'string' ? row.identity_args : null,
      body: row.body,
      resultType: row.result_type,
      language: row.language,
      volatility: row.volatility,
      securityDefiner: row.security_definer,
      owner: row.owner,
      searchPath,
      grants: Array.isArray(row.grants) ? row.grants : [],
    },
  };
}

export function projectHistoryOutputForMode(mode, evidence) {
  if (mode === 'project-history') return evidence;
  if (mode === 'remote-versions') return evidence.history.rows.map(({ version }) => version);
  throw new Error(`Unsupported project history output mode: ${mode}`);
}

async function main(argv = process.argv.slice(2)) {
  const [cmd] = argv;
  if (cmd === 'local-versions') {
    const dir = arg('--dir', argv) || 'supabase/migrations';
    const versions = fs.readdirSync(dir)
      .map((f) => /^(\d{14})_.*\.sql$/.exec(f)?.[1]).filter(Boolean).sort();
    writeJson(req('--out', argv), versions);
    return;
  }
  if (cmd === 'project-history' || cmd === 'remote-versions') {
    const tokenEnv = arg('--access-token-env', argv) || 'SUPABASE_ACCESS_TOKEN';
    const token = process.env[tokenEnv];
    const projectRef = req('--project-ref', argv);
    if (!token) throw new Error(`Remote migration history requires ${tokenEnv}. Refusing to emit inferred history.`);
    const evidence = await collectProjectMigrationEvidence({ projectRef, accessToken: token });
    writeJson(req('--out', argv), projectHistoryOutputForMode(cmd, evidence));
    return;
  }
  if (cmd === 'rpc-contracts') {
    const dbUrlEnv = arg('--db-url-env', argv) || 'SUPABASE_DB_URL';
    const dbUrl = process.env[dbUrlEnv];
    const manifest = JSON.parse(fs.readFileSync(req('--manifest', argv), 'utf8'));
    const required = manifest.requiredRpcContracts ?? [];
    if (!required.length) { writeJson(req('--out', argv), []); return; }
    if (!dbUrl) throw new Error(`RPC contract evidence requires ${dbUrlEnv} for direct catalog introspection. Refusing to emit inferred contracts.`);
    throw new Error('Direct DB introspection is not implemented in this environment; provide a verified rpc-contracts JSON file produced by an approved introspection path.');
  }
  if (cmd === 'test-validation') {
    const source = req('--source', argv);
    let value;
    if (source === 'true' || source === 'false') value = source === 'true';
    else value = JSON.parse(fs.readFileSync(source, 'utf8'));
    if (value !== true && value !== false) throw new Error(`test-validation evidence must be true/false, got ${JSON.stringify(value)}`);
    writeJson(req('--out', argv), value);
    return;
  }
  throw new Error(`Unknown command ${cmd}. Use local-versions, project-history, remote-versions, rpc-contracts, or test-validation.`);
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isCli) main().catch((e) => { console.error(e.message); process.exit(1); });
