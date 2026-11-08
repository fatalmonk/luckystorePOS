import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {
  buildMigrationManifest,
  validateManifestAgainstFiles,
  validateRemoteMigrationState,
  validateRpcContracts,
  verifyArtifactProvenance,
  evaluateReleaseGate,
  evaluateSmokeHealth,
} from './release-migrations.mjs';

const migrationSql = (name) => `-- ${name}\nBEGIN; SELECT 1; COMMIT;\n`;
const sha256 = (content) => createHash('sha256').update(content).digest('hex');
const manifestFixture = (overrides = {}) => ({
  schema: 'luckystore.release-migrations/v1',
  commitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  migrations: [{
    version: '20261107230000',
    name: 'add_storefront_prefix_resolver',
    path: 'supabase/migrations/20261107230000_add_storefront_prefix_resolver.sql',
    sha256: sha256(migrationSql('prefix')),
  }],
  requiredRpcContracts: [{ schema: 'public', name: 'resolve_storefront_item_prefix_v1', argTypes: ['uuid', 'text'] }],
  ...overrides,
});
const rpcContractsOk = () => ([{
  schema: 'public', name: 'resolve_storefront_item_prefix_v1', argTypes: ['uuid', 'text'],
  definition: 'CREATE FUNCTION ...', owner: 'postgres', searchPath: 'public', grants: ['anon EXECUTE'],
}]);

test('buildMigrationManifest binds reviewed commit to migration versions, names, and SQL hashes', () => {
  const files = new Map([
    ['supabase/migrations/20261107230000_add_storefront_prefix_resolver.sql', migrationSql('prefix')],
  ]);
  const manifest = buildMigrationManifest({
    commitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    migrations: [
      { version: '20261107230000', name: 'add_storefront_prefix_resolver', path: 'supabase/migrations/20261107230000_add_storefront_prefix_resolver.sql' },
    ],
    requiredRpcContracts: [{ schema: 'public', name: 'resolve_storefront_item_prefix_v1', argTypes: ['uuid', 'text'] }],
    readFile: (path) => files.get(path),
  });
  assert.equal(manifest.commitSha, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  assert.equal(manifest.migrations[0].sha256, sha256(migrationSql('prefix')));
  assert.deepEqual(manifest.requiredRpcContracts[0].argTypes, ['uuid', 'text']);
});

test('validateManifestAgainstFiles fails when expected commit is missing or changed, or SQL hash changed', () => {
  const files = new Map([
    ['supabase/migrations/20261107230000_add_storefront_prefix_resolver.sql', migrationSql('changed')],
  ]);
  const manifest = manifestFixture();
  const missing = validateManifestAgainstFiles(manifest, { readFile: (path) => files.get(path) });
  assert.equal(missing.ok, false);
  assert.match(missing.errors.join('\n'), /Expected commit SHA is required/);
  const mismatch = validateManifestAgainstFiles(manifest, {
    commitSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    readFile: (path) => files.get(path),
  });
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.errors.join('\n'), /does not match expected commit|Reviewed SQL changed/);
});

test('validateRemoteMigrationState fails on wrong target, missing remote migration, remote drift, or missing history', () => {
  const manifest = manifestFixture();
  const result = validateRemoteMigrationState({
    targetRef: 'wrong', expectedRef: 'grxxenvdhfwzafzyykgo', manifest,
    localVersions: ['20261107230000'], remoteVersions: ['20261107230000', '20990101000000'],
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /Target project ref is unverified/);
  assert.match(result.errors.join('\n'), /20990101000000.*missing locally/);
  const missingRemote = validateRemoteMigrationState({
    targetRef: 'grxxenvdhfwzafzyykgo', expectedRef: 'grxxenvdhfwzafzyykgo', manifest,
    localVersions: ['20261107230000'], remoteVersions: [],
  });
  assert.equal(missingRemote.ok, false);
  assert.match(missingRemote.errors.join('\n'), /not present on the target/);
  const missingHistory = validateRemoteMigrationState({
    targetRef: 'grxxenvdhfwzafzyykgo', expectedRef: 'grxxenvdhfwzafzyykgo', manifest,
    localVersions: null, remoteVersions: ['20261107230000'],
  });
  assert.equal(missingHistory.ok, false);
  assert.match(missingHistory.errors.join('\n'), /Local migration history is required/);
});

test('validateRpcContracts fails without live evidence and requires definition/owner/searchPath/grants', () => {
  const manifest = manifestFixture();
  const missing = validateRpcContracts({ manifest, rpcContracts: null, rpcEvidence: true });
  assert.equal(missing.ok, false);
  assert.match(missing.errors.join('\n'), /no live contract evidence/);
  const incomplete = validateRpcContracts({ manifest, rpcContracts: [{ schema: 'public', name: 'resolve_storefront_item_prefix_v1', argTypes: ['uuid', 'text'] }], rpcEvidence: true });
  assert.equal(incomplete.ok, false);
  assert.match(incomplete.errors.join('\n'), /missing required evidence field/);
  const ok = validateRpcContracts({ manifest, rpcContracts: rpcContractsOk(), rpcEvidence: true });
  assert.equal(ok.ok, true);
});



test('evaluateReleaseGate blocks production promotion on missing evidence and passes only with complete gates', () => {
  const good = {
    manifestValidation: { ok: true, errors: [] },
    remoteValidation: { ok: true, errors: [] },
    rpcValidation: { ok: true, errors: [] },
    provenanceValidation: { ok: true, errors: [] },
  };
  const bad = evaluateReleaseGate({ ...good, testValidationPassed: null, mode: 'promote' });
  assert.equal(bad.ok, false);
  assert.match(bad.errors.join('\n'), /Test validation.*required/);
  const drift = evaluateReleaseGate({ ...good, testValidationPassed: true, rpcValidation: { ok: false, errors: ['drift'] }, mode: 'promote' });
  assert.equal(drift.ok, false);
  assert.match(drift.errors.join('\n'), /rpcContracts gate failed|blocked/i);
  const ok = evaluateReleaseGate({ ...good, testValidationPassed: true, mode: 'promote' });
  assert.equal(ok.ok, true);
});

test('verifyArtifactProvenance refuses plaintext HTTP unless explicitly allowed', async () => {
  const result = await verifyArtifactProvenance({
    expectedSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    healthUrl: 'http://example.com/api/health',
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /plaintext HTTP/i);
});

test('evaluateSmokeHealth requires expected SHA and parseable health body', () => {
  const now = Date.now();
  const ok = evaluateSmokeHealth({ status: 200, body: { status: 'ok', timestamp: new Date(now).toISOString(), buildSha: 'aaa' }, expectedSha: 'aaa', now });
  assert.equal(ok.ok, true);
  const missing = evaluateSmokeHealth({ status: 200, body: { status: 'ok', timestamp: new Date(now).toISOString() }, expectedSha: 'aaa', now });
  assert.equal(missing.ok, false);
});
