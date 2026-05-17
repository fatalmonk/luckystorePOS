const assert = require('node:assert/strict');
const test = require('node:test');
const { lines, run } = require('./_helpers.cjs');

const forbiddenRootArtifacts = [
  'local-adjust_stock.txt',
  'local-deduct_stock.txt',
  'local-rpc.txt',
  'staging-adjust_stock.txt',
  'staging-deduct_stock.txt',
  'staging-rpc.txt',
  'replay_output.txt',
  'reset_output.txt',
  'rpc-parity.diff',
];

test('raw local/staging debug artifacts are not left at repo root', () => {
  const untracked = new Set(lines(run('git', ['ls-files', '--others', '--exclude-standard'])));
  const present = forbiddenRootArtifacts.filter((file) => untracked.has(file));
  assert.deepEqual(
    present,
    [],
    `raw debug/parity artifacts must be quarantined or ignored before certification:\n${present.join('\n')}`,
  );
});

test('ignored env files stay ignored', () => {
  const ignored = run('git', [
    'check-ignore',
    '.env',
    '.env.certify.local',
    '.env.certify.staging',
    'apps/admin_web/.env',
    'apps/admin_web/.env.local',
  ]);

  for (const file of ['.env', '.env.certify.local', '.env.certify.staging', 'apps/admin_web/.env', 'apps/admin_web/.env.local']) {
    assert.match(ignored, new RegExp(`${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'), `${file} is not ignored`);
  }
});
