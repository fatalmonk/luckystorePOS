const assert = require('node:assert/strict');
const test = require('node:test');
const { lines, runResult } = require('./_helpers.cjs');

test('docker container count is bounded when docker is available', () => {
  const result = runResult('docker', ['ps', '-a', '--format', '{{.Names}}']);
  if (!result.ok) {
    assert.ok(/permission denied|Cannot connect|docker daemon/i.test(result.stderr), result.stderr);
    return;
  }

  assert.ok(lines(result.stdout).length < 50, 'too many Docker containers; inspect Docker drift before continuing');
});

test('docker volume count is bounded when docker is available', () => {
  const result = runResult('docker', ['volume', 'ls', '-q']);
  if (!result.ok) {
    assert.ok(/permission denied|Cannot connect|docker daemon/i.test(result.stderr), result.stderr);
    return;
  }

  assert.ok(lines(result.stdout).length < 20, 'too many Docker volumes; do not prune volumes without explicit approval');
});
