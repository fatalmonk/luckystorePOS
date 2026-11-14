#!/usr/bin/env node
// Fail-closed public API check against dedicated Lucky Store Testing only.
// Never call real entity IDs or use service_role for negative write probes.
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const TEST_REF = 'grxxenvdhfwzafzyykgo';
const URL = 'https://' + TEST_REF + '.supabase.co';

export function targetFromEnv(env) {
  const raw = env.NEXT_PUBLIC_SUPABASE_URL || env.TEST_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.TEST_SUPABASE_ANON_KEY;
  if (!raw || !key || env.E2E_SUPABASE_PROJECT_REF !== TEST_REF) {
    throw new Error('Missing dedicated Testing URL, public key or exact project reference');
  }
  let parsed;
  try { parsed = new globalThis.URL(raw); } catch { throw new Error('Invalid Supabase URL'); }
  if (parsed.href !== URL + '/') throw new Error('Refusing Production or unknown Supabase endpoint');
  return { origin: parsed.origin, key };
}

export function probes(uuid = randomUUID) {
  const output = [];
  for (const [label, table, fk] of [
    ['item', 'item_translations', 'item_id'],
    ['category', 'category_translations', 'category_id'],
  ]) {
    const base = '/rest/v1/' + table;
    output.push({ label: label + ': public name', method: 'GET', path: base + '?select=id,name&limit=1', expected: [200] });
    for (const field of ['evidence_snapshot', 'reviewed_by', 'published_by']) {
      output.push({ label: label + ': private ' + field, method: 'GET', path: base + '?select=' + field + '&limit=1', expected: [401, 403] });
    }
    output.push({ label: label + ': INSERT', method: 'POST', path: base, expected: [401, 403],
      body: { id: uuid(), tenant_id: uuid(), [fk]: uuid(), name: 'TEST ONLY' } });
    // UUID is new and nonexistent; even if the permissions regress, these requests cannot touch real data.
    const missing = uuid();
    output.push({ label: label + ': UPDATE', method: 'PATCH', path: base + '?id=eq.' + missing, expected: [401, 403], body: { name: 'TEST ONLY' } });
    output.push({ label: label + ': DELETE', method: 'DELETE', path: base + '?id=eq.' + missing, expected: [401, 403] });
  }
  return output;
}

export async function verifyApi(target, options = {}) {
  const fetcher = options.fetcher || fetch;
  const checks = options.checks || probes();
  const headers = { apikey: target.key, accept: 'application/json', 'content-type': 'application/json', Prefer: 'return=minimal' };
  const results = [];
  for (const check of checks) {
    let status = null;
    try {
      const response = await fetcher(target.origin + check.path, {
        method: check.method, headers,
        body: check.body ? JSON.stringify(check.body) : undefined,
        signal: AbortSignal.timeout(10000), redirect: 'error',
      });
      status = response.status;
    } catch { /* Any network error fails closed. */ }
    results.push({ label: check.label, status, pass: check.expected.includes(status) });
  }
  return results;
}

async function main() {
  const target = targetFromEnv(process.env);
  const results = await verifyApi(target);
  for (const r of results) console.log((r.pass ? 'PASS ' : 'FAIL ') + r.label + ': HTTP ' + String(r.status));
  console.log('Bengali translation API: ' + results.filter(x => x.pass).length + '/' + results.length + ' passed');
  if (results.some(x => !x.pass)) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(error => {
    console.error('Translation API preflight failed: ' + error.message);
    process.exitCode = 1;
  });
}
