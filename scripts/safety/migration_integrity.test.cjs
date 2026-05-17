const assert = require('node:assert/strict');
const test = require('node:test');
const { lines, redact, run, runResult } = require('./_helpers.cjs');

test('migration directory has no untracked/deleted/renamed files', () => {
  const status = run('git', ['status', '--porcelain', '--', 'supabase/migrations']);
  const suspicious = lines(status).filter((line) => {
    const code = line.slice(0, 2);
    return code === '??' || code.includes('D') || code.includes('R');
  });

  assert.deepEqual(
    suspicious,
    [],
    `migration lineage is dirty:\n${suspicious.join('\n')}`,
  );
});

test('migration timestamps are unique', () => {
  const files = lines(run('find', ['supabase/migrations', '-maxdepth', '1', '-type', 'f', '-name', '*.sql']));
  const timestamps = new Map();
  const duplicates = [];

  for (const file of files) {
    const match = file.match(/\/(\d{14})_/);
    assert.ok(match, `migration filename does not start with 14 digit timestamp: ${file}`);
    const stamp = match[1];
    if (timestamps.has(stamp)) {
      duplicates.push(`${stamp}: ${timestamps.get(stamp)} | ${file}`);
    } else {
      timestamps.set(stamp, file);
    }
  }

  assert.deepEqual(duplicates, [], `duplicate migration timestamps:\n${duplicates.join('\n')}`);
});

test('local migration list is clean when explicitly enabled', { skip: process.env.CHECK_LOCAL_SUPABASE !== '1' }, () => {
  const result = runResult('supabase', ['migration', 'list', '--local']);
  assert.equal(result.ok, true, redact(result.stderr || result.stdout));
  assert.match(result.stdout, /Local/i);
});

test('linked db diff does not emit auth/bootstrap failures when explicitly enabled', { skip: process.env.CHECK_LINKED_SUPABASE !== '1' }, () => {
  const result = runResult('supabase', ['db', 'diff', '--linked']);
  const output = redact(`${result.stdout}\n${result.stderr}`);
  assert.doesNotMatch(output, /panic|unexpected login role status|access token not provided|password authentication failed|SUPABASE_DB_PASSWORD|status 400/i);
  assert.equal(result.ok, true, output);
});
