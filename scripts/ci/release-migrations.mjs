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
 *   verify-history --manifest <file> --expected-commit <sha> --expected-ref <ref> [--local-versions <file>] [--access-token-env <ENV>] [--schema-evidence <file>] [--out <file>]
 *   check --manifest <file> --commit <sha> --expected-ref <ref> [--local-versions <file>] [--access-token-env <ENV>] [--schema-evidence <file>]
 *   verify-provenance --expected-sha <sha> --health-url <url>
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import {
  collectProjectFunctionEvidence,
  collectProjectMigrationEvidence,
  PROJECT_HISTORY_EVIDENCE_SCHEMA,
} from './collect-release-evidence.mjs';

export const MANIFEST_SCHEMA = 'luckystore.release-migrations/v1';
export const HISTORY_SCHEMA = 'luckystore.release-migration-history/v1';
export const SCHEMA_EVIDENCE_SCHEMA = 'luckystore.migration-schema-evidence/v2';
export const PLPGSQL_BODY_HASH_ALGORITHM = 'luckystore.plpgsql-prosrc-utf8-lf-ascii-trim-sha256/v1';
const PROJECT_EVIDENCE_MAX_AGE_MS = 15 * 60 * 1000;
const SCHEMA_EVIDENCE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const AUTHORIZED_TEST_ONLY_PROJECT_REF = 'grxxenvdhfwzafzyykgo';

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

export function normalizePlpgsqlFunctionBody(body) {
  if (typeof body !== 'string') throw new Error('PL/pgSQL function body must be a string.');
  const normalized = body
    .replace(/\r\n?/g, '\n')
    .replace(/^[\x09-\x0d\x20]+|[\x09-\x0d\x20]+$/g, '');
  if (!normalized) throw new Error('PL/pgSQL function body is empty after normalization.');
  return normalized;
}

export function hashPlpgsqlFunctionBody(body) {
  return sha256(Buffer.from(normalizePlpgsqlFunctionBody(body), 'utf8'));
}

function normalizeSqlIdentifier(identifier) {
  const value = String(identifier || '').trim();
  return value.startsWith('"') && value.endsWith('"')
    ? value.slice(1, -1).replaceAll('""', '"')
    : value.toLowerCase();
}

