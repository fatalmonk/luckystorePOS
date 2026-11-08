import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {
  buildMigrationManifest,
  validateManifestAgainstFiles,
  validateRemoteMigrationState,
  verifyArtifactProvenance,
  evaluateReleaseGate,
} from './release-migrations.mjs';

const migrationSql = (name) => `-- ${name}\nBEGIN; SELECT 1; COMMIT;\n`;
const sha256 = (content) => createHash('sha256').update(content).digest('hex');

test('buildMigrationManifest binds reviewed commit to migration versions, names, and SQL hashes', () => {
  const files = new Map([
    ['supabase/migrations/20261107230000_add_storefront_prefix_resolver.sql', migrationSql('prefix')],
  ]);
  const manifest = buildMigrationManifest({
    commitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    migrations: [
      { version: '20261107230000', name: 'add_storefront_prefix_resolver', path: 'supabase/migrations/20261107230000_add_storefront_prefix_resolver.sql' },
    ],
    requiredRpcContracts: [
      { schema: 'public', name: 'resolve_storefront_item_prefix_v1', argTypes: ['uuid', 'text'] },
    ],
    readFile: (path) => files.get(path),
  });
  assert.equal(manifest.commitSha, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  assert.equal(manifest.migrations[0].sha256, sha256(migrationSql('prefix')));
  assert.deepEqual(manifest.requiredRpcContracts[0].argTypes, ['uuid', 'text']);
});

test('validateManifestAgainstFiles fails on changed SQL hash or changed reviewed SHA', () => {
  const files = new Map([
    ['supabase/migrations/20261107230000_add_storefront_prefix_resolver.sql', migrationSql('changed')],
  ]);
  const manifest = {
    commitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    migrations: [{
      version: '20261107230000',
      name: 'add_storefront_prefix_resolver',
      path: 'supabase/migrations/20261107230000_add_storefront_prefix_resolver.sql',
      sha256: sha256(migrationSql('original')),
    }],
    requiredRpcContracts: [],
  };
  const result = validateManifestAgainstFiles(manifest, {
    reviewedCommitSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    readFile: (path) => files.get(path),
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /reviewed commit SHA/);
  assert.match(result.errors.join('\n'), /SQL hash/i);
});

test('validateRemoteMigrationState fails on wrong target, remote-only history, or unreviewed pending migrations', () => {
  const manifest = {
    commitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    migrations: [{
      version: '20261107230000',
      name: 'add_storefront_prefix_resolver',
      sha256: sha256(migrationSql('prefix')),
    }],
    requiredRpcContracts: [],
  };
  const result = validateRemoteMigrationState({
    manifest,
    target: { expectedProjectRef: 'grxxenvdhfwzafzyykgo', actualProjectRef: 'hvmyxyccfnkrbxqbhlnm' },
    localMigrationVersions: ['20261106000000', '20261107230000', '20261108000000_future'],
    remoteMigrationVersions: ['20261106000000', '20261107230000', '20261107999999_unknown'],
    pendingVersions: ['20261108000000_future'],
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /target/i);
  assert.match(result.errors.join('\n'), /remote-only/i);
  assert.match(result.errors.join('\n'), /unreviewed/i);
});

test('verifyArtifactProvenance fails when smoke/health SHA does not match expected commit', () => {
  const result = verifyArtifactProvenance({
    expectedSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    healthResponse: { status: 'ok', service: 'customer-storefront', buildSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /build SHA/i);
});

test('evaluateReleaseGate blocks production promotion on failed test validation, RPC drift, or provenance failure', () => {
  const result = evaluateReleaseGate({
    mode: 'promote',
    environment: 'production',
    targetVerified: true,
    manifestValid: true,
    remoteStateValid: true,
    testValidationPassed: false,
    rpcContractsValid: false,
    artifactProvenanceValid: false,
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /test validation/i);
  assert.match(result.errors.join('\n'), /RPC/i);
  assert.match(result.errors.join('\n'), /provenance/i);
});

test('evaluateReleaseGate allows production app promotion only when all required gates pass', () => {
  const result = evaluateReleaseGate({
    mode: 'promote',
    environment: 'production',
    targetVerified: true,
    manifestValid: true,
    remoteStateValid: true,
    testValidationPassed: true,
    rpcContractsValid: true,
    artifactProvenanceValid: true,
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});
