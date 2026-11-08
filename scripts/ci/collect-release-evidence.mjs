#!/usr/bin/env node
/**
 * Collects release-gate evidence. Fail-closed: refuses to emit "pass" evidence
 * without verified credentials and real query results.
 *
 * Modes:
 *   local-versions --out <file>
 *   remote-versions --project-ref <ref> --access-token-env <ENV> --out <file>
 *   rpc-contracts --project-ref <ref> --db-url-env <ENV> --manifest <file> --out <file>
 *   test-validation --source <file|value> --out <file>
 *
 * Remote DB introspection requires credentials not assumed to exist in all
 * environments; the command exits non-zero with a clear message when missing.
 */
import fs from 'node:fs';
import path from 'node:path';

function arg(name, argv = process.argv.slice(2)) {
  const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined;
}
function req(name, argv) { const v = arg(name, argv); if (!v) throw new Error(`Missing ${name}`); return v; }

function writeJson(out, value) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(value, null, 2)}\n`);
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
  if (cmd === 'remote-versions') {
    const tokenEnv = arg('--access-token-env', argv) || 'SUPABASE_ACCESS_TOKEN';
    const token = process.env[tokenEnv];
    const projectRef = req('--project-ref', argv);
    if (!token) throw new Error(`Remote migration history requires ${tokenEnv}. Refusing to emit inferred history.`);
    // Use Supabase Management API migration history endpoint if available.
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/migrations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to query migration history for ${projectRef}: HTTP ${res.status} ${await res.text()}`);
    const data = await res.json();
    const versions = (Array.isArray(data) ? data : data?.migrations ?? []).map((m) => m?.version).filter((v) => typeof v === 'string');
    if (!versions.length) throw new Error(`No migration history returned for ${projectRef}; refusing empty evidence.`);
    writeJson(req('--out', argv), [...new Set(versions)].sort());
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
  throw new Error(`Unknown command ${cmd}. Use local-versions, remote-versions, rpc-contracts, or test-validation.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
