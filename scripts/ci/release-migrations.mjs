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
    schema: 'luckystore.release-migration-manifest.v1',
    commitSha,
    migrations: entries,
    requiredRpcContracts: requiredRpcContracts.map((rpc) => ({
      schema: rpc.schema ?? 'public',
      name: rpc.name,
      argTypes: Array.isArray(rpc.argTypes) ? rpc.argTypes : [],
    })),
  };
}

export function validateManifestAgainstFiles(manifest, { reviewedCommitSha, readFile = fs.readFileSync } = {}) {
  const errors = [];
  if (!manifest?.commitSha) errors.push('Manifest is missing commitSha.');
  if (reviewedCommitSha && manifest?.commitSha !== reviewedCommitSha) {
    errors.push(`Manifest reviewed commit SHA ${manifest?.commitSha} does not match expected reviewed commit ${reviewedCommitSha}.`);
  }
  for (const migration of manifest?.migrations ?? []) {
    let actual;
    try {
      actual = sha256(readFile(migration.path, 'utf8'));
    } catch (err) {
      errors.push(`Cannot read migration ${migration.version} (${migration.path}): ${err.message}`);
      continue;
    }
    if (actual !== migration.sha256) {
      errors.push(`Migration SQL hash mismatch for ${migration.version} ${migration.name}: expected ${migration.sha256}, got ${actual}.`);
    }
  }
  return { ok: errors.length === 0, errors };
}

function toVersionSet(values) {
  return new Set((values ?? []).filter(Boolean).map(String));
}

export function validateRemoteMigrationState({ manifest, target, localMigrationVersions, remoteMigrationVersions, pendingVersions }) {
  const errors = [];
  const expectedRef = target?.expectedProjectRef;
  const actualRef = target?.actualProjectRef;
  if (expectedRef && actualRef && expectedRef !== actualRef) {
    errors.push(`Target project mismatch: expected ${expectedRef}, got ${actualRef}.`);
  }
  if (expectedRef && !actualRef) {
    errors.push(`Target project ref is unverified; expected ${expectedRef}.`);
  }

  const local = toVersionSet(localMigrationVersions);
  const remote = toVersionSet(remoteMigrationVersions);
  const manifestVersions = toVersionSet((manifest?.migrations ?? []).map((m) => m.version));
  const pending = (pendingVersions ?? []).map(String).filter(Boolean);

  for (const version of remote) {
    if (!local.has(version)) errors.push(`Remote-only migration history version ${version} is not present locally; drift is unexplained.`);
  }
  for (const version of manifestVersions) {
    if (local.size > 0 && !local.has(version)) {
      errors.push(`Manifest migration ${version} is missing from local migration history.`);
    }
  }
  for (const version of pending) {
    if (!manifestVersions.has(version)) {
      errors.push(`Pending migration ${version} is unreviewed: not present in the reviewed manifest.`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function verifyArtifactProvenance({ expectedSha, healthResponse }) {
  const errors = [];
  if (!expectedSha) errors.push('Expected build SHA is required for artifact provenance verification.');
  const actualSha = healthResponse?.buildSha ?? healthResponse?.commitSha ?? healthResponse?.sha ?? null;
  if (!actualSha) {
    errors.push('Health/provenance response does not expose a build SHA; cannot verify deployed artifact matches reviewed commit.');
  } else if (String(actualSha) !== String(expectedSha)) {
    errors.push(`Deployed build SHA ${actualSha} does not match expected reviewed commit ${expectedSha}.`);
  }
  return { ok: errors.length === 0, errors, actualSha };
}

export function evaluateReleaseGate({
  mode = 'check',
  environment = 'test',
  targetVerified,
  manifestValid,
  remoteStateValid,
  testValidationPassed,
  rpcContractsValid,
  artifactProvenanceValid,
}) {
  const errors = [];
  if (!targetVerified) errors.push('Target project/environment is not verified.');
  if (!manifestValid) errors.push('Reviewed migration manifest is invalid or does not match local files.');
  if (!remoteStateValid) errors.push('Remote migration state is not verified against the reviewed manifest.');
  if (mode === 'promote' && !testValidationPassed) errors.push('Test validation did not pass; production promotion is blocked.');
  if (!rpcContractsValid) errors.push('Required RPC contracts/grants/owner/search_path checks are not satisfied.');
  if (environment === 'production' && mode === 'promote' && !artifactProvenanceValid) {
    errors.push('Artifact provenance/SHA verification failed; production app promotion is blocked.');
  }
  return { ok: errors.length === 0, errors };
}

function requestJson(url, { timeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.request(parsed, {
      method: 'GET',
      headers: { 'User-Agent': 'LuckyStore-ReleaseMigrations/1.0' },
      timeout: timeoutMs,
      rejectUnauthorized: true,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error(`Request timed out: ${url}`)); });
    req.on('error', reject);
    req.end();
  });
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) args[key] = true;
      else { args[key] = next; i++; }
    } else args._.push(arg);
  }
  return args;
}

