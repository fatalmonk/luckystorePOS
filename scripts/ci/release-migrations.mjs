#!/usr/bin/env node
/**
 * E6-R: Reviewed migration and release parity gates.
 *
 * Pure validation helpers are exported for testing; CLI modes:
 *   node scripts/ci/release-migrations.mjs manifest --commit <sha> --migrations <csv> --out <file>
 *   node scripts/ci/release-migrations.mjs check --manifest <file> --commit <sha> --target-ref <ref> --expected-ref <ref> --local-versions <file> --remote-versions <file>
 *   node scripts/ci/release-migrations.mjs verify-provenance --expected-sha <sha> --health-url <url>
 *
 * Never applies migrations. Apply is a separate, explicitly invoked path that
 * requires check mode to pass first and must target a verified project.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

export function buildMigrationManifest({ commitSha, migrations, requiredRpcContracts = [], readFile = fs.readFileSync }) {
  if (!commitSha || !/^[0-9a-f]{40}$/i.test(commitSha)) {
    throw new Error(`Invalid commit SHA: ${commitSha ?? '(missing)'}`);
  }
  const entries = (migrations ?? []).map((migration) => {
    if (!migration.version || !migration.name || !migration.path) {
      throw new Error(`Migration entry requires version, name, and path: ${JSON.stringify(migration)}`);
    }
    const sql = readFile(migration.path, 'utf8');
    return {
      version: migration.version,
      name: migration.name,
      path: migration.path,
      sha256: sha256(sql),
    };
  });
  return {
    schema: 'luckystore.release-migrations/v1',
    generatedAt: new Date().toISOString(),
    commitSha,
    migrations: entries,
    requiredRpcContracts,
  };
}

export function validateManifestAgainstFiles(manifest, { commitSha, readFile = fs.readFileSync } = {}) {
  const errors = [];
  if (!manifest || manifest.schema !== 'luckystore.release-migrations/v1') {
    errors.push('Manifest schema is missing or unsupported.');
    return { ok: false, errors };
  }
  if (!commitSha) {
    errors.push('Expected commit SHA is required; manifest validation cannot be unbound from the reviewed commit.');
  } else if (manifest.commitSha !== commitSha) {
    errors.push(`Manifest commit ${manifest.commitSha} does not match expected commit ${commitSha}.`);
  }
  for (const migration of manifest.migrations ?? []) {
    let sql;
    try {
      sql = readFile(migration.path, 'utf8');
    } catch (error) {
      errors.push(`Reviewed migration file missing: ${migration.path} (${error.message})`);
      continue;
    }
    const digest = sha256(sql);
    if (digest !== migration.sha256) {
      errors.push(
        `Reviewed SQL changed for ${migration.version}_${migration.name}: expected ${migration.sha256}, got ${digest}.`
      );
    }
  }
  return { ok: errors.length === 0, errors };
}

function normalizeVersions(input, label) {
  if (input == null) throw new Error(`${label} migration history is required.`);
  if (!Array.isArray(input)) throw new Error(`${label} migration history must be a JSON array of versions or {version} objects.`);
  return input.map((v) => {
    if (typeof v === 'string' && /^\d{14}$/.test(v)) return v;
    if (v && typeof v === 'object' && typeof v.version === 'string' && /^\d{14}$/.test(v.version)) return v.version;
    throw new Error(`${label} migration history entry is invalid: ${JSON.stringify(v)}`);
  });
}

export function validateRemoteMigrationState({
  targetRef,
  expectedRef,
  manifest,
  localVersions,
  remoteVersions,
}) {
  const errors = [];
  if (!targetRef || !expectedRef) {
    errors.push('Target project ref and expected project ref are required.');
  } else if (String(targetRef).trim() !== String(expectedRef).trim()) {
    errors.push(`Target project ref is unverified; expected ${expectedRef}, got ${targetRef}.`);
  }
  let local = [];
  let remote = [];
  let historyParseFailed = false;
  try { local = normalizeVersions(localVersions, 'Local'); } catch (e) { errors.push(e.message); historyParseFailed = true; }
  try { remote = normalizeVersions(remoteVersions, 'Remote'); } catch (e) { errors.push(e.message); historyParseFailed = true; }
  if (historyParseFailed) return { ok: false, errors, targetRef, expectedRef };

  const localSet = new Set(local);
  const remoteSet = new Set(remote);

  for (const migration of manifest?.migrations ?? []) {
    if (!localSet.has(migration.version)) {
      errors.push(`Reviewed migration ${migration.version} is missing from local migration history.`);
    }
    if (!remoteSet.has(migration.version)) {
      errors.push(`Reviewed migration ${migration.version} is not present on the target; apply/verify it before promotion.`);
    }
  }
  // Remote-only migrations are schema drift: fail closed because parity is unknown.
  for (const version of remoteSet) {
    if (!localSet.has(version)) {
      errors.push(`Remote migration ${version} is missing locally; schema history parity is unknown.`);
    }
  }
  return { ok: errors.length === 0, errors, targetRef, expectedRef, localCount: local.length, remoteCount: remote.length };
}

function normalizeEvidence(value, label) {
  if (value == null) throw new Error(`${label} evidence is required (true/false).`);
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
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
  let testsOk = false;
  try { testsOk = normalizeEvidence(testValidationPassed, 'Test validation'); } catch (e) { errors.push(e.message); }
  if (!testsOk) {
    errors.push('Test validation must pass before migration/release promotion.');
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

async function main(argv = process.argv.slice(2)) {
  const [command] = argv;
  if (command === 'manifest') {
    const commitSha = requiredArg(argv, '--commit');
    const migrationsArg = requiredArg(argv, '--migrations');
    const out = requiredArg(argv, '--out');
    const rpcsArg = argValue(argv, '--rpcs');
    const migrations = migrationsArg.split(',').filter(Boolean).map((entry) => {
      const [version, name, file] = entry.split(':');
      return { version, name, path: file };
    });
    const requiredRpcContracts = rpcsArg ? readJson(rpcsArg) : [];
    const manifest = buildMigrationManifest({ commitSha, migrations, requiredRpcContracts });
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Wrote migration manifest for ${commitSha} to ${out}`);
    return;
  }

  if (command === 'check') {
    const manifest = readJson(requiredArg(argv, '--manifest'));
    const commitSha = requiredArg(argv, '--commit');
    const targetRef = requiredArg(argv, '--target-ref');
    const expectedRef = requiredArg(argv, '--expected-ref');
    const localVersions = readJson(requiredArg(argv, '--local-versions'));
    const remoteVersions = readJson(requiredArg(argv, '--remote-versions'));
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
      remoteValidation: validateRemoteMigrationState({ targetRef, expectedRef, manifest, localVersions, remoteVersions }),
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

  throw new Error(`Unsupported command: ${command ?? '(missing)'}. Use manifest, check, or verify-provenance.`);
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isCli) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
