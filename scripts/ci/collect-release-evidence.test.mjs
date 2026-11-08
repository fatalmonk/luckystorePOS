import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectProjectFunctionEvidence,
  collectProjectMigrationEvidence,
  normalizeMigrationHistoryRows,
  projectHistoryOutputForMode,
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

test('remote-versions preserves its version-only output contract', () => {
  const evidence = {
    history: {
      rows: [
        { version: '20261106000000', name: 'prior_release', statementsPresent: true },
        { version: '20261107230000', name: 'add_storefront_prefix_resolver', statementsPresent: true },
      ],
    },
  };

  assert.deepEqual(projectHistoryOutputForMode('remote-versions', evidence), [
    '20261106000000',
    '20261107230000',
  ]);
  assert.equal(projectHistoryOutputForMode('project-history', evidence), evidence);
});

test('collectProjectFunctionEvidence uses the Management API read-only query endpoint', async () => {
  const calls = [];
  const contract = { schema: 'public', name: 'resolve_storefront_item_prefix_v1', argTypes: ['uuid', 'text'] };
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return jsonResponse([{
      identity_args: 'p_store_id uuid, p_prefix text',
      body: '\nBEGIN\n  RETURN;\nEND;\n',
      result_type: 'TABLE(item_id uuid)',
      language: 'plpgsql',
      volatility: 'stable',
      security_definer: true,
      owner: 'postgres',
      search_path: '',
      grants: ['postgres EXECUTE', 'anon EXECUTE', 'authenticated EXECUTE', 'service_role EXECUTE'],
    }]);
  };

  const result = await collectProjectFunctionEvidence({
    projectRef: TEST_REF,
    accessToken: 'test-token',
    functionContract: contract,
    fetchImpl,
    now: () => new Date('2026-11-08T21:45:29Z'),
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `https://api.supabase.com/v1/projects/${TEST_REF}/database/query/read-only`);
  assert.equal(calls[0].init.method, 'POST');
  const query = JSON.parse(calls[0].init.body).query;
  assert.match(query, /^select\b/i);
  assert.match(query, /pg_catalog\.aclexplode/);
  assert.match(query, /p\.oid = pg_catalog\.to_regprocedure/);
  assert.doesNotMatch(query, /information_schema\.routine_privileges/);
  assert.equal(result.function.name, contract.name);
  assert.equal(result.function.body, '\nBEGIN\n  RETURN;\nEND;\n');
  assert.equal(result.method, 'POST /v1/projects/{ref}/database/query/read-only');
});