async function cli() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args._[0] || 'check';
  if (mode === 'manifest') {
    const migrations = (args.migrations || '').split(',').filter(Boolean).map((entry) => {
      const [version, name, filePath] = entry.split(':');
      return { version, name, path: filePath };
    });
    const manifest = buildMigrationManifest({
      commitSha: args.commit,
      migrations,
      requiredRpcContracts: args.rpcs ? JSON.parse(args.rpcs) : [],
    });
    const out = args.out;
    const json = JSON.stringify(manifest, null, 2);
    if (out) fs.writeFileSync(out, `${json}\n`);
    else process.stdout.write(`${json}\n`);
    return;
  }
  if (mode === 'verify-provenance') {
    const res = await requestJson(args['health-url']);
    if (res.status !== 200) {
      console.error(`Health request failed: HTTP ${res.status}`);
      process.exit(1);
    }
    const result = verifyArtifactProvenance({ expectedSha: args['expected-sha'], healthResponse: res.body });
    if (!result.ok) {
      for (const err of result.errors) console.error(err);
      process.exit(1);
    }
    console.log(`Artifact provenance verified: ${result.actualSha}`);
    return;
  }
  if (mode === 'check') {
    const manifestPath = args.manifest;
    if (!manifestPath) throw new Error('--manifest is required for check mode');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const localResult = validateManifestAgainstFiles(manifest, { reviewedCommitSha: args.commit });
    const localVersions = args['local-versions'] ? JSON.parse(fs.readFileSync(args['local-versions'], 'utf8')) : [];
    const remoteVersions = args['remote-versions'] ? JSON.parse(fs.readFileSync(args['remote-versions'], 'utf8')) : [];
    const pendingVersions = args['pending-versions'] ? JSON.parse(fs.readFileSync(args['pending-versions'], 'utf8')) : [];
    const remoteResult = validateRemoteMigrationState({
      manifest,
      target: { expectedProjectRef: args['expected-ref'], actualProjectRef: args['target-ref'] },
      localMigrationVersions: localVersions,
      remoteMigrationVersions: remoteVersions,
      pendingVersions,
    });
    const gate = evaluateReleaseGate({
      mode: args['gate-mode'] || 'check',
      environment: args.environment || 'test',
      targetVerified: Boolean(args['target-ref'] && args['expected-ref'] && args['target-ref'] === args['expected-ref']),
      manifestValid: localResult.ok,
      remoteStateValid: remoteResult.ok,
      testValidationPassed: args['test-validation'] === 'true',
      rpcContractsValid: args['rpc-contracts'] === 'true',
      artifactProvenanceValid: args['artifact-provenance'] === 'true',
    });
    const errors = [...localResult.errors, ...remoteResult.errors, ...gate.errors];
    if (errors.length) {
      for (const err of errors) console.error(err);
      process.exit(1);
    }
    console.log('Release migration gate checks passed.');
    return;
  }
  console.error(`Unknown mode: ${mode}`);
  process.exit(2);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  cli().catch((err) => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
}
