import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateSmokeHealth } from './smoke-test.mjs';

test('evaluateSmokeHealth requires matching build SHA when expected SHA is provided', () => {
  const result = evaluateSmokeHealth({
    statusCode: 200,
    body: JSON.stringify({ status: 'ok', service: 'customer-storefront', buildSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }),
    expectedSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /build SHA/i);
});

test('evaluateSmokeHealth fails when expected SHA is provided but health omits build SHA', () => {
  const result = evaluateSmokeHealth({
    statusCode: 200,
    body: JSON.stringify({ status: 'ok', service: 'customer-storefront' }),
    expectedSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /build SHA/i);
});

test('evaluateSmokeHealth accepts matching build SHA', () => {
  const result = evaluateSmokeHealth({
    statusCode: 200,
    body: JSON.stringify({ status: 'ok', service: 'customer-storefront', buildSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }),
    expectedSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  });
  assert.equal(result.ok, true);
});
