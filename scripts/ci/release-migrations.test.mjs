import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import fs from 'node:fs';
import {
  buildMigrationManifest,
  verifyReleaseMigrationHistory,
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
    filename: '20261107230000_add_storefront_prefix_resolver.sql',
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
  assert.equal(manifest.migrations[0].filename, '20261107230000_add_storefront_prefix_resolver.sql');
  assert.equal(manifest.migrations[0].sha256, sha256(migrationSql('prefix')));
  assert.deepEqual(manifest.requiredRpcContracts[0].argTypes, ['uuid', 'text']);
});

test('validateManifestAgainstFiles fails when expected commit is changed, or SQL hash changed; uses manifest commit when arg omitted', () => {
  const files = new Map([
    ['supabase/migrations/20261107230000_add_storefront_prefix_resolver.sql', migrationSql('changed')],
  ]);
  const manifest = manifestFixture();
  const implied = validateManifestAgainstFiles(manifest, { readFile: () => migrationSql('prefix') });
  assert.equal(implied.ok, true);
  assert.equal(implied.status, 'PASS');
  assert.equal(implied.reviewedCommitSha, manifest.commitSha);
  const mismatch = validateManifestAgainstFiles(manifest, {
    commitSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    readFile: (path) => files.get(path),
  });
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.errors.join('\n'), /Manifest commit SHA mismatch|Migration SQL hash mismatch|Reviewed SQL changed/);
});

