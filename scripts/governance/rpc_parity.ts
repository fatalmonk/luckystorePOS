import { spawnSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

type RpcRow = {
  schema: string;
  name: string;
  identity_arguments: string;
  result_type: string;
  security_definer: boolean;
  search_path: string | null;
  definition_md5: string;
};

type RpcEntry = RpcRow & {
  key: string;
};

type ParityResult = {
  status: 'VERIFIED' | 'FAILED' | 'UNVERIFIED';
  generated_at: string;
  local_count: number;
  staging_count: number;
  missing_in_local: RpcEntry[];
  missing_in_staging: RpcEntry[];
  changed: Array<{
    key: string;
    local_hash: string;
    staging_hash: string;
    local_search_path: string | null;
    staging_search_path: string | null;
    local_security_definer: boolean;
    staging_security_definer: boolean;
  }>;
  local_hash: string | null;
  staging_hash: string | null;
};

const RPC_SQL = `
SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.schema, r.name, r.identity_arguments), '[]'::json) AS payload
FROM (
  SELECT
    n.nspname AS schema,
    p.proname AS name,
    pg_get_function_identity_arguments(p.oid) AS identity_arguments,
    pg_get_function_result(p.oid) AS result_type,
    p.prosecdef AS security_definer,
    array_to_string(p.proconfig, ',') AS search_path,
    md5(pg_get_functiondef(p.oid)) AS definition_md5
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
  ORDER BY n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
) r;
`;

function envValue(names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return null;
}

function runPsqlJson(dbUrl: string, sql: string): unknown {
  const result = spawnSync(
    'psql',
    [dbUrl, '--no-psqlrc', '--quiet', '--tuples-only', '--no-align', '--set', 'ON_ERROR_STOP=1'],
    {
      input: sql,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 20,
    },
  );

  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || 'psql failed').replace(dbUrl, '[REDACTED]');
    throw new Error(message.slice(0, 2000));
  }

  const raw = result.stdout.trim();
  if (!raw) return [];
  return JSON.parse(raw);
}

function normalizeRows(rows: unknown): RpcEntry[] {
  if (!Array.isArray(rows)) {
    throw new Error('RPC query returned non-array JSON');
  }

  return rows
    .map((row) => {
      const entry = row as RpcRow;
      return {
        ...entry,
        key: `${entry.schema}.${entry.name}(${entry.identity_arguments})`,
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

function stableHash(entries: RpcEntry[]): string {
  const canonical = entries.map((entry) => ({
    key: entry.key,
    result_type: entry.result_type,
    security_definer: entry.security_definer,
    search_path: entry.search_path,
    definition_md5: entry.definition_md5,
  }));
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

function compare(local: RpcEntry[], staging: RpcEntry[]): ParityResult {
  const localMap = new Map(local.map((entry) => [entry.key, entry]));
  const stagingMap = new Map(staging.map((entry) => [entry.key, entry]));
  const keys = Array.from(new Set([...localMap.keys(), ...stagingMap.keys()])).sort();
  const missingInLocal: RpcEntry[] = [];
  const missingInStaging: RpcEntry[] = [];
  const changed: ParityResult['changed'] = [];

  for (const key of keys) {
    const localEntry = localMap.get(key);
    const stagingEntry = stagingMap.get(key);
    if (!localEntry && stagingEntry) {
      missingInLocal.push(stagingEntry);
      continue;
    }
    if (localEntry && !stagingEntry) {
      missingInStaging.push(localEntry);
      continue;
    }
    if (!localEntry || !stagingEntry) continue;
    if (
      localEntry.definition_md5 !== stagingEntry.definition_md5 ||
      localEntry.search_path !== stagingEntry.search_path ||
      localEntry.security_definer !== stagingEntry.security_definer
    ) {
      changed.push({
        key,
        local_hash: localEntry.definition_md5,
        staging_hash: stagingEntry.definition_md5,
        local_search_path: localEntry.search_path,
        staging_search_path: stagingEntry.search_path,
        local_security_definer: localEntry.security_definer,
        staging_security_definer: stagingEntry.security_definer,
      });
    }
  }

  return {
    status:
      missingInLocal.length === 0 && missingInStaging.length === 0 && changed.length === 0
        ? 'VERIFIED'
        : 'FAILED',
    generated_at: new Date().toISOString(),
    local_count: local.length,
    staging_count: staging.length,
    missing_in_local: missingInLocal,
    missing_in_staging: missingInStaging,
    changed,
    local_hash: stableHash(local),
    staging_hash: stableHash(staging),
  };
}

function parseArgs() {
  const args = new Map<string, string | boolean>();
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = process.argv[i + 1];
    if (!next || next.startsWith('--')) {
      args.set(key, true);
      continue;
    }
    args.set(key, next);
    i += 1;
  }
  return args;
}

function main() {
  const args = parseArgs();
  const localUrl =
    (args.get('local-db-url') as string | undefined) ||
    envValue(['LOCAL_DATABASE_URL', 'LOCAL_SUPABASE_DB_URL', 'DATABASE_URL']);
  const stagingUrl =
    (args.get('staging-db-url') as string | undefined) ||
    envValue(['STAGING_DATABASE_URL', 'STAGING_SUPABASE_DB_URL', 'SUPABASE_DB_URL']);
  const outPath =
    (args.get('out') as string | undefined) ||
    path.resolve(process.cwd(), 'artifacts', 'governance', 'rpc-parity.json');

  if (!localUrl || !stagingUrl) {
    const report: ParityResult = {
      status: 'UNVERIFIED',
      generated_at: new Date().toISOString(),
      local_count: 0,
      staging_count: 0,
      missing_in_local: [],
      missing_in_staging: [],
      changed: [],
      local_hash: null,
      staging_hash: null,
    };
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
    console.error('RPC parity UNVERIFIED: local and staging DB URLs are required by name, values are not printed.');
    process.exit(2);
  }

  const localRows = normalizeRows(runPsqlJson(localUrl, RPC_SQL));
  const stagingRows = normalizeRows(runPsqlJson(stagingUrl, RPC_SQL));
  const report = compare(localRows, stagingRows);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (report.status !== 'VERIFIED') process.exit(1);
}

if (require.main === module) {
  main();
}
