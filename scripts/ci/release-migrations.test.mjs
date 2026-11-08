import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import fs from 'node:fs';
import {
  buildMigrationManifest,
  createGitCommitFileReader,
  createGitCommitMigrationVersionReader,
  extractReviewedPlpgsqlFunctionBody,
  hashPlpgsqlFunctionBody,
  normalizePlpgsqlFunctionBody,
  PLPGSQL_BODY_HASH_ALGORITHM,
  schemaEvidenceFromArgs,
  verifyReleaseMigrationHistory,
  verifyLiveProjectMigrationHistory,
  validateManifestAgainstFiles,
  validateRemoteMigrationState,
  validateRpcContracts,
  verifyArtifactProvenance,
  evaluateReleaseGate,
  evaluateSmokeHealth,
} from './release-migrations.mjs';

const migrationSql = (name) => `-- ${name}\nBEGIN; SELECT 1; COMMIT;\n`;
const sha256 = (content) => createHash('sha256').update(content).digest('hex');
const RESOLVER_CONTRACT = {
  schema: 'public',
  name: 'resolve_storefront_item_prefix_v1',
  argTypes: ['uuid', 'text'],
  resultType: 'TABLE(item_id uuid)',
  language: 'plpgsql',
  volatility: 'stable',
  securityDefiner: true,
  owner: 'postgres',
  searchPath: '',
  grants: ['anon EXECUTE', 'authenticated EXECUTE', 'service_role EXECUTE'],
};
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
  requiredRpcContracts: [RESOLVER_CONTRACT],
  ...overrides,
});
const rpcContractsOk = () => ([{
  ...RESOLVER_CONTRACT,
  definition: 'CREATE FUNCTION ...',
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

test('validateManifestAgainstFiles requires caller commit binding and rejects changed commit or SQL', () => {
  const files = new Map([
    ['supabase/migrations/20261107230000_add_storefront_prefix_resolver.sql', migrationSql('changed')],
  ]);
  const manifest = manifestFixture();
  const missingCommit = validateManifestAgainstFiles(manifest, { readFile: () => migrationSql('prefix') });
  assert.equal(missingCommit.ok, false);
  assert.match(missingCommit.errors.join('\n'), /reviewed commit SHA.*missing/i);
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
    now: Date.parse('2026-11-08T20:05:00Z'),
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /Target project ref is unverified/);
  assert.match(result.errors.join('\n'), /20990101000000.*missing locally/);
  const missingRemote = validateRemoteMigrationState({
    targetRef: 'grxxenvdhfwzafzyykgo', expectedRef: 'grxxenvdhfwzafzyykgo', manifest,
    localVersions: ['20261107230000'], projectEvidence: projectEvidenceOk([]),
    now: Date.parse('2026-11-08T20:05:00Z'),
  });
  assert.equal(missingRemote.ok, false);
  assert.match(missingRemote.errors.join('\n'), /not present on the target/);
  const missingHistory = validateRemoteMigrationState({
    targetRef: 'grxxenvdhfwzafzyykgo', expectedRef: 'grxxenvdhfwzafzyykgo', manifest,
    localVersions: null, projectEvidence: projectEvidenceOk(['20261107230000']),
    now: Date.parse('2026-11-08T20:05:00Z'),
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
  const wrongSearchPath = validateRpcContracts({
    manifest,
    rpcContracts: [{ ...rpcContractsOk()[0], searchPath: 'public' }],
    rpcEvidence: true,
  });
  assert.equal(wrongSearchPath.ok, false);
  assert.match(wrongSearchPath.errors.join('\n'), /searchPath mismatch/);
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

test('check and verify-history read the same optional schema-evidence input', () => {
  const sentinel = { schema: 'sentinel' };
  const readJsonFile = (file) => {
    assert.equal(file, 'schema-evidence.json');
    return sentinel;
  };
  assert.equal(schemaEvidenceFromArgs(['check', '--schema-evidence', 'schema-evidence.json'], readJsonFile), sentinel);
  assert.equal(schemaEvidenceFromArgs(['verify-history', '--schema-evidence', 'schema-evidence.json'], readJsonFile), sentinel);
  assert.equal(schemaEvidenceFromArgs(['check'], readJsonFile), undefined);
});


// ─── E6-R Phase 2: reviewed manifest + read-only history verification ────────

const V = '20261107230000';
const COMMIT = 'e6c1b1bdd35d837ee157323ffb85d61c377edf02';
const MIGRATION_PATH = `supabase/migrations/${V}_add_storefront_prefix_resolver.sql`;
const TEST_REF = 'grxxenvdhfwzafzyykgo';
const PROD_REF = 'hvmyxyccfnkrbxqbhlnm';
const TEST_PROJECT_RECONCILIATION = JSON.parse(fs.readFileSync(
  new URL('../../system-docs/migrations/test_project_migration_reconciliation.json', import.meta.url),
  'utf8',
));
const ACTUAL_TEST_REMOTE_ONLY = TEST_PROJECT_RECONCILIATION.remoteOnly.map(({ version, name }) => [version, name]);
const ACTUAL_TEST_LOCAL_ONLY = TEST_PROJECT_RECONCILIATION.localOnly;

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
  migrations: [{ version: V, name: 'add_storefront_prefix_resolver', path: MIGRATION_PATH }],
  requiredRpcContracts: [RESOLVER_CONTRACT],
});

const verify = (overrides = {}) => verifyReleaseMigrationHistory({
  manifest: realManifest(),
  commitSha: COMMIT,
  expectedRef: TEST_REF,
  localVersions: [V],
  projectEvidence: projectEvidenceOk(),
  authorizedTestOnlyLedgerPath: null,
  now: Date.parse('2026-11-08T20:05:00Z'),
  ...overrides,
});

const schemaEvidenceOk = (manifest = realManifest(), projectRef = TEST_REF, checkedAt = '2026-11-08T19:13:00Z') => ({
  schema: 'luckystore.migration-schema-evidence/v2',
  projectRef,
  method: 'read-only catalog introspection',
  checkedAt,
  records: [{
    version: V,
    reviewedFileSha256: manifest.migrations[0].sha256,
    projectRef,
    function: RESOLVER_CONTRACT,
    bodyHash: {
      algorithm: PLPGSQL_BODY_HASH_ALGORITHM,
      source: 'pg_proc.prosrc',
      sha256: 'c409155d8f78931d904b08c040730565e3ad01852319710ff0bd9268e407a791',
    },
    method: 'read-only catalog introspection',
    checkedAt,
  }],
});

test('PL/pgSQL body normalization is deterministic and preserves internal text', () => {
  const golden = '\r\n\tabc \r\n';
  assert.equal(normalizePlpgsqlFunctionBody(golden), 'abc');
  assert.equal(hashPlpgsqlFunctionBody(golden), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(hashPlpgsqlFunctionBody('\nabc\n'), hashPlpgsqlFunctionBody('\r\nabc\r\n'));
  assert.equal(hashPlpgsqlFunctionBody('\rabc\r'), hashPlpgsqlFunctionBody('\nabc\n'));
  assert.notEqual(hashPlpgsqlFunctionBody('a  b'), hashPlpgsqlFunctionBody('a b'));
  assert.equal(normalizePlpgsqlFunctionBody('\u00a0abc\u00a0'), '\u00a0abc\u00a0');
  assert.throws(() => normalizePlpgsqlFunctionBody('\r\n\t '), /empty after normalization/i);
  assert.throws(() => normalizePlpgsqlFunctionBody(null), /must be a string/i);
});

test('reviewed resolver body extracts exactly once and hashes to the production normalized digest', () => {
  const sql = fs.readFileSync(new URL(`../../${MIGRATION_PATH}`, import.meta.url), 'utf8');
  const body = extractReviewedPlpgsqlFunctionBody(sql, RESOLVER_CONTRACT);

  assert.match(body, /^\s*DECLARE\b/);
  assert.match(body, /END;\s*$/);
  assert.equal(hashPlpgsqlFunctionBody(body), 'c409155d8f78931d904b08c040730565e3ad01852319710ff0bd9268e407a791');
  assert.throws(
    () => extractReviewedPlpgsqlFunctionBody(`${sql}\n${sql}`, RESOLVER_CONTRACT),
    /exactly one matching function/i,
  );
  assert.throws(
    () => extractReviewedPlpgsqlFunctionBody(sql, { ...RESOLVER_CONTRACT, schema: 'private' }),
    /exactly one matching function/i,
  );
});

test('authorized test-only ledger exactly matches the recorded 23 remote-only migrations', () => {
  const ledger = JSON.parse(fs.readFileSync(new URL('./authorized-test-only-migrations.json', import.meta.url), 'utf8'));
  const actual = ledger.authorized
    .map(({ version, name }) => [version, name])
    .sort(([a], [b]) => a.localeCompare(b));
  const expected = [...ACTUAL_TEST_REMOTE_ONLY].sort(([a], [b]) => a.localeCompare(b));

  assert.equal(ledger.observedRemoteOnlyCount, expected.length);
  assert.deepEqual(actual, expected);
  const classificationCounts = ledger.authorized.reduce((counts, { classification }) => {
    counts[classification] = (counts[classification] ?? 0) + 1;
    return counts;
  }, {});
  assert.deepEqual(classificationCounts, { authorized_duplicate: 10, ledger_snapshot_only: 5, security_test_only: 8 });
  for (const entry of ledger.authorized) {
    assert.match(entry.reason, /\S/);
    assert.match(entry.evidence, /\S/);
    assert.match(entry.approvalSource, /\S/);
    assert.match(entry.approvalMethod, /\S/);
  }
});

test('verifier reconciles authorized ledger entries by exact version and name', () => {
  const ledger = JSON.parse(fs.readFileSync(new URL('./authorized-test-only-migrations.json', import.meta.url), 'utf8'));
  const remoteRows = [
    richEntry(V, { name: 'add_storefront_prefix_resolver' }),
    ...ACTUAL_TEST_REMOTE_ONLY.map(([version, name]) => richEntry(version, { name })),
  ];
  const reconciled = verify({
    schemaEvidence: schemaEvidenceOk(),
    projectEvidence: projectEvidenceOk(remoteRows),
    authorizedTestOnlyLedgerPath: new URL('./authorized-test-only-migrations.json', import.meta.url),
  });
  assert.equal(reconciled.status, 'APPLIED');
  assert.deepEqual(reconciled.authorizedTestOnly, ACTUAL_TEST_REMOTE_ONLY.map(([version]) => version).sort());
  assert.deepEqual(reconciled.unexplainedRemoteDrift, []);
  assert.deepEqual(reconciled.unusedAuthorizedTestOnly, []);

  const wrongNameRows = remoteRows.map((row) => row.version === '20261028193249'
    ? { ...row, name: 'unexpected_preview_migration' }
    : row);
  const wrongName = verify({
    schemaEvidence: schemaEvidenceOk(),
    projectEvidence: projectEvidenceOk(wrongNameRows),
    authorizedTestOnlyLedgerPath: new URL('./authorized-test-only-migrations.json', import.meta.url),
  });
  assert.equal(wrongName.status, 'DRIFT');
  assert.deepEqual(wrongName.unexplainedRemoteDrift, ['20261028193249']);
  assert.match(wrongName.errors.join('\n'), /authorized ledger name/i);

  const dormant = verify({
    schemaEvidence: schemaEvidenceOk(),
    projectEvidence: projectEvidenceOk(remoteRows),
    authorizedTestOnlyLedger: {
      ...ledger,
      authorized: [...ledger.authorized, {
        ...ledger.authorized[0],
        version: '20990101000000',
        name: 'dormant_authorization',
      }],
    },
  });
  assert.equal(dormant.status, 'DRIFT');
  assert.deepEqual(dormant.unusedAuthorizedTestOnly, ['20990101000000']);

  const productionLedger = {
    ...ledger,
    targetProjectRef: PROD_REF,
    authorized: [{ ...ledger.authorized[0], version: '20990101000000', name: 'production_extra' }],
  };
  const productionAttempt = verify({
    expectedRef: PROD_REF,
    projectEvidence: projectEvidenceOk([
      richEntry(V, { name: 'add_storefront_prefix_resolver' }),
      richEntry('20990101000000', { name: 'production_extra' }),
    ], PROD_REF),
    schemaEvidence: schemaEvidenceOk(realManifest(), PROD_REF),
    authorizedTestOnlyLedger: productionLedger,
  });
  assert.equal(productionAttempt.status, 'DRIFT');
  assert.deepEqual(productionAttempt.authorizedTestOnly, []);
  assert.deepEqual(productionAttempt.unexplainedRemoteDrift, ['20990101000000']);
});

test('recorded test-project differences remain separate: authorized remote-only, pending local-only, equivalent resolver, incomplete history', () => {
  const remoteRows = [
    { version: V, name: null, statementsPresent: null },
    ...ACTUAL_TEST_REMOTE_ONLY.map(([version, name]) => richEntry(version, { name })),
  ];
  const result = verify({
    localVersions: [V, ...ACTUAL_TEST_LOCAL_ONLY],
    projectEvidence: projectEvidenceOk(remoteRows),
    schemaEvidence: schemaEvidenceOk(),
    authorizedTestOnlyLedgerPath: new URL('./authorized-test-only-migrations.json', import.meta.url),
  });

  assert.equal(result.status, 'PENDING');
  assert.equal(result.versionParityStatus, 'PENDING');
  assert.equal(result.schemaEquivalenceStatus, 'EQUIVALENT');
  assert.equal(result.historyMetadataStatus, 'INCOMPLETE');
  assert.deepEqual(result.authorizedTestOnly, ACTUAL_TEST_REMOTE_ONLY.map(([version]) => version).sort());
  assert.deepEqual(result.unexplainedRemoteDrift, []);
  assert.deepEqual(result.unusedAuthorizedTestOnly, []);
  assert.deepEqual(result.unreleasedLocal, ACTUAL_TEST_LOCAL_ONLY);
  assert.equal(result.migrationStates[0].state, 'APPLIED');
});

test('verified reviewed SQL and identity classify the migration as APPLIED', () => {
  const manifest = realManifest();
  const schemaEvidence = schemaEvidenceOk(manifest);
  const r = verify({ manifest, schemaEvidence });
  assert.equal(r.status, 'APPLIED');
  assert.equal(r.classification, 'APPLIED');
  assert.deepEqual(r.migrationStates[0], {
    version: V,
    filename: `${V}_add_storefront_prefix_resolver.sql`,
    state: 'APPLIED',
    versionParity: 'RECORDED',
    schemaEquivalence: 'EQUIVALENT',
    historyMetadata: 'statements-present-unhashed',
    provenance: 'normalized-function-body-hash-verified',
  });
  assert.equal(r.versionParityStatus, 'APPLIED');
  assert.equal(r.schemaEquivalenceStatus, 'EQUIVALENT');
  assert.equal(r.historyMetadataStatus, 'COMPLETE');
  assert.deepEqual(r.alreadyAppliedReviewed, [V]);
  assert.deepEqual(r.reviewedPending, []);
  assert.deepEqual(r.unexplainedRemoteDrift, []);
  assert.deepEqual(r.historyMetadataIncomplete, []);
});

test('explicit no-migration release is valid; unauthorized empty manifest throws', () => {
  const manifest = buildMigrationManifest({ commitSha: COMMIT, migrations: [], noMigrationChange: true, reason: 'Docs-only release: no database changes reviewed.' });
  assert.equal(manifest.noMigrationChange, true);
  const r = verify({ manifest, commitSha: manifest.commitSha, localVersions: ['20261106000000'], projectEvidence: projectEvidenceOk([richEntry('20261106000000')]) });
  assert.equal(r.status, 'APPLIED');
  const unaccountedLocal = verify({
    manifest,
    commitSha: manifest.commitSha,
    localVersions: ['20261106000000', '20261107000000'],
    projectEvidence: projectEvidenceOk([richEntry('20261106000000')]),
  });
  assert.equal(unaccountedLocal.status, 'DRIFT');
  assert.deepEqual(unaccountedLocal.unexplainedLocalDrift, ['20261107000000']);
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
  const missingLocal = verify({ localVersions: [] });
  assert.equal(missingLocal.status, 'DRIFT');
  assert.equal(missingLocal.migrationStates[0].state, 'DRIFT');
  assert.equal(missingLocal.migrationStates[0].provenance, 'missing-from-commit-bound-local-inventory');
  const unreviewedLocal = verify({
    localVersions: [V, '20261108000000'],
    schemaEvidence: schemaEvidenceOk(),
  });
  assert.equal(unreviewedLocal.status, 'PENDING');
  assert.equal(unreviewedLocal.versionParityStatus, 'PENDING');
  assert.deepEqual(unreviewedLocal.unreleasedLocal, ['20261108000000']);
  assert.match(unreviewedLocal.findings.join('\n'), /not in the reviewed manifest/i);
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
  assert.match(r.blockers.join('\n'), /Schema unverified/);
});

test('reviewed schema evidence resolves metadata-incomplete history to APPLIED; contradictions drift', () => {
  const manifest = realManifest();
  const evidence = schemaEvidenceOk(manifest);
  const resolved = verify({ manifest, projectEvidence: projectEvidenceOk([{ version: V, name: null, statementsPresent: null }]), schemaEvidence: evidence });
  assert.equal(resolved.status, 'APPLIED');
  assert.equal(resolved.classification, 'APPLIED');
  assert.equal(resolved.appliedProvenance[V], 'normalized-function-body-hash-verified');
  assert.equal(resolved.migrationStates[0].schemaEquivalence, 'EQUIVALENT');
  assert.equal(resolved.historyMetadataIncomplete.length, 1, 'gap remains recorded, not erased');
  assert.match(resolved.warnings.join('\n'), /body-hash-verified/);
  const badSha = verify({ manifest, projectEvidence: projectEvidenceOk([{ version: V, name: null, statementsPresent: null }]), schemaEvidence: { ...evidence, records: [{ ...evidence.records[0], reviewedFileSha256: '0'.repeat(64) }] } });
  assert.equal(badSha.status, 'UNVERIFIED');
  assert.match(badSha.blockers.join('\n'), /does not match the reviewed SQL SHA-256/);
  const wrongRef = verify({ manifest, projectEvidence: projectEvidenceOk([{ version: V, name: null, statementsPresent: null }]), schemaEvidence: { ...evidence, projectRef: PROD_REF, records: [{ ...evidence.records[0], projectRef: PROD_REF }] } });
  assert.equal(wrongRef.status, 'UNVERIFIED');
  assert.match(wrongRef.blockers.join('\n'), /does not match the target|contradicts the target/);
  const invalidHash = verify({ manifest, projectEvidence: projectEvidenceOk([{ version: V, name: null, statementsPresent: null }]), schemaEvidence: { ...evidence, records: [{ ...evidence.records[0], reviewedFileSha256: {} }] } });
  assert.equal(invalidHash.status, 'UNVERIFIED');
  assert.match(invalidHash.blockers.join('\n'), /valid reviewedFileSha256/i);
  const bodyMismatch = verify({
    manifest,
    projectEvidence: projectEvidenceOk([{ version: V, name: null, statementsPresent: null }]),
    schemaEvidence: {
      ...evidence,
      records: [{ ...evidence.records[0], bodyHash: { ...evidence.records[0].bodyHash, sha256: '0'.repeat(64) } }],
    },
  });
  assert.equal(bodyMismatch.status, 'DRIFT');
  assert.equal(bodyMismatch.migrationStates[0].schemaEquivalence, 'DIFFERENT');
  assert.match(bodyMismatch.errors.join('\n'), /installed function body/i);
  const publicExecute = verify({
    manifest,
    projectEvidence: projectEvidenceOk([{ version: V, name: null, statementsPresent: null }]),
    schemaEvidence: {
      ...evidence,
      records: [{
        ...evidence.records[0],
        function: { ...evidence.records[0].function, grants: [...evidence.records[0].function.grants, 'PUBLIC EXECUTE'] },
      }],
    },
  });
  assert.equal(publicExecute.status, 'DRIFT');
  assert.equal(publicExecute.migrationStates[0].schemaEquivalence, 'DIFFERENT');
  assert.match(publicExecute.errors.join('\n'), /reviewed SQL contract/i);
});

test('legacy, duplicate, stale, or unsupported schema evidence remains UNVERIFIED', () => {
  const manifest = realManifest();
  const valid = schemaEvidenceOk(manifest);
  const history = projectEvidenceOk([{ version: V, name: null, statementsPresent: null }]);
  const legacy = {
    schema: 'luckystore.migration-schema-evidence/v1',
    projectRef: TEST_REF,
    method: 'legacy boolean evidence',
    checkedAt: valid.checkedAt,
    records: [{ version: V, reviewedFileSha256: manifest.migrations[0].sha256, projectRef: TEST_REF, definitionEquivalent: true, method: 'legacy boolean evidence', checkedAt: valid.checkedAt }],
  };
  const legacyResult = verify({ manifest, projectEvidence: history, schemaEvidence: legacy });
  assert.equal(legacyResult.status, 'UNVERIFIED');
  assert.match(legacyResult.blockers.join('\n'), /unsupported|v2/i);

  const duplicate = verify({
    manifest,
    projectEvidence: history,
    schemaEvidence: { ...valid, records: [valid.records[0], { ...valid.records[0] }] },
  });
  assert.equal(duplicate.status, 'UNVERIFIED');
  assert.match(duplicate.blockers.join('\n'), /duplicate schema evidence/i);

  const staleRecord = verify({
    manifest,
    projectEvidence: history,
    schemaEvidence: { ...valid, records: [{ ...valid.records[0], checkedAt: '2001-01-01T00:00:00Z' }] },
  });
  assert.equal(staleRecord.status, 'UNVERIFIED');
  assert.match(staleRecord.blockers.join('\n'), /record.*stale/i);

  const unsupported = verify({
    manifest,
    projectEvidence: history,
    schemaEvidence: {
      ...valid,
      records: [{ ...valid.records[0], bodyHash: { ...valid.records[0].bodyHash, algorithm: 'unknown/v9' } }],
    },
  });
  assert.equal(unsupported.status, 'UNVERIFIED');
  assert.match(unsupported.blockers.join('\n'), /unsupported.*body-hash algorithm/i);
});

test('matching version and name without SQL equivalence remains UNVERIFIED; wrong name is DRIFT', () => {
  const nameOnly = verify({ projectEvidence: projectEvidenceOk([{ version: V, name: 'add_storefront_prefix_resolver', statementsPresent: null }]) });
  assert.equal(nameOnly.status, 'UNVERIFIED');
  assert.equal(nameOnly.migrationStates[0].state, 'UNVERIFIED');
  const wrongName = verify({ projectEvidence: projectEvidenceOk([{ version: V, name: 'sensitive-remote-name', statementsPresent: true }]) });
  assert.equal(wrongName.status, 'DRIFT');
  assert.equal(wrongName.migrationStates[0].state, 'DRIFT');
  assert.match(wrongName.errors.join('\n'), /history name/i);
  assert.equal(JSON.stringify(wrongName).includes('sensitive-remote-name'), false);
});

test('malformed project history fails closed without echoing untrusted statement content', () => {
  const marker = 'sensitive-statement-marker';
  const malformed = verify({ projectEvidence: projectEvidenceOk([{ version: 'invalid', statements: [marker] }]) });
  assert.equal(malformed.status, 'UNVERIFIED');
  assert.equal(JSON.stringify(malformed).includes(marker), false);
  const malformedManifest = {
    ...realManifest(),
    migrations: [{ secret: marker }],
  };
  const manifestResult = verify({ manifest: malformedManifest });
  assert.equal(manifestResult.status, 'UNVERIFIED');
  assert.equal(JSON.stringify(manifestResult).includes(marker), false);
});

test('stale project or schema evidence remains UNVERIFIED', () => {
  const manifest = realManifest();
  const staleProject = projectEvidenceOk();
  staleProject.checkedAt = '2001-01-01T00:00:00Z';
  staleProject.identity.checkedAt = '2001-01-01T00:00:00Z';
  staleProject.history.checkedAt = '2001-01-01T00:00:00Z';
  const staleHistory = verify({ manifest, projectEvidence: staleProject, schemaEvidence: schemaEvidenceOk(manifest) });
  assert.equal(staleHistory.status, 'UNVERIFIED');
  assert.match(staleHistory.blockers.join('\n'), /stale/i);
  const staleSchema = schemaEvidenceOk(manifest);
  staleSchema.checkedAt = '2001-01-01T00:00:00Z';
  staleSchema.records[0].checkedAt = '2001-01-01T00:00:00Z';
  const staleDefinition = verify({ manifest, schemaEvidence: staleSchema });
  assert.equal(staleDefinition.status, 'UNVERIFIED');
  assert.equal(staleDefinition.migrationStates[0].state, 'UNVERIFIED');
  assert.match(staleDefinition.blockers.join('\n'), /schema evidence.*stale/i);
});

test('verifyLiveProjectMigrationHistory always collects the target before verification', async () => {
  const manifest = realManifest();
  const calls = [];
  const functionCalls = [];
  const reviewedSql = fs.readFileSync(new URL(`../../${MIGRATION_PATH}`, import.meta.url), 'utf8');
  const result = await verifyLiveProjectMigrationHistory({
    manifest,
    commitSha: COMMIT,
    expectedRef: TEST_REF,
    localVersions: [V],
    accessToken: 'test-token',
    schemaEvidence: schemaEvidenceOk(manifest),
    authorizedTestOnlyLedgerPath: null,
    collectEvidence: async (options) => {
      calls.push(options);
      return projectEvidenceOk();
    },
    collectFunctionEvidence: async (options) => {
      functionCalls.push(options);
      return {
        source: 'supabase-management-api-read-only',
        projectRef: TEST_REF,
        method: 'POST /v1/projects/{ref}/database/query/read-only',
        checkedAt: '2026-11-08T20:00:00Z',
        function: {
          ...RESOLVER_CONTRACT,
          identityArgs: 'p_store_id uuid, p_prefix text',
          body: extractReviewedPlpgsqlFunctionBody(reviewedSql, RESOLVER_CONTRACT),
        },
      };
    },
    readLocalVersions: () => [V],
    now: Date.parse('2026-11-08T20:05:00Z'),
  });
  assert.equal(result.status, 'APPLIED');
  assert.deepEqual(calls, [{ projectRef: TEST_REF, accessToken: 'test-token' }]);
  assert.deepEqual(functionCalls, [{ projectRef: TEST_REF, accessToken: 'test-token', functionContract: RESOLVER_CONTRACT }]);
});

test('createGitCommitFileReader resolves the reviewed commit and reads that object, not the worktree', () => {
  const calls = [];
  const execFile = (_command, args) => {
    calls.push(args);
    if (args[0] === 'rev-parse') return `${COMMIT}\n`;
    if (args[0] === 'show') return migrationSql('prefix');
    throw new Error('unexpected git command');
  };
  const readFile = createGitCommitFileReader(COMMIT, { execFile });
  assert.equal(readFile(MIGRATION_PATH, 'utf8'), migrationSql('prefix'));
  assert.deepEqual(calls, [
    ['rev-parse', '--verify', `${COMMIT}^{commit}`],
    ['show', `${COMMIT}:${MIGRATION_PATH}`],
  ]);
});

test('createGitCommitMigrationVersionReader derives the complete local inventory from the reviewed commit', () => {
  const calls = [];
  const execFile = (_command, args) => {
    calls.push(args);
    if (args[0] === 'rev-parse') return `${COMMIT}\n`;
    if (args[0] === 'ls-tree') return [
      'supabase/migrations/20261106000000_prior.sql',
      'supabase/migrations/20261107230000_add_storefront_prefix_resolver.sql',
      'supabase/migrations/not-a-migration.txt',
      '',
    ].join('\n');
    throw new Error('unexpected git command');
  };
  const readVersions = createGitCommitMigrationVersionReader(COMMIT, { execFile });

  assert.deepEqual(readVersions(), ['20261106000000', V]);
  assert.deepEqual(calls, [
    ['rev-parse', '--verify', `${COMMIT}^{commit}`],
    ['ls-tree', '-r', '--name-only', COMMIT, '--', 'supabase/migrations'],
  ]);
});

test('recorded 20261107230000 schema-verification artifact binds the real reviewed file to the observed test-project state', () => {
  const artifact = JSON.parse(fs.readFileSync(new URL('../../system-docs/migrations/20261107230000_schema_verification.json', import.meta.url), 'utf8'));
  assert.equal(artifact.classification, 'function-body-and-contract-verified, history-metadata-incomplete');
  const manifest = realManifest();
  assert.equal(manifest.migrations[0].sha256, artifact.reviewedFile.sha256, 'artifact must pin the exact reviewed file SHA-256');
  assert.equal(artifact.records[0].reviewedFileSha256, manifest.migrations[0].sha256);
  assert.equal(artifact.installedFunction.installedBodyObservedSha256, '5df6b76d79d622fdae38faeab95253836ea090a7569c15c415a13e347096f8b2');
  assert.equal(artifact.records[0].bodyHash.algorithm, PLPGSQL_BODY_HASH_ALGORITHM);
  const reviewedBody = extractReviewedPlpgsqlFunctionBody(
    fs.readFileSync(new URL(`../../${MIGRATION_PATH}`, import.meta.url), 'utf8'),
    artifact.records[0].function,
  );
  const leadingBoundaryOnly = reviewedBody
    .replace(/\r\n?/g, '\n')
    .replace(/^[\x09-\x0d\x20]+/g, '');
  assert.equal(reviewedBody.charCodeAt(0), 10, 'reviewed dollar-quoted body starts with LF');
  assert.equal(reviewedBody.charCodeAt(reviewedBody.length - 1), 10, 'reviewed dollar-quoted body ends with LF');
  assert.equal(sha256(leadingBoundaryOnly), artifact.installedFunction.installedBodyObservedSha256);
  assert.equal(hashPlpgsqlFunctionBody(reviewedBody), artifact.records[0].bodyHash.sha256);
  const r = verify({
    manifest,
    projectEvidence: projectEvidenceOk([artifact.remoteHistoryRow ? { version: artifact.remoteHistoryRow.version, name: null, statementsPresent: null } : null].filter(Boolean)),
    schemaEvidence: artifact,
  });
  assert.equal(r.status, 'APPLIED');
  assert.equal(r.classification, 'APPLIED');
  assert.equal(r.historyMetadataIncomplete[0].version, '20261107230000');
});

test('production artifact verifies only the resolver without claiming complete production version parity', () => {
  const artifact = JSON.parse(fs.readFileSync(new URL('../../system-docs/migrations/20261107230000_production_schema_verification.json', import.meta.url), 'utf8'));
  const checkedAt = artifact.checkedAt;
  const projectEvidence = projectEvidenceOk([{
    version: V,
    name: 'add_storefront_prefix_resolver',
    statementsPresent: true,
  }], PROD_REF);
  projectEvidence.checkedAt = checkedAt;
  projectEvidence.identity.checkedAt = checkedAt;
  projectEvidence.history.checkedAt = checkedAt;
  const result = verify({
    expectedRef: PROD_REF,
    projectEvidence,
    schemaEvidence: artifact,
    now: Date.parse('2026-11-08T21:50:00Z'),
  });

  assert.equal(result.status, 'UNVERIFIED');
  assert.equal(result.versionParityStatus, 'UNVERIFIED');
  assert.equal(result.schemaEquivalenceStatus, 'EQUIVALENT');
  assert.equal(result.historyMetadataStatus, 'COMPLETE');
  assert.deepEqual(result.reviewedVersions, [V]);
  assert.equal(result.migrationStates[0].versionParity, 'RECORDED');
  assert.equal(artifact.project.versionParityStatus, 'UNVERIFIED');
  assert.match(artifact.scope, /other 275.*not SQL-equivalence certifications/i);
});
