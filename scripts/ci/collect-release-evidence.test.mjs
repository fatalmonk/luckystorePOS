import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectProjectMigrationEvidence,
  normalizeMigrationHistoryRows,
  PROJECT_HISTORY_EVIDENCE_SCHEMA,
} from './collect-release-evidence.mjs';

const TEST_REF = 'grxxenvdhfwzafzyykgo';

function jsonResponse(value, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => value,
  };
}

test('collectProjectMigrationEvidence independently fetches project identity before migration history', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url.endsWith(`/projects/${TEST_REF}`)) {
      return jsonResponse({ ref: TEST_REF, status: 'ACTIVE_HEALTHY' });
    }
    if (url.endsWith(`/projects/${TEST_REF}/database/migrations`)) {
      return jsonResponse([
        { version: '20261107230000' },
        { version: '20261106000000', name: 'prior_release' },
      ]);
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const result = await collectProjectMigrationEvidence({
    projectRef: TEST_REF,
    accessToken: 'test-token',
    fetchImpl,
    now: () => new Date('2026-11-08T20:00:00Z'),
  });

  assert.equal(result.schema, PROJECT_HISTORY_EVIDENCE_SCHEMA);
  assert.equal(result.identity.projectRef, TEST_REF);
  assert.equal(result.identity.status, 'ACTIVE_HEALTHY');
  assert.equal(result.history.projectRef, TEST_REF);
  assert.deepEqual(result.history.rows, [
    { version: '20261106000000', name: 'prior_release', statementsPresent: null },
    { version: '20261107230000', name: null, statementsPresent: null },
  ]);
  assert.deepEqual(calls, [
    `https://api.supabase.com/v1/projects/${TEST_REF}`,
    `https://api.supabase.com/v1/projects/${TEST_REF}/database/migrations`,
  ]);
});

test('collectProjectMigrationEvidence rejects an API identity that differs from the requested target', async () => {
  const fetchImpl = async () => jsonResponse({ ref: 'hvmyxyccfnkrbxqbhlnm', status: 'ACTIVE_HEALTHY' });
  await assert.rejects(
    collectProjectMigrationEvidence({ projectRef: TEST_REF, accessToken: 'test-token', fetchImpl }),
    /returned project .* expected grxxenvdhfwzafzyykgo/i,
  );
});

test('collectProjectMigrationEvidence rejects incomplete or failed remote evidence', async () => {
  await assert.rejects(
    collectProjectMigrationEvidence({ projectRef: TEST_REF, accessToken: '', fetchImpl: async () => jsonResponse({}) }),
    /access token/i,
  );
  const fetchImpl = async (url) => url.endsWith('/database/migrations')
    ? jsonResponse({ message: 'unavailable' }, 503)
    : jsonResponse({ ref: TEST_REF, status: 'ACTIVE_HEALTHY' });
  await assert.rejects(
    collectProjectMigrationEvidence({ projectRef: TEST_REF, accessToken: 'test-token', fetchImpl }),
    /migration history.*HTTP 503/i,
  );
});

test('normalizeMigrationHistoryRows rejects conflicting duplicates without echoing statement content', () => {
  assert.throws(
    () => normalizeMigrationHistoryRows([
      { version: '20261107230000', name: 'first', statements: ['sensitive-marker'] },
      { version: '20261107230000', name: 'second', statements: ['different-marker'] },
    ]),
    (error) => /conflicting names/i.test(error.message)
      && !error.message.includes('sensitive-marker')
      && !error.message.includes('different-marker'),
  );
  assert.throws(
    () => normalizeMigrationHistoryRows([{ version: 'invalid', statements: ['sensitive-marker'] }]),
    (error) => /invalid version entry/i.test(error.message) && !error.message.includes('sensitive-marker'),
  );
});
