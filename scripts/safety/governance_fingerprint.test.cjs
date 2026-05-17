const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { run, runResult } = require('./_helpers.cjs');

test('governance fingerprint script is opt-in and does not run before requested runtime checks', { skip: process.env.CHECK_FINGERPRINT !== '1' }, () => {
  run('npx', [
    'tsc',
    '--module',
    'commonjs',
    '--target',
    'es2022',
    '--types',
    'node',
    '--esModuleInterop',
    '--skipLibCheck',
    '--outDir',
    '/private/tmp/luckystore-safety-fingerprint',
    'scripts/governance/fingerprint.ts',
  ]);
  const result = runResult('node', ['/private/tmp/luckystore-safety-fingerprint/governance/fingerprint.js'], { timeout: 30_000 });
  assert.equal(result.ok, true, result.stderr || result.stdout);
  assert.match(result.stdout, /fingerprint|match|awaiting|mismatch/i);
});

test('committed staging fingerprint artifact is deterministic JSON when present', () => {
  const file = 'artifacts/governance/staging-fingerprint.json';
  if (!fs.existsSync(file)) return;

  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  const keys = Object.keys(parsed).sort();
  const required = ['constraint_hash', 'extension_hash', 'index_hash', 'migration_hash', 'rpc_hash', 'rls_hash', 'schema_hash', 'trigger_hash'];
  for (const key of required) {
    assert.ok(keys.includes(key), `missing fingerprint key: ${key}`);
    assert.match(String(parsed[key]), /^[a-f0-9]{32,64}$/i, `fingerprint key ${key} is not hash-shaped`);
  }
});