test('validateRemoteMigrationState fails on wrong target, missing remote migration, remote drift, or missing history', () => {
  const manifest = manifestFixture();
  const result = validateRemoteMigrationState({
    targetRef: 'wrong', expectedRef: 'grxxenvdhfwzafzyykgo', manifest,
    localVersions: ['20261107230000'], projectEvidence: projectEvidenceOk(['20261107230000', '20990101000000']),
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /Target project ref is unverified/);
  assert.match(result.errors.join('\n'), /20990101000000.*missing locally/);
  const missingRemote = validateRemoteMigrationState({
    targetRef: 'grxxenvdhfwzafzyykgo', expectedRef: 'grxxenvdhfwzafzyykgo', manifest,
    localVersions: ['20261107230000'], projectEvidence: projectEvidenceOk([]),
  });
  assert.equal(missingRemote.ok, false);
  assert.match(missingRemote.errors.join('\n'), /not present on the target/);
  const missingHistory = validateRemoteMigrationState({
    targetRef: 'grxxenvdhfwzafzyykgo', expectedRef: 'grxxenvdhfwzafzyykgo', manifest,
    localVersions: null, projectEvidence: projectEvidenceOk(['20261107230000']),
  });
  assert.equal(missingHistory.ok, false);
  assert.equal(missingHistory.status, 'UNVERIFIED');
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


// ─── E6-R Phase 2: reviewed manifest + read-only history verification ────────

const V = '20261107230000';
const COMMIT = 'e6c1b1bdd35d837ee157323ffb85d61c377edf02';
const TEST_REF = 'grxxenvdhfwzafzyykgo';
const PROD_REF = 'hvmyxyccfnkrbxqbhlnm';

const projectEvidenceOk = (rows = [richEntry(V, { name: 'add_storefront_prefix_resolver' })], projectRef = TEST_REF) => ({
  schema: 'luckystore.supabase-project-migration-evidence/v1',
  source: 'supabase-management-api',
  requestedProjectRef: projectRef,
  checkedAt: '2026-11-08T20:00:00Z',
  identity: {
    source: 'supabase-management-api',
    projectRef,
    status: 'ACTIVE_HEALTHY',
    method: 'GET /v1/projects/{ref}',
    checkedAt: '2026-11-08T20:00:00Z',
  },
  history: {
    source: 'supabase-management-api',
    projectRef,
    method: 'GET /v1/projects/{ref}/database/migrations',
    checkedAt: '2026-11-08T20:00:00Z',
    rows,
  },
});

const richEntry = (version, opts = {}) => ({
  version,
  name: 'name' in opts ? opts.name : `mig_${version}`,
  statements: 'statements' in opts ? opts.statements : ['BEGIN; SELECT 1; COMMIT;'],
});

const realManifest = (commitSha = COMMIT) => buildMigrationManifest({
  commitSha,
  migrations: [{ version: V, name: 'add_storefront_prefix_resolver', path: `supabase/migrations/${V}_add_storefront_prefix_resolver.sql` }],
});

const verify = (overrides = {}) => verifyReleaseMigrationHistory({
  manifest: realManifest(),
  commitSha: COMMIT,
  expectedRef: TEST_REF,
  localVersions: [V],
  projectEvidence: projectEvidenceOk(),
  ...overrides,
});

test('verified reviewed SQL and identity classify the migration as APPLIED', () => {
  const manifest = realManifest();
  const schemaEvidence = {
    schema: 'luckystore.migration-schema-evidence/v1',
    projectRef: TEST_REF,
    method: 'read-only catalog introspection',
    checkedAt: '2026-11-08T19:13:00Z',
    records: [{
      version: V,
      reviewedFileSha256: manifest.migrations[0].sha256,
      projectRef: TEST_REF,
      definitionEquivalent: true,
      method: 'read-only catalog introspection',
      checkedAt: '2026-11-08T19:13:00Z',
    }],
  };
  const r = verify({ manifest, schemaEvidence });
  assert.equal(r.status, 'APPLIED');
  assert.equal(r.classification, 'APPLIED');
  assert.equal(r.migrationStates[0].state, 'APPLIED');
  assert.deepEqual(r.alreadyAppliedReviewed, [V]);
  assert.deepEqual(r.reviewedPending, []);
  assert.deepEqual(r.unexplainedRemoteDrift, []);
  assert.equal(r.historyMetadataIncomplete[0].provenance, 'statements-present-unhashed');
});

test('explicit no-migration release is valid; unauthorized empty manifest throws', () => {
  const manifest = buildMigrationManifest({ commitSha: COMMIT, migrations: [], noMigrationChange: true, reason: 'Docs-only release: no database changes reviewed.' });
  assert.equal(manifest.noMigrationChange, true);
  const r = verify({ manifest, commitSha: manifest.commitSha, localVersions: ['20261106000000'], projectEvidence: projectEvidenceOk([richEntry('20261106000000')]) });
  assert.equal(r.status, 'APPLIED');
  assert.equal(r.noMigrationChange ?? manifest.noMigrationChange, true);
  assert.throws(() => buildMigrationManifest({ commitSha: COMMIT, migrations: [] }), /explicitly list reviewed migrations or set noMigrationChange/);
  assert.throws(() => buildMigrationManifest({ commitSha: COMMIT, migrations: [], noMigrationChange: true }), /requires an explicit reason/);
});

test('modified SQL hash and manifest/commit SHA mismatch are rejected', () => {
  const badSha = realManifest();
  badSha.migrations[0].sha256 = 'deadbeef'.repeat(8);
  const r = verify({ manifest: badSha });
  assert.equal(r.status, 'UNVERIFIED');
  assert.match(r.errors.join('\n'), /Migration SQL hash mismatch/);
  const mismatch = verify({ commitSha: 'f'.repeat(40) });
  assert.equal(mismatch.status, 'UNVERIFIED');
  assert.match(mismatch.errors.join('\n'), /Manifest commit SHA mismatch/);
});

test('missing or renamed migration file fails; duplicate version rejected', () => {
  const missing = realManifest();
  missing.migrations[0].path = 'supabase/migrations/20261107230000_renamed.sql';
  const r = verify({ manifest: missing });
  assert.equal(r.status, 'UNVERIFIED');
  assert.match(r.errors.join('\n'), /name does not match filename/);
  assert.throws(() => buildMigrationManifest({
    commitSha: COMMIT,
    migrations: [
      { version: V, name: 'a', path: `supabase/migrations/${V}_a.sql` },
      { version: V, name: 'b', path: `supabase/migrations/${V}_b.sql` },
    ],
    readFile: () => 'x',
  }), /Duplicate reviewed migration version/);
  const dupManifest = realManifest();
  dupManifest.migrations.push({ ...dupManifest.migrations[0] });
  const dup = verify({ manifest: dupManifest });
  assert.match(dup.errors.join('\n'), /Duplicate reviewed migration version in manifest/);
});

test('wrong project identity fails; missing identity evidence is UNVERIFIED', () => {
  const wrongEvidence = verify({ projectEvidence: projectEvidenceOk([richEntry(V)], PROD_REF) });
  assert.equal(wrongEvidence.status, 'UNVERIFIED');
  assert.match(wrongEvidence.errors.join('\n'), /not the expected target/);
  const noIdentity = verify({ projectEvidence: undefined });
  assert.equal(noIdentity.status, 'UNVERIFIED');
  assert.equal(noIdentity.projectIdentityVerified, false);
  assert.match(noIdentity.blockers.join('\n'), /identity evidence is missing/i);
});

test('missing remote history is UNVERIFIED; known pending vs unknown remote drift distinguished', () => {
  const noRemote = verify({ projectEvidence: { ...projectEvidenceOk(), history: undefined } });
  assert.equal(noRemote.status, 'UNVERIFIED');
  assert.match(noRemote.blockers.join('\n'), /Remote migration history is required/);
  const pending = verify({ projectEvidence: projectEvidenceOk([]) });
  assert.equal(pending.status, 'PENDING');
  assert.equal(pending.classification, 'PENDING');
  assert.deepEqual(pending.reviewedPending, [V]);
  assert.match(pending.findings.join('\n'), /not present on the target/);
  const drift = verify({ projectEvidence: projectEvidenceOk([richEntry(V, { name: 'add_storefront_prefix_resolver' }), richEntry('20990101000000')]) });
  assert.equal(drift.status, 'DRIFT');
  assert.deepEqual(drift.unexplainedRemoteDrift, ['20990101000000']);
  assert.match(drift.errors.join('\n'), /exists on target but is missing locally/);
});

test('version-only remote history (20261107230000) is NOT missing: UNVERIFIED metadata-incomplete without schema evidence', () => {
  const r = verify({ projectEvidence: projectEvidenceOk([{ version: V, name: null, statementsPresent: null }]) });
  assert.equal(r.status, 'UNVERIFIED');
  assert.equal(r.classification, 'UNVERIFIED');
  assert.deepEqual(r.recordedReviewed, [V], 'recorded version must not be reported as missing');
  assert.deepEqual(r.alreadyAppliedReviewed, [], 'recorded version alone must not be called applied');
  assert.deepEqual(r.reviewedPending, [], 'metadata-incomplete history is not pending');
  assert.deepEqual(r.reviewedMissingRemotely, [], 'metadata-incomplete history is not missing');
  assert.equal(r.historyMetadataIncomplete[0].provenance, 'version-only-record');
  assert.match(r.blockers.join('\n'), /Provenance unverified/);
});

test('reviewed schema evidence resolves metadata-incomplete history to APPLIED; contradictions drift', () => {
  const manifest = realManifest();
  const evidence = {
    schema: 'luckystore.migration-schema-evidence/v1',
    projectRef: TEST_REF,
    method: 'read-only psql catalog introspection',
    checkedAt: '2026-11-08T19:13:00Z',
    records: [{ version: V, name: 'add_storefront_prefix_resolver', reviewedFileSha256: manifest.migrations[0].sha256, projectRef: TEST_REF, definitionEquivalent: true, method: 'read-only psql catalog introspection', checkedAt: '2026-11-08T19:13:00Z' }],
  };
  const resolved = verify({ manifest, projectEvidence: projectEvidenceOk([{ version: V, name: null, statementsPresent: null }]), schemaEvidence: evidence });
  assert.equal(resolved.status, 'APPLIED');
  assert.equal(resolved.classification, 'APPLIED');
  assert.equal(resolved.appliedProvenance[V], 'schema-evidence-verified');
  assert.equal(resolved.historyMetadataIncomplete.length, 1, 'gap remains recorded, not erased');
  assert.match(resolved.warnings.join('\n'), /schema-verified/);
  const badSha = verify({ manifest, projectEvidence: projectEvidenceOk([{ version: V, name: null, statementsPresent: null }]), schemaEvidence: { ...evidence, records: [{ ...evidence.records[0], reviewedFileSha256: '0'.repeat(64) }] } });
  assert.equal(badSha.status, 'DRIFT');
  assert.match(badSha.errors.join('\n'), /does not match the reviewed SQL SHA-256/);
  const wrongRef = verify({ manifest, projectEvidence: projectEvidenceOk([{ version: V, name: null, statementsPresent: null }]), schemaEvidence: { ...evidence, projectRef: PROD_REF, records: [{ ...evidence.records[0], projectRef: PROD_REF }] } });
  assert.equal(wrongRef.status, 'DRIFT');
  assert.match(wrongRef.errors.join('\n'), /contradicts the target/);
});

test('matching version and name without SQL equivalence remains UNVERIFIED; wrong name is DRIFT', () => {
  const nameOnly = verify({ projectEvidence: projectEvidenceOk([{ version: V, name: 'add_storefront_prefix_resolver', statementsPresent: null }]) });
  assert.equal(nameOnly.status, 'UNVERIFIED');
  assert.equal(nameOnly.migrationStates[0].state, 'UNVERIFIED');
  const wrongName = verify({ projectEvidence: projectEvidenceOk([{ version: V, name: 'different_migration', statementsPresent: true }]) });
  assert.equal(wrongName.status, 'DRIFT');
  assert.equal(wrongName.migrationStates[0].state, 'DRIFT');
  assert.match(wrongName.errors.join('\n'), /history name/i);
});

test('malformed project history fails closed without echoing untrusted statement content', () => {
  const marker = 'sensitive-statement-marker';
  const malformed = verify({ projectEvidence: projectEvidenceOk([{ version: 'invalid', statements: [marker] }]) });
  assert.equal(malformed.status, 'UNVERIFIED');
  assert.equal(JSON.stringify(malformed).includes(marker), false);
});

test('recorded 20261107230000 schema-verification artifact binds the real reviewed file to the observed test-project state', () => {
  const artifact = JSON.parse(fs.readFileSync(new URL('../../system-docs/migrations/20261107230000_schema_verification.json', import.meta.url), 'utf8'));
  assert.equal(artifact.classification, 'schema-verified, history-metadata-incomplete');
  const manifest = realManifest();
  assert.equal(manifest.migrations[0].sha256, artifact.reviewedFile.sha256, 'artifact must pin the exact reviewed file SHA-256');
  assert.equal(artifact.records[0].reviewedFileSha256, manifest.migrations[0].sha256);
  const r = verify({
    manifest,
    projectEvidence: projectEvidenceOk([artifact.remoteHistoryRow ? { version: artifact.remoteHistoryRow.version, name: null, statementsPresent: null } : null].filter(Boolean)),
    schemaEvidence: artifact,
  });
  assert.equal(r.status, 'APPLIED');
  assert.equal(r.classification, 'APPLIED');
  assert.equal(r.historyMetadataIncomplete[0].version, '20261107230000');
});