function findClosingParenthesis(sql, openIndex) {
  let depth = 0;
  let quote = null;
  for (let index = openIndex; index < sql.length; index += 1) {
    const char = sql[index];
    if (quote) {
      if (char === quote && sql[index + 1] === quote) index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"') { quote = char; continue; }
    if (char === '(') depth += 1;
    if (char === ')' && --depth === 0) return index;
  }
  return -1;
}

function normalizeFunctionArgTypes(argumentsSql) {
  return argumentsSql.split(',').map((argument) => {
    const withoutDefault = argument.trim().split(/\s+(?:DEFAULT|=)\s+/i)[0];
    const tokens = withoutDefault.split(/\s+/).filter(Boolean);
    const withoutMode = ['in', 'out', 'inout', 'variadic'].includes(tokens[0]?.toLowerCase()) ? tokens.slice(1) : tokens;
    return normalizeSqlIdentifier(withoutMode.length > 1 ? withoutMode.slice(1).join(' ') : withoutMode[0]);
  });
}

function locateReviewedPlpgsqlFunction(sql, expectedFunction) {
  if (typeof sql !== 'string') throw new Error('Reviewed migration SQL must be a string.');
  const expectedSchema = normalizeSqlIdentifier(expectedFunction?.schema);
  const expectedName = normalizeSqlIdentifier(expectedFunction?.name);
  const expectedArgTypes = (expectedFunction?.argTypes ?? []).map(normalizeSqlIdentifier);
  if (!expectedSchema || !expectedName || expectedArgTypes.length === 0) {
    throw new Error('Expected function schema, name, and argTypes are required.');
  }

  const definitions = [];
  const header = /\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+((?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*)\.)?("(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*)\s*\(/gi;
  let match;
  while ((match = header.exec(sql)) !== null) {
    const schema = normalizeSqlIdentifier(match[1] ? match[1].slice(0, -1) : 'public');
    const name = normalizeSqlIdentifier(match[2]);
    const openIndex = header.lastIndex - 1;
    const closeIndex = findClosingParenthesis(sql, openIndex);
    if (closeIndex < 0) continue;
    const argTypes = normalizeFunctionArgTypes(sql.slice(openIndex + 1, closeIndex));
    if (schema !== expectedSchema || name !== expectedName || JSON.stringify(argTypes) !== JSON.stringify(expectedArgTypes)) continue;

    const nextHeader = sql.slice(closeIndex + 1).search(/\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\b/i);
    const definitionEnd = nextHeader < 0 ? sql.length : closeIndex + 1 + nextHeader;
    const definitionTail = sql.slice(closeIndex + 1, definitionEnd);
    const bodyMarker = /\bAS\s+(\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$)/i.exec(definitionTail);
    if (!bodyMarker || !/\bLANGUAGE\s+plpgsql\b/i.test(definitionTail.slice(0, bodyMarker.index))) continue;
    const tag = bodyMarker[1];
    const bodyStart = closeIndex + 1 + bodyMarker.index + bodyMarker[0].length;
    const bodyEnd = sql.indexOf(tag, bodyStart);
    if (bodyEnd < 0 || bodyEnd >= definitionEnd) continue;
    definitions.push({
      body: sql.slice(bodyStart, bodyEnd),
      definitionSql: sql.slice(match.index, definitionEnd),
    });
  }

  if (definitions.length !== 1) {
    throw new Error(`Expected exactly one matching function ${expectedSchema}.${expectedName}(${expectedArgTypes.join(',')}), found ${definitions.length}.`);
  }
  return definitions[0];
}

export function extractReviewedPlpgsqlFunctionBody(sql, expectedFunction) {
  return locateReviewedPlpgsqlFunction(sql, expectedFunction).body;
}

function extractReviewedPlpgsqlFunctionContract(sql, expectedFunction) {
  const located = locateReviewedPlpgsqlFunction(sql, expectedFunction);
  const definition = located.definitionSql;
  const result = /\bRETURNS\s+TABLE\s*\(([^)]*)\)/i.exec(definition);
  const language = /\bLANGUAGE\s+([A-Za-z_][A-Za-z0-9_$]*)/i.exec(definition);
  const volatility = /\b(IMMUTABLE|STABLE|VOLATILE)\b/i.exec(definition);
  const searchPath = /\bSET\s+search_path\s*=\s*''/i.test(definition) ? '' : null;
  if (!result || !language || !volatility || searchPath == null || !/\bSECURITY\s+DEFINER\b/i.test(definition)) {
    throw new Error('Reviewed function contract is incomplete or unsupported.');
  }
  const schema = normalizeSqlIdentifier(expectedFunction.schema);
  const name = normalizeSqlIdentifier(expectedFunction.name);
  const identityPattern = `${schema.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\.\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\([^)]*\\)`;
  const grantPattern = new RegExp(`\\bGRANT\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+${identityPattern}\\s+TO\\s+([^;]+);`, 'gi');
  const revokePattern = new RegExp(`\\bREVOKE\\s+ALL\\s+ON\\s+FUNCTION\\s+${identityPattern}\\s+FROM\\s+([^;]+);`, 'i');
  const grants = [];
  let grantMatch;
  while ((grantMatch = grantPattern.exec(definition)) !== null) {
    grants.push(...grantMatch[1].split(',').map((grantee) => `${normalizeSqlIdentifier(grantee)} EXECUTE`));
  }
  const revoked = revokePattern.exec(definition)?.[1]
    ?.split(',')
    .map(normalizeSqlIdentifier) ?? [];
  if (!revoked.includes('public')) throw new Error('Reviewed function does not explicitly revoke PUBLIC execution.');
  return {
    schema,
    name,
    argTypes: expectedFunction.argTypes.map(normalizeSqlIdentifier),
    resultType: `TABLE(${result[1].trim().replace(/\s+/g, ' ')})`,
    language: normalizeSqlIdentifier(language[1]),
    volatility: volatility[1].toLowerCase(),
    securityDefiner: true,
    owner: 'postgres',
    searchPath,
    grants: [...new Set(grants)],
  };
}

function assertCommitSha(commitSha, label = 'commit SHA') {
  if (!commitSha || !/^[0-9a-f]{40}$/i.test(String(commitSha))) {
    throw new Error(`Invalid ${label}: ${commitSha ?? '(missing)'}`);
  }
  return String(commitSha).toLowerCase();
}

export function createGitCommitFileReader(commitSha, { execFile = execFileSync } = {}) {
  const normalizedCommit = assertCommitSha(commitSha, 'reviewed commit SHA');
  let resolvedCommit;
  try {
    resolvedCommit = String(execFile(
      'git',
      ['rev-parse', '--verify', `${normalizedCommit}^{commit}`],
      { encoding: 'utf8' },
    )).trim().toLowerCase();
  } catch {
    throw new Error(`Reviewed commit is not available in this repository: ${normalizedCommit}.`);
  }
  if (resolvedCommit !== normalizedCommit) {
    throw new Error(`Reviewed commit did not resolve exactly: expected ${normalizedCommit}, got ${resolvedCommit || '(missing)'}.`);
  }
  return (file, encoding = 'utf8') => {
    const repositoryPath = String(file || '').replaceAll('\\', '/');
    if (!repositoryPath || path.isAbsolute(repositoryPath) || repositoryPath.split('/').includes('..')) {
      throw new Error(`Reviewed migration path must be repository-relative: ${file ?? '(missing)'}.`);
    }
    try {
      return execFile(
        'git',
        ['show', `${resolvedCommit}:${repositoryPath}`],
        { encoding, maxBuffer: 10 * 1024 * 1024 },
      );
    } catch {
      throw new Error(`Reviewed migration file is unavailable at commit ${resolvedCommit}: ${repositoryPath}.`);
    }
  };
}

export function createGitCommitMigrationVersionReader(commitSha, { execFile = execFileSync } = {}) {
  const normalizedCommit = assertCommitSha(commitSha, 'reviewed commit SHA');
  let resolvedCommit;
  try {
    resolvedCommit = String(execFile(
      'git',
      ['rev-parse', '--verify', `${normalizedCommit}^{commit}`],
      { encoding: 'utf8' },
    )).trim().toLowerCase();
  } catch {
    throw new Error(`Reviewed commit is not available in this repository: ${normalizedCommit}.`);
  }
  if (resolvedCommit !== normalizedCommit) {
    throw new Error(`Reviewed commit did not resolve exactly: expected ${normalizedCommit}, got ${resolvedCommit || '(missing)'}.`);
  }
  return () => {
    let files;
    try {
      files = String(execFile(
        'git',
        ['ls-tree', '-r', '--name-only', resolvedCommit, '--', 'supabase/migrations'],
        { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
      ));
    } catch {
      throw new Error(`Could not enumerate migrations at reviewed commit ${resolvedCommit}.`);
    }
    return files
      .split(/\r?\n/)
      .map((file) => /(?:^|\/)supabase\/migrations\/(\d{14})_.+\.sql$/.exec(file)?.[1])
      .filter(Boolean)
      .sort();
  };
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
  return migrations.map((migration, index) => {
    if (!migration || typeof migration !== 'object') {
      throw new Error(`Migration entry is invalid at index ${index}.`);
    }
    const rawPath = migration.path ?? migration.file;
    if (!rawPath) throw new Error(`Migration entry requires path/file at index ${index}.`);
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
  try { expectedCommit = assertCommitSha(commitSha, 'reviewed commit SHA'); }
  catch (e) { errors.push(e.message); expectedCommit = String(commitSha ?? '').toLowerCase(); }
  let manifestCommit = '';
  try { manifestCommit = assertCommitSha(manifest?.commitSha, 'manifest commit SHA'); }
  catch (e) { errors.push(e.message); manifestCommit = String(manifest?.commitSha ?? '').toLowerCase(); }
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
  for (const [index, migration] of migrations.entries()) {
    if (!migration || typeof migration !== 'object') {
      errors.push(`Invalid reviewed migration entry at index ${index}.`);
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
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
    && !Number.isNaN(Date.parse(value));
}

function evidenceIsFresh(value, now, maxAgeMs) {
  if (!validIsoTimestamp(value)) return false;
  const checkedAt = Date.parse(value);
  return checkedAt <= now + 5 * 60 * 1000 && now - checkedAt <= maxAgeMs;
}

function normalizeSchemaEvidence(schemaEvidence, expectedRef, errors, blockers, now) {
  if (schemaEvidence == null) return { records: [], supplied: false, valid: false };
  const initialErrorCount = errors.length;
  const initialBlockerCount = blockers.length;
  if (!schemaEvidence || typeof schemaEvidence !== 'object' || Array.isArray(schemaEvidence)) {
    blockers.push(`Schema evidence must be a ${SCHEMA_EVIDENCE_SCHEMA} object.`);
    return { records: [], supplied: true, valid: false };
  }
  if (schemaEvidence.schema !== SCHEMA_EVIDENCE_SCHEMA) {
    blockers.push(`Schema evidence schema is missing or unsupported: ${schemaEvidence.schema ?? '(missing)'}.`);
  }
  if (!schemaEvidence.projectRef || !schemaEvidence.method || !validIsoTimestamp(schemaEvidence.checkedAt)) {
    blockers.push('Schema evidence is incomplete: projectRef, method, and a parseable checkedAt are required.');
  } else if (!evidenceIsFresh(schemaEvidence.checkedAt, now, SCHEMA_EVIDENCE_MAX_AGE_MS)) {
    blockers.push(`Schema evidence is stale: checkedAt ${schemaEvidence.checkedAt} exceeds the 24-hour verification window.`);
  }
  if (expectedRef && schemaEvidence.projectRef && schemaEvidence.projectRef !== expectedRef) {
    blockers.push(`Schema evidence project ${schemaEvidence.projectRef} does not match the target ${expectedRef}.`);
  }
  if (!Array.isArray(schemaEvidence.records)) {
    blockers.push('Schema evidence records must be an array.');
    return { records: [], supplied: true, valid: false };
  }
  const seen = new Set();
  for (const [index, record] of schemaEvidence.records.entries()) {
    if (!record || typeof record !== 'object' || Array.isArray(record) || !/^\d{14}$/.test(String(record.version || ''))) {
      blockers.push(`Schema evidence record at index ${index} is invalid.`);
      continue;
    }
    if (seen.has(record.version)) blockers.push(`Duplicate schema evidence record for migration ${record.version}.`);
    seen.add(record.version);
    if (!record.projectRef || record.projectRef !== schemaEvidence.projectRef || (expectedRef && record.projectRef !== expectedRef)) {
      blockers.push(`Schema evidence record ${record.version} contradicts the target project ${expectedRef || schemaEvidence.projectRef || '(missing)'}.`);
    }
    if (!validIsoTimestamp(record.checkedAt)) {
      blockers.push(`Schema evidence record ${record.version} requires a canonical UTC checkedAt timestamp.`);
    } else if (!evidenceIsFresh(record.checkedAt, now, SCHEMA_EVIDENCE_MAX_AGE_MS)) {
      blockers.push(`Schema evidence record ${record.version} is stale: checkedAt ${record.checkedAt} exceeds the 24-hour verification window.`);
    }
  }
  return {
    records: schemaEvidence.records,
    supplied: true,
    valid: blockers.length === initialBlockerCount && errors.length === initialErrorCount,
  };
}

function normalizeAuthorizedTestOnlyLedger(ledger, expectedRef, blockers) {
  const initialBlockerCount = blockers.length;
  if (ledger == null) return { entries: new Map(), valid: false };
  if (!ledger || typeof ledger !== 'object' || Array.isArray(ledger)) {
    blockers.push('Authorized test-only migration ledger must be an object.');
    return { entries: new Map(), valid: false };
  }
  if (ledger.schema !== 'luckystore.authorized-test-only-migration-ledger/v1') {
    blockers.push(`Authorized test-only migration ledger schema is unsupported: ${ledger.schema ?? '(missing)'}.`);
  }
  if (!ledger.targetProjectRef || ledger.targetProjectRef !== expectedRef) {
    blockers.push(`Authorized test-only migration ledger target ${ledger.targetProjectRef ?? '(missing)'} does not match ${expectedRef || '(missing)'}.`);
  }
  if (!Array.isArray(ledger.authorized)) {
    blockers.push('Authorized test-only migration ledger entries must be an array.');
    return { entries: new Map(), valid: false };
  }
  const entries = new Map();
  for (const [index, entry] of ledger.authorized.entries()) {
    const requiredText = ['version', 'name', 'reason', 'classification', 'evidence', 'approvalSource', 'approvalMethod'];
    if (!entry || typeof entry !== 'object' || requiredText.some((field) => typeof entry[field] !== 'string' || !entry[field].trim())) {
      blockers.push(`Authorized test-only migration ledger entry at index ${index} is incomplete.`);
      continue;
    }
    if (!/^\d{14}$/.test(entry.version)) {
      blockers.push(`Authorized test-only migration ledger entry at index ${index} has an invalid version.`);
      continue;
    }
    if (entries.has(entry.version)) {
      blockers.push(`Authorized test-only migration ledger contains duplicate version ${entry.version}.`);
      continue;
    }
    entries.set(entry.version, entry);
  }
  return { entries, valid: blockers.length === initialBlockerCount };
}

function normalizeContractText(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : value;
}

function normalizeExecuteGrants(grants, owner) {
  if (!Array.isArray(grants)) return null;
  const ownerGrant = `${normalizeContractText(owner)} execute`;
  return grants
    .map(normalizeContractText)
    .filter((grant) => grant !== ownerGrant)
    .sort();
}

function functionContractsEquivalent(expected, observed) {
  return expected?.schema === observed?.schema
    && expected?.name === observed?.name
    && JSON.stringify(expected?.argTypes) === JSON.stringify(observed?.argTypes)
    && normalizeContractText(expected?.resultType) === normalizeContractText(observed?.resultType)
    && normalizeContractText(expected?.language) === normalizeContractText(observed?.language)
    && normalizeContractText(expected?.volatility) === normalizeContractText(observed?.volatility)
    && expected?.securityDefiner === observed?.securityDefiner
    && normalizeContractText(expected?.owner) === normalizeContractText(observed?.owner)
    && String(expected?.searchPath) === String(observed?.searchPath)
    && JSON.stringify(normalizeExecuteGrants(expected?.grants, expected?.owner)) === JSON.stringify(normalizeExecuteGrants(observed?.grants, observed?.owner));
}

function compareReviewedFunctionEvidence({ record, migration, manifest, readFile }) {
  const observed = record?.function;
  const bodyHash = record?.bodyHash;
  if (!observed || typeof observed !== 'object' || Array.isArray(observed)) {
    return { status: 'UNVERIFIED', message: `Schema evidence for ${migration.version} requires function identity and contract metadata.` };
  }
  const identityMatches = (manifest?.requiredRpcContracts ?? []).filter((contract) => (
    contract?.schema === observed.schema
    && contract?.name === observed.name
    && JSON.stringify(contract?.argTypes) === JSON.stringify(observed.argTypes)
  ));
  if (identityMatches.length !== 1) {
    return { status: 'UNVERIFIED', message: `Schema evidence for ${migration.version} does not identify exactly one required RPC contract.` };
  }
  const contractFields = ['resultType', 'language', 'volatility', 'securityDefiner', 'owner', 'searchPath', 'grants'];
  if (contractFields.some((field) => observed[field] == null)) {
    return { status: 'UNVERIFIED', message: `Schema evidence for ${migration.version} requires complete installed function contract metadata.` };
  }
  if (
    typeof observed.securityDefiner !== 'boolean'
    || typeof observed.searchPath !== 'string'
    || !Array.isArray(observed.grants)
  ) {
    return { status: 'UNVERIFIED', message: `Schema evidence for ${migration.version} has invalid function contract metadata types.` };
  }
  if (!bodyHash || typeof bodyHash !== 'object' || Array.isArray(bodyHash)) {
    return { status: 'UNVERIFIED', message: `Schema evidence for ${migration.version} requires a normalized function body hash.` };
  }
  if (bodyHash.algorithm !== PLPGSQL_BODY_HASH_ALGORITHM) {
    return { status: 'UNVERIFIED', message: `Schema evidence for ${migration.version} uses an unsupported function body-hash algorithm.` };
  }
  if (bodyHash.source !== 'pg_proc.prosrc') {
    return { status: 'UNVERIFIED', message: `Schema evidence for ${migration.version} must hash pg_proc.prosrc, not reconstructed SQL.` };
  }
  if (typeof bodyHash.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(bodyHash.sha256)) {
    return { status: 'UNVERIFIED', message: `Schema evidence for ${migration.version} requires a lowercase SHA-256 function body hash.` };
  }

  let reviewedBodySha256;
  try {
    const reviewedSql = readFile(migration.path, 'utf8');
    const reviewedContract = extractReviewedPlpgsqlFunctionContract(reviewedSql, observed);
    if (!functionContractsEquivalent(reviewedContract, observed)) {
      return { status: 'DIFFERENT', message: `Installed function contract for ${migration.version} differs from the reviewed SQL contract.` };
    }
    const reviewedBody = extractReviewedPlpgsqlFunctionBody(reviewedSql, observed);
    reviewedBodySha256 = hashPlpgsqlFunctionBody(reviewedBody);
  } catch {
    return { status: 'UNVERIFIED', message: `Reviewed function body for ${migration.version} could not be extracted unambiguously.` };
  }
  if (bodyHash.sha256 !== reviewedBodySha256) {
    return {
      status: 'DIFFERENT',
      message: `Installed function body for ${migration.version} differs from the normalized reviewed body.`,
      reviewedBodySha256,
      installedBodySha256: bodyHash.sha256,
    };
  }
  return {
    status: 'EQUIVALENT',
    reviewedBodySha256,
    installedBodySha256: bodyHash.sha256,
  };
}

function resolveProjectEvidence({ projectEvidence, expectedRef, targetRef, errors, blockers, evidence, now }) {
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
      } else if (!evidenceIsFresh(projectEvidence.checkedAt, now, PROJECT_EVIDENCE_MAX_AGE_MS)) {
        blockers.push(`Project evidence is stale: checkedAt ${projectEvidence.checkedAt} exceeds the 15-minute verification window.`);
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
      } else if (!evidenceIsFresh(identity.checkedAt, now, PROJECT_EVIDENCE_MAX_AGE_MS)) {
        blockers.push(`Project identity evidence is stale: checkedAt ${identity.checkedAt} exceeds the 15-minute verification window.`);
      }
      if (projectEvidence.history) {
        if (
          projectEvidence.history.source !== 'supabase-management-api'
          || projectEvidence.history.method !== 'GET /v1/projects/{ref}/database/migrations'
          || !validIsoTimestamp(projectEvidence.history.checkedAt)
        ) {
          blockers.push('Remote migration history evidence is incomplete or was not fetched from the Management API history endpoint.');
        } else if (!evidenceIsFresh(projectEvidence.history.checkedAt, now, PROJECT_EVIDENCE_MAX_AGE_MS)) {
          blockers.push(`Remote migration history evidence is stale: checkedAt ${projectEvidence.history.checkedAt} exceeds the 15-minute verification window.`);
        }
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
  authorizedTestOnlyLedgerPath = 'scripts/ci/authorized-test-only-migrations.json',
  authorizedTestOnlyLedger,
  now = Date.now(),
} = {}) {
  const evidence = [];
  const errors = [];
  const blockers = [];
  const warnings = [];
  const findings = [];
  const checkedNow = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(checkedNow)) throw new Error('Verification time must be a finite timestamp.');

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
  const project = resolveProjectEvidence({ projectEvidence, expectedRef: expected, targetRef, errors, blockers, evidence, now: checkedNow });
  const { identity, identityVerified, remote, remoteHistoryAvailable } = project;
  const normalizedSchemaEvidence = normalizeSchemaEvidence(schemaEvidence, expected, errors, blockers, checkedNow);
  let versionSetEvidenceComplete = remoteHistoryAvailable;
  if (schemaEvidence?.migrationHistoryCount != null) {
    if (!Number.isInteger(schemaEvidence.migrationHistoryCount) || schemaEvidence.migrationHistoryCount < 0) {
      blockers.push('Schema evidence migrationHistoryCount must be a non-negative integer.');
      versionSetEvidenceComplete = false;
    } else if (remote?.length !== schemaEvidence.migrationHistoryCount) {
      blockers.push(`Remote migration history is incomplete for version parity: expected ${schemaEvidence.migrationHistoryCount} rows, received ${remote?.length ?? 0}.`);
      versionSetEvidenceComplete = false;
    }
  }

  const reviewed = manifestValidation.reviewedMigrations ?? [];
  const localSet = new Set(local ?? []);
  const remoteBy = new Map((remote ?? []).map((entry) => [entry.version, entry]));
  const reviewedSet = new Set(reviewed.map((m) => m.version));

  const schemaBy = new Map();
  for (const rec of normalizedSchemaEvidence.valid ? normalizedSchemaEvidence.records : []) {
    if (rec && typeof rec === 'object' && typeof rec.version === 'string' && !schemaBy.has(rec.version)) schemaBy.set(rec.version, rec);
  }

  // Load the target-scoped authorized test-only ledger. It never authorizes production drift.
  let loadedAuthorizedLedger = authorizedTestOnlyLedger ?? null;
  if (loadedAuthorizedLedger == null && authorizedTestOnlyLedgerPath && fs.existsSync(authorizedTestOnlyLedgerPath)) {
    try { loadedAuthorizedLedger = JSON.parse(fs.readFileSync(authorizedTestOnlyLedgerPath, 'utf8')); }
    catch { blockers.push('Authorized test-only migration ledger is unreadable or malformed.'); }
  }
  let normalizedAuthorizedLedger = { entries: new Map(), valid: false };
  if (loadedAuthorizedLedger?.targetProjectRef === expected) {
    if (expected !== AUTHORIZED_TEST_ONLY_PROJECT_REF) {
      blockers.push(`Authorized test-only migrations cannot authorize drift on project ${expected}.`);
    } else {
      normalizedAuthorizedLedger = normalizeAuthorizedTestOnlyLedger(loadedAuthorizedLedger, expected, blockers);
    }
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
  const authorizedTestOnly = [];
  const migrationStates = [];
  const addMigrationState = (migration, {
    state,
    provenance,
    versionParity = 'UNVERIFIED',
    schemaEquivalence = 'UNVERIFIED',
    historyMetadata = 'absent',
  }) => migrationStates.push({
    version: migration.version,
    filename: migration.filename,
    state,
    versionParity,
    schemaEquivalence,
    historyMetadata,
    provenance,
  });

  for (const migration of reviewed) {
    const v = migration.version;
    if (!local) {
      addMigrationState(migration, { state: 'UNVERIFIED', provenance: 'local-history-unavailable' });
      unverifiedReviewed.push(v);
      continue;
    }
    const inLocal = localSet.has(v);
    if (!inLocal) {
      reviewedMissingLocally.push(v);
      driftReviewed.push(v);
      if (local) errors.push(`Reviewed migration ${v} is missing from local migration history.`);
      addMigrationState(migration, { state: 'DRIFT', provenance: 'missing-from-commit-bound-local-inventory', versionParity: 'DRIFT' });
      continue;
    }
    if (!remoteHistoryAvailable) {
      addMigrationState(migration, { state: 'UNVERIFIED', provenance: 'remote-history-unavailable' });
      unverifiedReviewed.push(v);
      continue;
    }
    const remoteEntry = remoteBy.get(v);
    if (!remoteEntry) {
      reviewedMissingRemotely.push(v);
      if (inLocal) {
        reviewedPending.push(v);
        findings.push(`Reviewed migration ${v} is not present on the target Supabase migration history.`);
        addMigrationState(migration, { state: 'PENDING', provenance: 'absent', versionParity: 'PENDING', schemaEquivalence: 'NOT_APPLICABLE' });
      } else {
        addMigrationState(migration, { state: 'DRIFT', provenance: 'absent-and-missing-locally', versionParity: 'DRIFT', schemaEquivalence: 'NOT_APPLICABLE' });
      }
      continue;
    }
    recordedReviewed.push(v);
    const provenance = classifyRemoteProvenance(remoteEntry);

    if (remoteEntry.name != null && remoteEntry.name !== migration.name) {
      driftReviewed.push(v);
      appliedProvenance[v] = 'history-name-contradiction';
      errors.push(`Remote history name for ${v} does not match reviewed name ${migration.name}.`);
      addMigrationState(migration, { state: 'DRIFT', provenance: 'history-name-contradiction', versionParity: 'RECORDED', historyMetadata: provenance });
      continue;
    }

    if (remoteEntry.sqlSha256) {
      if (remoteEntry.sqlSha256 !== migration.sha256.toLowerCase()) {
        driftReviewed.push(v);
        appliedProvenance[v] = 'history-sql-hash-contradiction';
        errors.push(`Remote history SQL SHA-256 for ${v} does not match the reviewed migration.`);
        addMigrationState(migration, { state: 'DRIFT', provenance: 'history-sql-hash-contradiction', versionParity: 'RECORDED', historyMetadata: provenance });
        continue;
      }
    }

    if (provenance !== 'statements-present-unhashed') {
      historyMetadataIncomplete.push({
        version: v,
        provenance,
        namePresent: remoteEntry.name != null,
        statementsPresent: remoteEntry.statementsPresent,
        reviewedName: migration.name,
      });
    }
    const rec = schemaBy.get(v);
    if (!rec) {
      appliedProvenance[v] = `${provenance}-unverified`;
      unverifiedReviewed.push(v);
      blockers.push(`Schema unverified for reviewed migration ${v}: remote history records ${provenance.replace(/-/g, ' ')}; history alone does not prove the current function body.`);
      addMigrationState(migration, { state: 'UNVERIFIED', provenance: `${provenance}-unverified`, versionParity: 'RECORDED', historyMetadata: provenance });
      continue;
    }
    if (rec.projectRef && expected && rec.projectRef !== expected) {
      appliedProvenance[v] = 'schema-evidence-target-unverified';
      unverifiedReviewed.push(v);
      blockers.push(`Schema evidence for ${v} does not match the target project ${expected}.`);
      addMigrationState(migration, { state: 'UNVERIFIED', provenance: 'schema-evidence-target-unverified', versionParity: 'RECORDED', historyMetadata: provenance });
      continue;
    }
    if (typeof rec.reviewedFileSha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(rec.reviewedFileSha256)) {
      appliedProvenance[v] = `${provenance}-evidence-incomplete`;
      unverifiedReviewed.push(v);
      blockers.push(`Schema evidence for ${v} requires a valid reviewedFileSha256.`);
      addMigrationState(migration, { state: 'UNVERIFIED', provenance: `${provenance}-evidence-incomplete`, versionParity: 'RECORDED', historyMetadata: provenance });
      continue;
    }
    if (rec.reviewedFileSha256.toLowerCase() !== migration.sha256.toLowerCase()) {
      appliedProvenance[v] = 'schema-evidence-review-input-unverified';
      unverifiedReviewed.push(v);
      blockers.push(`Schema evidence for ${v} does not match the reviewed SQL SHA-256.`);
      addMigrationState(migration, { state: 'UNVERIFIED', provenance: 'schema-evidence-review-input-unverified', versionParity: 'RECORDED', historyMetadata: provenance });
      continue;
    }
    const functionComparison = compareReviewedFunctionEvidence({ record: rec, migration, manifest, readFile });
    if (functionComparison.status === 'DIFFERENT') {
      appliedProvenance[v] = 'normalized-function-body-or-contract-different';
      driftReviewed.push(v);
      errors.push(functionComparison.message);
      addMigrationState(migration, { state: 'DRIFT', provenance: 'normalized-function-body-or-contract-different', versionParity: 'RECORDED', schemaEquivalence: 'DIFFERENT', historyMetadata: provenance });
      continue;
    }
    if (functionComparison.status !== 'EQUIVALENT' || !rec.method || !validIsoTimestamp(rec.checkedAt)) {
      appliedProvenance[v] = `${provenance}-evidence-incomplete`;
      unverifiedReviewed.push(v);
      blockers.push(functionComparison.message || `Schema evidence for ${v} is incomplete.`);
      addMigrationState(migration, { state: 'UNVERIFIED', provenance: `${provenance}-evidence-incomplete`, versionParity: 'RECORDED', historyMetadata: provenance });
      continue;
    }
    alreadyAppliedReviewed.push(v);
    appliedProvenance[v] = 'normalized-function-body-hash-verified';
    addMigrationState(migration, { state: 'APPLIED', provenance: 'normalized-function-body-hash-verified', versionParity: 'RECORDED', schemaEquivalence: 'EQUIVALENT', historyMetadata: provenance });
    if (provenance !== 'sql-hash-recorded' && provenance !== 'statements-present-unhashed') {
      warnings.push(`Reviewed migration ${v} has incomplete remote history metadata (${provenance.replace(/-/g, ' ')}); recorded as body-hash-verified via reviewed read-only evidence (${rec.method}, ${rec.checkedAt}), not as a missing migration.`);
    }
  }

  // Unexplained drift: remote contains history the repo does not (schema changed outside reviewed files).
  const unreleasedLocal = [];
  const unusedAuthorizedTestOnly = [];
  const observedAuthorizedTestOnly = new Set();
  if (local && remoteHistoryAvailable) {
    for (const entry of remote) {
      if (!localSet.has(entry.version)) {
        const authorization = normalizedAuthorizedLedger.valid
          ? normalizedAuthorizedLedger.entries.get(entry.version)
          : null;
        if (authorization && entry.name === authorization.name) {
          authorizedTestOnly.push(entry.version);
          observedAuthorizedTestOnly.add(entry.version);
          evidence.push(`Remote migration ${entry.version} is explicitly authorized test-only on ${expected}; excluded from release drift.`);
        } else {
          unexplainedRemoteDrift.push(entry.version);
          if (authorization && entry.name !== authorization.name) {
            errors.push(`Remote migration ${entry.version} does not match its authorized ledger name.`);
          }
        }
      }
    }
    if (normalizedAuthorizedLedger.valid) {
      for (const version of normalizedAuthorizedLedger.entries.keys()) {
        if (!observedAuthorizedTestOnly.has(version)) unusedAuthorizedTestOnly.push(version);
      }
      for (const version of unusedAuthorizedTestOnly) {
        errors.push(`Authorized test-only migration ${version} is absent from the target's actual remote-only set.`);
      }
    }
    for (const v of (local ?? [])) {
      if (!remoteBy.has(v) && !reviewedSet.has(v)) {
        if (manifestValidation.noMigrationChange) {
          unexplainedLocalDrift.push(v);
          errors.push(`No-migration manifest does not account for local migration ${v}, which is absent from the target history.`);
        } else {
          unreleasedLocal.push(v);
          findings.push(`Local migration ${v} is not on the target and is not in the reviewed manifest; release parity remains PENDING until it is explicitly reviewed or allowed.`);
        }
      }
    }
  }

  for (const v of unexplainedRemoteDrift) errors.push(`Remote migration ${v} exists on target but is missing locally/review manifest.`);

  const manifestUnverified = !manifestValidation.ok;
  const knownDrift = unexplainedRemoteDrift.length > 0 || unexplainedLocalDrift.length > 0 || unusedAuthorizedTestOnly.length > 0 || driftReviewed.length > 0 || reviewedMissingLocally.length > 0;
  const unverified = manifestUnverified || errors.length > 0 || blockers.length > 0 || !identityVerified || !remoteHistoryAvailable || unverifiedReviewed.length > 0;
  const pending = reviewedPending.length > 0 || unreleasedLocal.length > 0;
  const status = manifestUnverified ? 'UNVERIFIED' : (knownDrift ? 'DRIFT' : (unverified ? 'UNVERIFIED' : (pending ? 'PENDING' : 'APPLIED')));
  const versionParityStatus = !local || !remoteHistoryAvailable || !identityVerified || !versionSetEvidenceComplete
    ? 'UNVERIFIED'
    : (unexplainedRemoteDrift.length > 0 || unexplainedLocalDrift.length > 0 || unusedAuthorizedTestOnly.length > 0 || reviewedMissingLocally.length > 0
      ? 'DRIFT'
      : (reviewedPending.length > 0 || unreleasedLocal.length > 0 ? 'PENDING' : 'APPLIED'));
  const schemaStates = migrationStates.map((stateEntry) => stateEntry.schemaEquivalence);
  const schemaEquivalenceStatus = schemaStates.includes('DIFFERENT')
    ? 'DIFFERENT'
    : (reviewed.length === 0 ? 'NOT_APPLICABLE' : (schemaStates.length === reviewed.length && schemaStates.every((value) => value === 'EQUIVALENT') ? 'EQUIVALENT' : 'UNVERIFIED'));
  const historyMetadataStatus = !remoteHistoryAvailable
    ? 'UNVERIFIED'
    : (historyMetadataIncomplete.length > 0 ? 'INCOMPLETE' : 'COMPLETE');

  return {
    schema: HISTORY_SCHEMA,
    checkedAt: new Date(checkedNow).toISOString(),
    status,
    classification: status,
    versionParityStatus,
    schemaEquivalenceStatus,
    historyMetadataStatus,
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
    remoteEntries: remote ? remote.map((entry) => ({
      version: entry.version,
      namePresent: entry.name != null,
      statementsPresent: entry.statementsPresent,
      sqlSha256Present: entry.sqlSha256 != null,
    })) : null,
    remoteHistoryAvailable,
    versionSetEvidenceComplete,
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
    authorizedTestOnly,
    unusedAuthorizedTestOnly,
    unreleasedLocal,
    evidence,
    warnings,
    findings,
    blockers,
    errors,
  };
}

export async function verifyLiveProjectMigrationHistory({
  manifest,
  commitSha,
  expectedRef,
  localVersions,
  accessToken,
  schemaEvidence,
  readFile = fs.readFileSync,
  authorizedTestOnlyLedgerPath = 'scripts/ci/authorized-test-only-migrations.json',
  authorizedTestOnlyLedger,
  now = Date.now(),
  collectEvidence = collectProjectMigrationEvidence,
  collectFunctionEvidence = collectProjectFunctionEvidence,
  readLocalVersions,
} = {}) {
  if (!accessToken) throw new Error('Supabase access token is required for live project verification.');
  const projectEvidence = await collectEvidence({ projectRef: expectedRef, accessToken });
  const commitBoundLocalVersions = normalizeVersions(readLocalVersions
    ? readLocalVersions(commitSha)
    : createGitCommitMigrationVersionReader(commitSha)(), 'Commit-bound local');
  if (localVersions != null) {
    const suppliedLocalVersions = normalizeVersions(localVersions, 'Supplied local');
    if (JSON.stringify(suppliedLocalVersions) !== JSON.stringify(commitBoundLocalVersions)) {
      throw new Error('Supplied local migration inventory does not match the reviewed Git commit.');
    }
  }
  let liveSchemaEvidence;
  const migrations = manifest?.migrations ?? [];
  const requiredContracts = manifest?.requiredRpcContracts ?? [];
  if (migrations.length > 0 || requiredContracts.length > 0) {
    if (migrations.length !== 1 || requiredContracts.length !== 1) {
      throw new Error('Live schema verification currently requires exactly one reviewed migration and one required RPC contract.');
    }
    const observation = await collectFunctionEvidence({
      projectRef: expectedRef,
      accessToken,
      functionContract: requiredContracts[0],
    });
    const { body, identityArgs: _identityArgs, ...installedContract } = observation.function;
    liveSchemaEvidence = {
      schema: SCHEMA_EVIDENCE_SCHEMA,
      projectRef: expectedRef,
      method: observation.method,
      checkedAt: observation.checkedAt,
      migrationHistoryCount: projectEvidence.history.rows.length,
      records: [{
        version: migrations[0].version,
        reviewedFileSha256: migrations[0].sha256,
        projectRef: expectedRef,
        function: installedContract,
        bodyHash: {
          algorithm: PLPGSQL_BODY_HASH_ALGORITHM,
          source: 'pg_proc.prosrc',
          sha256: hashPlpgsqlFunctionBody(body),
        },
        method: observation.method,
        checkedAt: observation.checkedAt,
      }],
    };
    if (schemaEvidence != null) {
      const supplied = schemaEvidence.records?.find((record) => record?.version === migrations[0].version);
      const live = liveSchemaEvidence.records[0];
      if (
        schemaEvidence.projectRef !== expectedRef
        || supplied?.bodyHash?.algorithm !== live.bodyHash.algorithm
        || supplied?.bodyHash?.sha256 !== live.bodyHash.sha256
        || !functionContractsEquivalent(supplied?.function, live.function)
      ) {
        throw new Error('Persisted schema evidence does not match fresh read-only function catalog evidence.');
      }
    }
  }
  return verifyReleaseMigrationHistory({
    manifest,
    commitSha,
    expectedRef,
    localVersions: commitBoundLocalVersions,
    projectEvidence,
    schemaEvidence: liveSchemaEvidence,
    readFile,
    authorizedTestOnlyLedgerPath,
    authorizedTestOnlyLedger,
    now,
  });
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
      if (typeof found.definition !== 'string' || !found.definition.trim()) errors.push(`RPC ${req.schema}.${req.name} missing required evidence field: definition.`);
      if (typeof found.owner !== 'string' || !found.owner.trim()) errors.push(`RPC ${req.schema}.${req.name} missing required evidence field: owner.`);
      if (typeof found.searchPath !== 'string') errors.push(`RPC ${req.schema}.${req.name} missing required evidence field: searchPath.`);
      if (!Array.isArray(found.grants) || found.grants.length === 0) errors.push(`RPC ${req.schema}.${req.name} missing required evidence field: grants.`);
      for (const field of ['resultType', 'language', 'volatility', 'owner']) {
        if (req[field] != null && normalizeContractText(req[field]) !== normalizeContractText(found[field])) {
          errors.push(`RPC ${req.schema}.${req.name} ${field} mismatch.`);
        }
      }
      for (const field of ['securityDefiner', 'searchPath']) {
        if (req[field] != null && req[field] !== found[field]) errors.push(`RPC ${req.schema}.${req.name} ${field} mismatch.`);
      }
      if (req.grants && JSON.stringify(normalizeExecuteGrants(req.grants, req.owner)) !== JSON.stringify(normalizeExecuteGrants(found.grants, found.owner))) {
        errors.push(`RPC ${req.schema}.${req.name} grants mismatch.`);
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

export function schemaEvidenceFromArgs(argv, readJsonFile = readJson) {
  const file = argValue(argv, '--schema-evidence');
  return file ? readJsonFile(file) : undefined;
}

function commitBoundLocalVersions(argv, commitSha) {
  const localVersions = createGitCommitMigrationVersionReader(commitSha)();
  const suppliedFile = argValue(argv, '--local-versions');
  if (suppliedFile) {
    const supplied = normalizeVersions(readJson(suppliedFile), 'Supplied local');
    if (JSON.stringify(supplied) !== JSON.stringify(localVersions)) {
      throw new Error('Supplied local migration inventory does not match the reviewed Git commit.');
    }
  }
  return localVersions;
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
    const readFile = createGitCommitFileReader(commitSha);
    const manifest = buildMigrationManifest({ commitSha, migrations, requiredRpcContracts, noMigrationChange, reason, readFile });
    writeJson(out, manifest);
    console.log(`Wrote migration manifest for ${manifest.commitSha} to ${out}`);
    return;
  }

  if (command === 'verify-history') {
    const manifest = readJson(requiredArg(argv, '--manifest'));
    const expectedCommit = requiredArg(argv, '--expected-commit');
    const expectedRef = requiredArg(argv, '--expected-ref');
    const schemaEvidence = schemaEvidenceFromArgs(argv);
    const localVersions = commitBoundLocalVersions(argv, expectedCommit);
    const accessTokenEnv = argValue(argv, '--access-token-env') || 'SUPABASE_ACCESS_TOKEN';
    const accessToken = process.env[accessTokenEnv];
    const out = argValue(argv, '--out');
    const readFile = createGitCommitFileReader(expectedCommit);
    const result = await verifyLiveProjectMigrationHistory({
      manifest,
      commitSha: expectedCommit,
      expectedRef,
      localVersions,
      accessToken,
      schemaEvidence,
      readFile,
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
    const schemaEvidence = schemaEvidenceFromArgs(argv);
    const localVersions = commitBoundLocalVersions(argv, commitSha);
    const accessTokenEnv = argValue(argv, '--access-token-env') || 'SUPABASE_ACCESS_TOKEN';
    const accessToken = process.env[accessTokenEnv];
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

    const readFile = createGitCommitFileReader(commitSha);
    const remoteValidation = await verifyLiveProjectMigrationHistory({
      manifest,
      commitSha,
      expectedRef,
      localVersions,
      accessToken,
      schemaEvidence,
      readFile,
    });
    const result = evaluateReleaseGate({
      manifestValidation: validateManifestAgainstFiles(manifest, { commitSha, readFile }),
      remoteValidation,
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
