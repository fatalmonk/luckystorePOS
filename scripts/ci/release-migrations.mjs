#!/usr/bin/env node
/**
 * E6-R Phase 2: reviewed migration manifest + read-only history verification.
 *
 * Answers, from evidence only:
 * 1) Which exact SQL migrations were reviewed for this release?
 * 2) Which versions are installed in the verified target project?
 * 3) Which reviewed migrations remain pending?
 * 4) Is there unexplained migration-history drift?
 *
 * Missing or unverified evidence returns status UNVERIFIED (never PASS).
 * This tool never applies migrations, repairs history, or mutates databases.
 *
 * Pure helpers are exported for tests. CLI modes:
 *   manifest --commit <sha> --out <file> [--migrations <version:name:path,...>] [--no-migration-change --reason <text>] [--rpcs <file>]
 *   verify-history --manifest <file> --expected-commit <sha> --expected-ref <ref> --local-versions <file> --project-evidence <file> [--schema-evidence <file>] [--out <file>]
 *   check (compat) --manifest <file> --commit <sha> --expected-ref <ref> --local-versions <file> --project-evidence <file>
 *   verify-provenance --expected-sha <sha> --health-url <url>
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { PROJECT_HISTORY_EVIDENCE_SCHEMA } from './collect-release-evidence.mjs';

export const MANIFEST_SCHEMA = 'luckystore.release-migrations/v1';
export const HISTORY_SCHEMA = 'luckystore.release-migration-history/v1';

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function assertCommitSha(commitSha, label = 'commit SHA') {
  if (!commitSha || !/^[0-9a-f]{40}$/i.test(String(commitSha))) {
    throw new Error(`Invalid ${label}: ${commitSha ?? '(missing)'}`);
  }
  return String(commitSha).toLowerCase();
}

function parseMigrationFilename(file) {
  if (typeof file !== 'string' || !file.trim()) throw new Error(`Migration filename/path is required: ${file ?? '(missing)'}`);
  const base = path.basename(file);
  const match = /^(\d{14})_(.+)\.sql$/.exec(base);
  if (!match) throw new Error(`Invalid migration filename (expected <14-digit-version>_<name>.sql): ${file}`);
  return { version: match[1], name: match[2], filename: base, path: file };
}

function normalizeReviewedMigrations(migrations = [], readFile = fs.readFileSync) {
  const seen = new Set();
  return migrations.map((migration) => {
    const rawPath = migration.path ?? migration.file;
    if (!rawPath) throw new Error(`Migration entry requires path/file: ${JSON.stringify(migration)}`);
    const parsed = parseMigrationFilename(rawPath);
    const version = migration.version ? String(migration.version) : parsed.version;
    const name = migration.name ? String(migration.name) : parsed.name;
    if (!/^\d{14}$/.test(version)) throw new Error(`Invalid migration version: ${version}`);
    if (version !== parsed.version) {
      throw new Error(`Migration version does not match filename: ${version} vs ${parsed.version} (${rawPath})`);
    }
    if (name !== parsed.name) {
      throw new Error(`Migration name does not match filename: ${name} vs ${parsed.name} (${rawPath})`);
    }
    if (seen.has(version)) throw new Error(`Duplicate reviewed migration version: ${version}`);
    seen.add(version);
    const sql = readFile(rawPath, 'utf8');
    return { version, name, filename: parsed.filename, path: rawPath, sha256: sha256(sql) };
  });
}

export function buildMigrationManifest({
  commitSha,
  migrations,
  requiredRpcContracts = [],
  readFile = fs.readFileSync,
  noMigrationChange = false,
  reason,
}) {
  const normalizedCommit = assertCommitSha(commitSha, 'reviewed commit SHA');
  const hasMigrations = Array.isArray(migrations) && migrations.length > 0;
  if (noMigrationChange && hasMigrations) {
    throw new Error('Manifest cannot declare no migration change while listing reviewed migrations.');
  }
  if (!noMigrationChange && !hasMigrations) {
    throw new Error('Manifest must explicitly list reviewed migrations or set noMigrationChange with a reason.');
  }
  if (noMigrationChange && !String(reason || '').trim()) {
    throw new Error('noMigrationChange requires an explicit reason.');
  }
  const entries = hasMigrations ? normalizeReviewedMigrations(migrations, readFile) : [];
  return {
    schema: MANIFEST_SCHEMA,
    generatedAt: new Date().toISOString(),
    commitSha: normalizedCommit,
    noMigrationChange: Boolean(noMigrationChange),
    reason: noMigrationChange ? String(reason).trim() : null,
    migrations: entries,
    requiredRpcContracts,
  };
}

export function validateManifestAgainstFiles(manifest, { commitSha, readFile = fs.readFileSync } = {}) {
  const errors = [];
  if (!manifest || manifest.schema !== MANIFEST_SCHEMA) {
    errors.push(`Manifest schema is missing or unsupported: ${manifest?.schema ?? '(missing)'}`);
  }
  let expectedCommit = '';
  try { expectedCommit = assertCommitSha(commitSha ?? manifest?.commitSha, 'reviewed commit SHA'); }
  catch (e) { errors.push(e.message); expectedCommit = String(commitSha ?? manifest?.commitSha ?? '').toLowerCase(); }
  const manifestCommit = String(manifest?.commitSha ?? '').toLowerCase();
  if (expectedCommit && manifestCommit && manifestCommit !== expectedCommit) {
    errors.push(`Manifest commit SHA mismatch: expected ${expectedCommit}, got ${manifest?.commitSha ?? '(missing)'}`);
  }

  const noMigrationChange = manifest?.noMigrationChange === true;
  const migrations = Array.isArray(manifest?.migrations) ? manifest.migrations : [];
  if (noMigrationChange && migrations.length > 0) {
    errors.push('Manifest declares no migration change but includes reviewed migrations.');
  }
  if (!noMigrationChange && migrations.length === 0) {
    errors.push('Manifest must explicitly list reviewed migrations or declare noMigrationChange with a reason.');
  }
  if (noMigrationChange && !String(manifest?.reason || '').trim()) {
    errors.push('noMigrationChange manifest requires an explicit reason.');
  }

  const seen = new Set();
  for (const migration of migrations) {
    if (!migration || typeof migration !== 'object') {
      errors.push(`Invalid reviewed migration entry: ${JSON.stringify(migration)}`);
      continue;
    }
    const pathValue = migration.path;
    let parsed;
    try { parsed = parseMigrationFilename(pathValue); } catch (e) { errors.push(e.message); continue; }
    if (migration.filename !== parsed.filename) {
      errors.push(`Migration filename mismatch for ${pathValue}: expected ${parsed.filename}, got ${migration.filename ?? '(missing)'}.`);
    }
    if (!/^\d{14}$/.test(String(migration.version || ''))) {
      errors.push(`Migration version is missing or invalid: ${migration.version ?? '(missing)'}`);
      continue;
    }
    if (migration.version !== parsed.version) errors.push(`Migration version does not match filename for ${pathValue}.`);
    if (migration.name && migration.name !== parsed.name) errors.push(`Migration name does not match filename for ${pathValue}.`);
    if (seen.has(migration.version)) errors.push(`Duplicate reviewed migration version in manifest: ${migration.version}`);
    seen.add(migration.version);

    let sql;
    try { sql = readFile(pathValue, 'utf8'); }
    catch { errors.push(`Reviewed migration file is missing or unreadable: ${pathValue}`); continue; }
    const actual = sha256(sql);
    if (actual !== migration.sha256) {
      errors.push(`Migration SQL hash mismatch for ${migration.version} (${pathValue}).`);
    }
  }
  const normalizedCommit = expectedCommit && /^[0-9a-f]{40}$/i.test(expectedCommit) ? expectedCommit.toLowerCase() : null;
  return {
    ok: errors.length === 0,
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    errors,
    reviewedCommitSha: normalizedCommit,
    reviewedMigrations: migrations.map(({ version, name, filename, path: migrationPath, sha256: hash }) => ({ version, name, filename, path: migrationPath, sha256: hash })),
    noMigrationChange,
  };
}

function normalizeVersions(input, label) {
  if (input == null) throw new Error(`${label} migration history is required.`);
  if (!Array.isArray(input)) throw new Error(`${label} migration history must be a JSON array of versions or {version} objects.`);
  return [...new Set(input.map((v, index) => {
    if (typeof v === 'string' && /^\d{14}$/.test(v)) return v;
    if (v && typeof v === 'object' && typeof v.version === 'string' && /^\d{14}$/.test(v.version)) return v.version;
    throw new Error(`${label} migration history entry is invalid at index ${index}.`);
  }))].sort();
}

function normalizeHistoryEntries(input, label) {
  if (input == null) throw new Error(`${label} migration history is required.`);
  if (!Array.isArray(input)) throw new Error(`${label} migration history must be a JSON array of versions or history entry objects.`);
  const byVersion = new Map();
  for (const [index, entry] of input.entries()) {
    let version = null;
    let name = null;
    let statementsPresent = null;
    let sqlSha256 = null;
    if (typeof entry === 'string') {
      version = entry;
    } else if (entry && typeof entry === 'object' && typeof entry.version === 'string') {
      version = entry.version;
      name = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : null;
      if (entry.sqlSha256 != null) {
        if (typeof entry.sqlSha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(entry.sqlSha256)) {
          throw new Error(`${label} migration history entry has an invalid sqlSha256: ${JSON.stringify(entry.version)}`);
        }
        sqlSha256 = entry.sqlSha256.toLowerCase();
      }
      if (typeof entry.statementsPresent === 'boolean') statementsPresent = entry.statementsPresent;
      else if ('statements' in entry) {
        if (entry.statements == null) statementsPresent = false;
        else if (Array.isArray(entry.statements)) statementsPresent = entry.statements.length > 0;
        else statementsPresent = true;
      }
    } else {
      throw new Error(`${label} migration history entry is invalid at index ${index}.`);
    }
    if (!/^\d{14}$/.test(version)) throw new Error(`${label} migration history entry version is invalid at index ${index}.`);
    if (!byVersion.has(version)) byVersion.set(version, { version, name, statementsPresent, sqlSha256 });
    else {
      const prev = byVersion.get(version);
      if (prev.name != null && name != null && prev.name !== name) {
        throw new Error(`${label} migration history has conflicting names for version ${version}.`);
      }
      if (prev.statementsPresent != null && statementsPresent != null && prev.statementsPresent !== statementsPresent) {
        throw new Error(`${label} migration history has conflicting statement metadata for version ${version}.`);
      }
      if (prev.name == null && name != null) prev.name = name;
      if (prev.statementsPresent == null && statementsPresent != null) prev.statementsPresent = statementsPresent;
      if (prev.sqlSha256 == null && sqlSha256 != null) prev.sqlSha256 = sqlSha256;
      if (prev.sqlSha256 != null && sqlSha256 != null && prev.sqlSha256 !== sqlSha256) {
        throw new Error(`${label} migration history has conflicting SQL hashes for version ${version}.`);
      }
    }
  }
  return [...byVersion.values()].sort((a, b) => (a.version < b.version ? -1 : 1));
}

function classifyRemoteProvenance(entry) {
  if (!entry) return 'absent';
  if (entry.sqlSha256) return 'sql-hash-recorded';
  if (entry.name == null) return 'version-only-record';
  if (entry.statementsPresent === false) return 'name-recorded-statements-missing';
  if (entry.statementsPresent === true) return 'statements-present-unhashed';
  return 'name-only-record';
}

function validIsoTimestamp(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function normalizeSchemaEvidence(schemaEvidence, expectedRef, errors, blockers) {
  if (schemaEvidence == null) return { records: [], supplied: false };
  if (!schemaEvidence || typeof schemaEvidence !== 'object' || Array.isArray(schemaEvidence)) {
    blockers.push('Schema evidence must be a luckystore.migration-schema-evidence/v1 object.');
    return { records: [], supplied: true };
  }
  if (schemaEvidence.schema !== 'luckystore.migration-schema-evidence/v1') {
    blockers.push(`Schema evidence schema is missing or unsupported: ${schemaEvidence.schema ?? '(missing)'}.`);
  }
  if (!schemaEvidence.projectRef || !schemaEvidence.method || !validIsoTimestamp(schemaEvidence.checkedAt)) {
    blockers.push('Schema evidence is incomplete: projectRef, method, and a parseable checkedAt are required.');
  }
  if (expectedRef && schemaEvidence.projectRef && schemaEvidence.projectRef !== expectedRef) {
    errors.push(`Schema evidence contradicts the target: references project ${schemaEvidence.projectRef}, expected ${expectedRef}.`);
  }
  if (!Array.isArray(schemaEvidence.records)) {
    blockers.push('Schema evidence records must be an array.');
    return { records: [], supplied: true };
  }
  return { records: schemaEvidence.records, supplied: true };
}

function resolveProjectEvidence({ projectEvidence, expectedRef, targetRef, errors, blockers, evidence }) {
  let identity = null;
  let remoteInput = null;
  let bundleValid = false;
  const initialErrorCount = errors.length;
  const initialBlockerCount = blockers.length;

  if (projectEvidence != null) {
    if (!projectEvidence || typeof projectEvidence !== 'object' || Array.isArray(projectEvidence)) {
      blockers.push('Independent project evidence must be an object.');
    } else {
      if (projectEvidence.schema !== PROJECT_HISTORY_EVIDENCE_SCHEMA) {
        blockers.push(`Project evidence schema is missing or unsupported: ${projectEvidence.schema ?? '(missing)'}.`);
      }
      if (projectEvidence.source !== 'supabase-management-api' || !validIsoTimestamp(projectEvidence.checkedAt)) {
        blockers.push('Project evidence requires source=supabase-management-api and a parseable checkedAt.');
      }
      identity = projectEvidence.identity;
      remoteInput = projectEvidence.history?.rows;
      if (!projectEvidence.history) blockers.push('Remote migration history is required in independent project evidence.');
      const refs = [projectEvidence.requestedProjectRef, identity?.projectRef, projectEvidence.history?.projectRef].filter(Boolean);
      if (expectedRef && refs.some((ref) => ref !== expectedRef)) {
        errors.push(`Independent project evidence is not the expected target ${expectedRef}: observed ${[...new Set(refs)].join(', ') || '(missing)'}.`);
      }
      if (identity?.source !== 'supabase-management-api' || identity?.method !== 'GET /v1/projects/{ref}' || !validIsoTimestamp(identity?.checkedAt)) {
        blockers.push('Project identity evidence is incomplete or was not fetched from GET /v1/projects/{ref}.');
      }
      if (projectEvidence.history && (
        projectEvidence.history.source !== 'supabase-management-api'
        || projectEvidence.history.method !== 'GET /v1/projects/{ref}/database/migrations'
        || !validIsoTimestamp(projectEvidence.history.checkedAt)
      )) {
        blockers.push('Remote migration history evidence is incomplete or was not fetched from the Management API history endpoint.');
      }
      bundleValid = blockers.length === initialBlockerCount && errors.length === initialErrorCount;
    }
  } else {
    blockers.push('Independent project evidence bundle is required; caller-supplied refs or migration arrays are not target verification.');
  }

  if (targetRef && expectedRef && String(targetRef).trim() !== expectedRef) {
    errors.push(`Target project ref is unverified: caller target ${String(targetRef).trim()} does not match expected ${expectedRef}.`);
  }

  let identityVerified = false;
  if (!identity || typeof identity !== 'object') {
    blockers.push('Independent project identity evidence is missing; caller-supplied refs alone cannot verify the target project.');
  } else if (!identity.source || !identity.projectRef || !identity.method || !validIsoTimestamp(identity.checkedAt)) {
    blockers.push('Project identity evidence is incomplete: source, projectRef, method, and a parseable checkedAt are required.');
  } else if (expectedRef && identity.projectRef !== expectedRef) {
    errors.push(`Project identity evidence references ${identity.projectRef}, not the expected target ${expectedRef}.`);
  } else if (bundleValid) {
    identityVerified = true;
    evidence.push(`Target project identity independently verified as ${identity.projectRef} via ${identity.source} (${identity.method}) at ${identity.checkedAt}.`);
  } else {
    blockers.push('Project identity was not produced by a supported independent evidence path.');
  }

  let remote = null;
  let remoteHistoryAvailable = false;
  if (remoteInput == null) {
    if (!blockers.some((message) => /Remote migration history is required/.test(message))) {
      blockers.push('Remote migration history is required for the verified target project.');
    }
  } else if (identityVerified) {
    try {
      remote = normalizeHistoryEntries(remoteInput, 'Remote');
      remoteHistoryAvailable = true;
      evidence.push(`Remote migration history read from the independently verified target ${identity.projectRef}.`);
    } catch (error) {
      blockers.push(error.message);
    }
  }

  return { identity, identityVerified, remote, remoteHistoryAvailable };
}

export function verifyReleaseMigrationHistory({
  manifest,
  commitSha,
  targetRef,
  expectedRef,
  localVersions,
  projectEvidence,
  schemaEvidence,
  readFile = fs.readFileSync,
} = {}) {
  const evidence = [];
  const errors = [];
  const blockers = [];
  const warnings = [];
  const findings = [];

  const manifestValidation = validateManifestAgainstFiles(manifest, { commitSha, readFile });
  errors.push(...manifestValidation.errors);

  const expected = expectedRef ? String(expectedRef).trim() : '';
  if (!expected) blockers.push('Expected target project ref is missing.');

  let local = null;
  if (localVersions == null) {
    blockers.push('Local migration history is required.');
  } else {
    try { local = normalizeVersions(localVersions, 'Local'); }
    catch (e) { blockers.push(e.message); }
  }
  const project = resolveProjectEvidence({ projectEvidence, expectedRef: expected, targetRef, errors, blockers, evidence });
  const { identity, identityVerified, remote, remoteHistoryAvailable } = project;
  const normalizedSchemaEvidence = normalizeSchemaEvidence(schemaEvidence, expected, errors, blockers);

  const reviewed = manifestValidation.reviewedMigrations ?? [];
  const localSet = new Set(local ?? []);
  const remoteBy = new Map((remote ?? []).map((entry) => [entry.version, entry]));
  const reviewedSet = new Set(reviewed.map((m) => m.version));

  const schemaBy = new Map();
  for (const rec of normalizedSchemaEvidence.records) {
    if (rec && typeof rec === 'object' && typeof rec.version === 'string' && !schemaBy.has(rec.version)) schemaBy.set(rec.version, rec);
  }

  const recordedReviewed = [];
  const alreadyAppliedReviewed = [];
  const reviewedPending = [];
  const unverifiedReviewed = [];
  const driftReviewed = [];
  const reviewedMissingLocally = [];
  const reviewedMissingRemotely = [];
  const historyMetadataIncomplete = [];
  const appliedProvenance = {};
  const unexplainedRemoteDrift = [];
  const unexplainedLocalDrift = []; // legacy field: retained, now always informational via unreleasedLocal
  const migrationStates = [];

  for (const migration of reviewed) {
    const v = migration.version;
    if (!local) {
      migrationStates.push({ version: v, filename: migration.filename, state: 'UNVERIFIED', provenance: 'local-history-unavailable' });
      unverifiedReviewed.push(v);
      continue;
    }
    const inLocal = localSet.has(v);
    if (!inLocal) {
      reviewedMissingLocally.push(v);
      driftReviewed.push(v);
      if (local) errors.push(`Reviewed migration ${v} is missing from local migration history.`);
    }
    if (!remoteHistoryAvailable) {
      migrationStates.push({ version: v, filename: migration.filename, state: 'UNVERIFIED', provenance: 'remote-history-unavailable' });
      unverifiedReviewed.push(v);
      continue;
    }
    const remoteEntry = remoteBy.get(v);
    if (!remoteEntry) {
      reviewedMissingRemotely.push(v);
      if (inLocal) {
        reviewedPending.push(v);
        findings.push(`Reviewed migration ${v} is not present on the target Supabase migration history.`);
        migrationStates.push({ version: v, filename: migration.filename, state: 'PENDING', provenance: 'absent' });
      } else {
        migrationStates.push({ version: v, filename: migration.filename, state: 'DRIFT', provenance: 'absent-and-missing-locally' });
      }
      continue;
    }
    recordedReviewed.push(v);
    const provenance = classifyRemoteProvenance(remoteEntry);

    if (remoteEntry.name != null && remoteEntry.name !== migration.name) {
      driftReviewed.push(v);
      appliedProvenance[v] = 'history-name-contradiction';
      errors.push(`Remote history name for ${v} is ${remoteEntry.name}, expected reviewed name ${migration.name}.`);
      migrationStates.push({ version: v, filename: migration.filename, state: 'DRIFT', provenance: 'history-name-contradiction' });
      continue;
    }

    if (remoteEntry.sqlSha256) {
      if (remoteEntry.sqlSha256 !== migration.sha256.toLowerCase()) {
        driftReviewed.push(v);
        appliedProvenance[v] = 'history-sql-hash-contradiction';
        errors.push(`Remote history SQL SHA-256 for ${v} does not match the reviewed migration.`);
        migrationStates.push({ version: v, filename: migration.filename, state: 'DRIFT', provenance: 'history-sql-hash-contradiction' });
      } else if (inLocal) {
        alreadyAppliedReviewed.push(v);
        appliedProvenance[v] = 'history-sql-hash-verified';
        migrationStates.push({ version: v, filename: migration.filename, state: 'APPLIED', provenance: 'history-sql-hash-verified' });
      }
      continue;
    }

    historyMetadataIncomplete.push({
      version: v,
      provenance,
      name: remoteEntry.name,
      statementsPresent: remoteEntry.statementsPresent,
      reviewedName: migration.name,
    });
    const rec = schemaBy.get(v);
    if (!rec) {
      appliedProvenance[v] = `${provenance}-unverified`;
      unverifiedReviewed.push(v);
      blockers.push(`Provenance unverified for reviewed migration ${v}: remote history records ${provenance.replace(/-/g, ' ')}; history alone does not prove the reviewed SQL was applied.`);
      migrationStates.push({ version: v, filename: migration.filename, state: 'UNVERIFIED', provenance: `${provenance}-unverified` });
      continue;
    }
    if (rec.projectRef && expected && rec.projectRef !== expected) {
      appliedProvenance[v] = 'schema-evidence-target-contradiction';
      driftReviewed.push(v);
      errors.push(`Schema evidence for ${v} contradicts the target: references project ${rec.projectRef}, expected ${expected}.`);
      migrationStates.push({ version: v, filename: migration.filename, state: 'DRIFT', provenance: 'schema-evidence-target-contradiction' });
      continue;
    }
    if (typeof rec.reviewedFileSha256 === 'string' && rec.reviewedFileSha256.toLowerCase() !== migration.sha256.toLowerCase()) {
      appliedProvenance[v] = 'schema-evidence-hash-contradiction';
      driftReviewed.push(v);
      errors.push(`Schema evidence for ${v} does not match the reviewed SQL SHA-256 (evidence ${rec.reviewedFileSha256}, manifest ${migration.sha256}).`);
      migrationStates.push({ version: v, filename: migration.filename, state: 'DRIFT', provenance: 'schema-evidence-hash-contradiction' });
      continue;
    }
    if (rec.definitionEquivalent === false) {
      appliedProvenance[v] = 'schema-evidence-definition-contradiction';
      driftReviewed.push(v);
      errors.push(`Schema evidence for ${v} reports that the installed definition is not equivalent to the reviewed SQL.`);
      migrationStates.push({ version: v, filename: migration.filename, state: 'DRIFT', provenance: 'schema-evidence-definition-contradiction' });
      continue;
    }
    if (rec.definitionEquivalent !== true || !rec.method || !validIsoTimestamp(rec.checkedAt) || !rec.reviewedFileSha256) {
      appliedProvenance[v] = `${provenance}-evidence-incomplete`;
      unverifiedReviewed.push(v);
      blockers.push(`Schema evidence for ${v} is incomplete: reviewedFileSha256, definitionEquivalent=true, method, and checkedAt are required.`);
      migrationStates.push({ version: v, filename: migration.filename, state: 'UNVERIFIED', provenance: `${provenance}-evidence-incomplete` });
      continue;
    }
    alreadyAppliedReviewed.push(v);
    appliedProvenance[v] = 'schema-evidence-verified';
    migrationStates.push({ version: v, filename: migration.filename, state: 'APPLIED', provenance: 'schema-evidence-verified' });
    warnings.push(`Reviewed migration ${v} has incomplete remote history metadata (${provenance.replace(/-/g, ' ')}); recorded as schema-verified via reviewed read-only evidence (${rec.method}, ${rec.checkedAt}), not as a missing migration.`);
  }

  // Unexplained drift: remote contains history the repo does not (schema changed outside reviewed files).
  // Never assume all migrations in supabase/migrations belong to the current release: local-only
  // non-reviewed versions are unreleased repo work, reported as information, not failure.
  const unreleasedLocal = [];
  if (local && remoteHistoryAvailable) {
    for (const entry of remote) if (!localSet.has(entry.version)) unexplainedRemoteDrift.push(entry.version);
    for (const v of (local ?? [])) {
      if (!remoteBy.has(v) && !reviewedSet.has(v)) {
        unreleasedLocal.push(v);
        warnings.push(`Local migration ${v} is not on the target and is not in the reviewed manifest; treating it as unreleased repo work, not release scope.`);
      }
    }
  }

  for (const v of unexplainedRemoteDrift) errors.push(`Remote migration ${v} exists on target but is missing locally/review manifest.`);

  const manifestUnverified = !manifestValidation.ok;
  const knownDrift = unexplainedRemoteDrift.length > 0 || driftReviewed.length > 0 || reviewedMissingLocally.length > 0;
  const unverified = manifestUnverified || errors.length > 0 || blockers.length > 0 || !identityVerified || !remoteHistoryAvailable || unverifiedReviewed.length > 0;
  const status = knownDrift ? 'DRIFT' : (unverified ? 'UNVERIFIED' : (reviewedPending.length > 0 ? 'PENDING' : 'APPLIED'));

  return {
    schema: HISTORY_SCHEMA,
    checkedAt: new Date().toISOString(),
    status,
    classification: status,
    ok: status === 'APPLIED',
    verified: status !== 'UNVERIFIED',
    reviewedCommitSha: manifestValidation.reviewedCommitSha,
    targetRef: identity?.projectRef || (targetRef ? String(targetRef).trim() : null),
    expectedRef: expected || null,
    projectIdentityVerified: identityVerified,
    reviewedMigrations: reviewed,
    reviewedVersions: reviewed.map((m) => m.version),
    noMigrationChange: manifestValidation.noMigrationChange,
    localVersions: local,
    remoteVersions: remote ? remote.map((e) => e.version) : null,
    remoteEntries: remote,
    remoteHistoryAvailable,
    migrationStates,
    recordedReviewed,
    alreadyAppliedReviewed,
    reviewedPending,
    unverifiedReviewed,
    driftReviewed,
    reviewedMissingLocally,
    reviewedMissingRemotely,
    historyMetadataIncomplete,
    appliedProvenance,
    unexplainedRemoteDrift,
    unexplainedLocalDrift,
    unreleasedLocal,
    evidence,
    warnings,
    findings,
    blockers,
    errors,
  };
}

// Backward-compatible export name used by existing tests/CLI.
export function validateRemoteMigrationState(input) {
  const result = verifyReleaseMigrationHistory(input);
  return {
    ok: result.ok && result.verified,
    status: result.status,
    errors: [...result.blockers, ...result.findings, ...result.errors],
    targetRef: result.targetRef,
    expectedRef: result.expectedRef,
    alreadyAppliedReviewed: result.alreadyAppliedReviewed,
    reviewedPending: result.reviewedPending,
    unexplainedRemoteDrift: result.unexplainedRemoteDrift,
    historyMetadataIncomplete: result.historyMetadataIncomplete,
  };
}

function normalizeEvidence(value, label) {
  if (value === true || value === false) return value;
  if (value == null) return null;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  throw new Error(`${label} evidence must be boolean true/false, got ${JSON.stringify(value)}.`);
}

export function validateRpcContracts({
  manifest,
  rpcContracts,
  rpcEvidence,
}) {
  const errors = [];
  const required = manifest?.requiredRpcContracts ?? [];
  let contracts = rpcContracts;
  let evidence = rpcEvidence;
  try { evidence = normalizeEvidence(rpcEvidence, 'RPC contract'); } catch (e) { errors.push(e.message); }
  if (required.length === 0) {
    // No RPC contracts required by manifest - pass vacuously only if explicitly ok
    return { ok: evidence === true && errors.length === 0, errors, required: [] };
  }
  if (contracts == null) {
    errors.push('RPC contracts are required by manifest but no live contract evidence was provided.');
  } else if (!Array.isArray(contracts)) {
    errors.push('RPC contracts evidence must be a JSON array of {schema,name,argTypes,definition,owner,searchPath,grants}.');
  } else {
    for (const req of required) {
      const found = contracts.find(c => c && c.schema === req.schema && c.name === req.name);
      if (!found) {
        errors.push(`Required RPC ${req.schema}.${req.name} not found in live contracts.`);
        continue;
      }
      if (req.argTypes && JSON.stringify(found.argTypes) !== JSON.stringify(req.argTypes)) {
        errors.push(`RPC ${req.schema}.${req.name} arg types mismatch: expected ${JSON.stringify(req.argTypes)}, got ${JSON.stringify(found.argTypes)}.`);
      }
      for (const field of ['definition', 'owner', 'searchPath', 'grants']) {
        if (found[field] == null || found[field] === '') {
          errors.push(`RPC ${req.schema}.${req.name} missing required evidence field: ${field}.`);
        }
      }
    }
  }
  if (evidence === false) errors.push('RPC contract verification reported failure.');
  return { ok: errors.length === 0, errors, required };
}

function requestJson(url, { timeout = 10000, allowHttp = false } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' && !allowHttp) {
      reject(new Error(`Refusing plaintext HTTP for production verification: ${url}. Use HTTPS.`));
      return;
    }
    const transport = parsed.protocol === 'https:' ? https : http;
    const req = transport.request(parsed, { method: 'GET', timeout }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode ?? 0, json: JSON.parse(body), body });
        } catch (error) {
          reject(new Error(`Non-JSON response from ${url}: ${error.message}`));
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error(`Timed out after ${timeout}ms`)));
    req.on('error', reject);
    req.end();
  });
}

export function evaluateSmokeHealth({ status, body, expectedSha, now = Date.now() } = {}) {
  const errors = [];
  if (status !== 200) errors.push(`Expected HTTP 200, got ${status}.`);
  if (typeof body?.status !== 'string') errors.push('Health response missing status.');
  if (typeof body?.timestamp !== 'string' || Number.isNaN(Date.parse(body.timestamp))) {
    errors.push('Health response missing parseable timestamp.');
  } else if (Math.abs(now - Date.parse(body.timestamp)) > 5 * 60 * 1000) {
    errors.push('Health timestamp is stale (>5 minutes).');
  }
  if (!expectedSha) {
    errors.push('Expected build SHA is required for production/staging provenance verification.');
  } else if (typeof body?.buildSha !== 'string' || !body.buildSha.trim()) {
    errors.push('Health response missing buildSha for artifact provenance verification.');
  } else if (body.buildSha.trim() !== expectedSha.trim()) {
    errors.push(`Deployed build SHA mismatch: expected ${expectedSha}, got ${body.buildSha}.`);
  }
  return { ok: errors.length === 0, errors, buildSha: body?.buildSha ?? null };
}

export async function verifyArtifactProvenance({ expectedSha, healthUrl, timeout, allowHttp = false } = {}) {
  if (!expectedSha) return { ok: false, errors: ['Expected SHA is required.'], buildSha: null };
  if (!healthUrl) return { ok: false, errors: ['Health URL is required.'], buildSha: null };
  try {
    const { status, json } = await requestJson(healthUrl, { timeout, allowHttp });
    return evaluateSmokeHealth({ status, body: json, expectedSha });
  } catch (error) {
    return { ok: false, errors: [error.message], buildSha: null };
  }
}

function normalizeGateMode(mode) {
  if (mode === 'promote' || mode === 'production' || mode === 'staging-promote') return 'promote';
  if (mode === 'check' || mode === 'staging-validate' || mode === 'validate') return 'check';
  throw new Error(`Unsupported gate mode: ${mode}. Use check or promote.`);
}

export function evaluateReleaseGate({
  manifestValidation,
  remoteValidation,
  rpcValidation,
  testValidationPassed,
  provenanceValidation,
  mode = 'promote',
} = {}) {
  const errors = [];
  const gateMode = normalizeGateMode(mode);
  let testsOk = false;
  try { testsOk = normalizeEvidence(testValidationPassed, 'Test validation'); } catch (e) { errors.push(e.message); }
  if (!testsOk) {
    errors.push('Test validation evidence is required before migration/release promotion.');
  }
  for (const [name, result] of Object.entries({
    manifest: manifestValidation,
    remoteHistory: remoteValidation,
    rpcContracts: rpcValidation,
    provenance: provenanceValidation,
  })) {
    if (!result || result.ok !== true) {
      errors.push(`${name} gate failed${result?.errors?.length ? `: ${result.errors.join('; ')}` : '.'}`);
    }
  }
  if (gateMode === 'promote' && errors.length) {
    errors.push('Production promotion blocked: migration/release parity gates did not pass.');
  }
  return { ok: errors.length === 0, errors, mode: gateMode };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function argValue(argv, flag) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

function requiredArg(argv, flag) {
  const value = argValue(argv, flag);
  if (!value) throw new Error(`Missing required argument ${flag}`);
  return value;
}

function readOptionalJson(file) {
  if (!file) return undefined;
  return readJson(file);
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function printResult(result) {
  console.log(JSON.stringify(result, null, 2));
}

async function main(argv = process.argv.slice(2)) {
  const [command] = argv;
  if (command === 'manifest') {
    const commitSha = requiredArg(argv, '--commit');
    const out = requiredArg(argv, '--out');
    const migrationsArg = argValue(argv, '--migrations');
    const rpcsArg = argValue(argv, '--rpcs');
    const noMigrationChange = argv.includes('--no-migration-change');
    const reason = argValue(argv, '--reason');
    const migrations = migrationsArg == null ? undefined : migrationsArg.split(',').filter(Boolean).map((entry) => {
      const [version, name, file] = entry.split(':');
      return { version, name, path: file };
    });
    const requiredRpcContracts = rpcsArg ? readJson(rpcsArg) : [];
    const manifest = buildMigrationManifest({ commitSha, migrations, requiredRpcContracts, noMigrationChange, reason });
    writeJson(out, manifest);
    console.log(`Wrote migration manifest for ${manifest.commitSha} to ${out}`);
    return;
  }

  if (command === 'verify-history') {
    const manifest = readJson(requiredArg(argv, '--manifest'));
    const expectedCommit = requiredArg(argv, '--expected-commit');
    const expectedRef = requiredArg(argv, '--expected-ref');
    const projectEvidence = readJson(requiredArg(argv, '--project-evidence'));
    const schemaEvidence = readOptionalJson(argValue(argv, '--schema-evidence'));
    const localVersions = readJson(requiredArg(argv, '--local-versions'));
    const out = argValue(argv, '--out');
    const result = verifyReleaseMigrationHistory({
      manifest,
      commitSha: expectedCommit,
      expectedRef,
      localVersions,
      projectEvidence,
      schemaEvidence,
    });
    if (out) writeJson(out, result);
    printResult(result);
    if (result.status !== 'APPLIED') process.exitCode = 1;
    return;
  }

  if (command === 'check') {
    const manifest = readJson(requiredArg(argv, '--manifest'));
    const commitSha = requiredArg(argv, '--commit');
    const expectedRef = requiredArg(argv, '--expected-ref');
    const localVersions = readJson(requiredArg(argv, '--local-versions'));
    const projectEvidence = readJson(requiredArg(argv, '--project-evidence'));
    const gateMode = argValue(argv, '--gate-mode') || 'promote';
    const testValidationPassed = argValue(argv, '--test-validation');
    const rpcContracts = argValue(argv, '--rpc-contracts-file') ? readJson(argValue(argv, '--rpc-contracts-file')) : null;
    const rpcEvidence = argValue(argv, '--rpc-contracts');
    const artifactProvenanceArg = argValue(argv, '--artifact-provenance');
    let artifactProvenance;
    try { artifactProvenance = normalizeEvidence(artifactProvenanceArg, 'Artifact provenance'); }
    catch (e) { artifactProvenance = { ok: false, errors: [e.message] }; }
    if (artifactProvenance === true) artifactProvenance = { ok: true, errors: [] };
    if (artifactProvenance === false) artifactProvenance = { ok: false, errors: ['Artifact provenance evidence reported failure.'] };

    const result = evaluateReleaseGate({
      manifestValidation: validateManifestAgainstFiles(manifest, { commitSha }),
      remoteValidation: validateRemoteMigrationState({ expectedRef, manifest, localVersions, projectEvidence }),
      rpcValidation: validateRpcContracts({ manifest, rpcContracts, rpcEvidence }),
      testValidationPassed,
      provenanceValidation: artifactProvenance,
      mode: gateMode,
    });
    if (!result.ok) {
      console.error('Release migration gate failed:');
      for (const error of result.errors) console.error(`- ${error}`);
      process.exit(1);
    }
    console.log(`Release migration gate checks passed (mode=${result.mode}).`);
    return;
  }

  if (command === 'verify-provenance') {
    const expectedSha = requiredArg(argv, '--expected-sha');
    const healthUrl = requiredArg(argv, '--health-url');
    const allowHttp = argv.includes('--allow-http');
    const result = await verifyArtifactProvenance({ expectedSha, healthUrl, allowHttp });
    if (!result.ok) {
      console.error('Artifact provenance verification failed:');
      for (const error of result.errors) console.error(`- ${error}`);
      process.exit(1);
    }
    console.log(`Artifact provenance verified for ${expectedSha}: ${result.buildSha}`);
    return;
  }

  throw new Error(`Unsupported command: ${command ?? '(missing)'}. Use manifest, verify-history, check, or verify-provenance.`);
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isCli) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
