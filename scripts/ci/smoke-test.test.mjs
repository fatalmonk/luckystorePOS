import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateSmokeHealth } from './smoke-test.mjs';

const SHA_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const SHA_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

test('evaluateSmokeHealth requires matching build SHA when expected SHA is provided', () => {
  const result = evaluateSmokeHealth({
    statusCode: 200,
    body: JSON.stringify({ status: 'ok', service: 'customer-storefront', buildSha: SHA_A, timestamp: new Date().toISOString() }),
    expectedSha: SHA_B,
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /build SHA/i);
});

test('evaluateSmokeHealth fails when expected SHA is provided but health omits build SHA', () => {
  const result = evaluateSmokeHealth({
    statusCode: 200,
    body: JSON.stringify({ status: 'ok', service: 'customer-storefront', timestamp: new Date().toISOString() }),
    expectedSha: SHA_A,
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /build SHA/i);
});

test('evaluateSmokeHealth accepts matching build SHA and recent timestamp', () => {
  const now = Date.parse('2026-11-08T12:00:00.000Z');
  const result = evaluateSmokeHealth({
    statusCode: 200,
    body: JSON.stringify({ status: 'ok', service: 'customer-storefront', buildSha: SHA_A, timestamp: '2026-11-08T12:00:00.000Z' }),
    expectedSha: SHA_A,
    now,
  });
  assert.equal(result.ok, true);
});

test('evaluateSmokeHealth fails on missing timestamp when required', () => {
  const result = evaluateSmokeHealth({
    statusCode: 200,
    body: JSON.stringify({ status: 'ok', service: 'customer-storefront', buildSha: SHA_A }),
    expectedSha: SHA_A,
    requireTimestamp: true,
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /timestamp/i);
});

test('evaluateSmokeHealth fails on malformed timestamp', () => {
  const result = evaluateSmokeHealth({
    statusCode: 200,
    body: JSON.stringify({ status: 'ok', service: 'customer-storefront', buildSha: SHA_A, timestamp: 'not-a-date' }),
    expectedSha: SHA_A,
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /parseable timestamp/i);
});

test('evaluateSmokeHealth fails on stale timestamp', () => {
  const now = Date.parse('2026-11-08T12:10:00.000Z');
  const result = evaluateSmokeHealth({
    statusCode: 200,
    body: JSON.stringify({ status: 'ok', service: 'customer-storefront', buildSha: SHA_A, timestamp: '2026-11-08T12:00:00.000Z' }),
    expectedSha: SHA_A,
    now,
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /stale/i);
});

test('evaluateSmokeHealth fails when status is not ok', () => {
  const result = evaluateSmokeHealth({
    statusCode: 200,
    body: JSON.stringify({ status: 'error', buildSha: SHA_A, timestamp: new Date().toISOString() }),
    expectedSha: SHA_A,
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /status 'ok'/i);
});
