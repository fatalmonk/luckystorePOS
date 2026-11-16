import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import { evaluateSmokeHealth } from './smoke-test.mjs';
import * as smokeTest from './smoke-test.mjs';

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

test('evaluateStaticAssetCache rejects browser cache lifetimes shorter than 30 days', () => {
  const result = smokeTest.evaluateStaticAssetCache({
    statusCode: 200,
    cacheControl: 'public, max-age=86400',
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /30 days/i);
});

test('evaluateStaticAssetCache accepts the 30-day public image policy', () => {
  const result = smokeTest.evaluateStaticAssetCache({
    statusCode: 200,
    cacheControl: 'public, max-age=2592000, stale-while-revalidate=86400',
  });
  assert.equal(result.ok, true);
});

test('evaluateStaticAssetCache requires one 24-hour stale-while-revalidate directive', () => {
  for (const cacheControl of [
    'public, max-age=2592000',
    'public, max-age=2592000, stale-while-revalidate=3600',
    'public, max-age=2592000, stale-while-revalidate=86400, stale-while-revalidate=86400',
  ]) {
    const result = smokeTest.evaluateStaticAssetCache({ statusCode: 200, cacheControl });
    assert.equal(result.ok, false, cacheControl);
    assert.match(result.error, /stale-while-revalidate=86400/i);
  }
});

test('evaluateStaticAssetCache rejects immutable caching for stable public URLs', () => {
  const result = smokeTest.evaluateStaticAssetCache({
    statusCode: 200,
    cacheControl: 'public, max-age=31536000, immutable',
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /immutable/i);
});

test('evaluateStaticAssetCache rejects conflicting max-age directives', () => {
  const result = smokeTest.evaluateStaticAssetCache({
    statusCode: 200,
    cacheControl: 'public, max-age=2592000, max-age=0',
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /exactly one max-age/i);
});

test('evaluateStaticAssetCache rejects malformed quoted max-age values', () => {
  const result = smokeTest.evaluateStaticAssetCache({
    statusCode: 200,
    cacheControl: 'public, max-age="2592000',
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /valid max-age/i);
});

test('the release smoke gate covers every configured public image cache route', () => {
  assert.deepEqual(smokeTest.STATIC_ASSET_CACHE_PATHS, [
    '/images/hero-reference.webp',
    '/images/tea-time.webp',
    '/logo-main.png',
    '/logo-main-inverse.png',
    '/logo-bangla.svg',
    '/logo-bangla-inverse.svg',
  ]);
});


// Deployment-time transport failures are retryable only for read-only probes.
// Application-level responses and non-idempotent requests must never be retried.
async function withHttpServer(listener, fn) {
  const server = http.createServer(listener);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  try { return await fn('http://127.0.0.1:' + addr.port); }
  finally { await new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
}

test('smoke request recovers from one transient connection reset', async () => {
  let attempts = 0;
  await withHttpServer((req, res) => {
    attempts++;
    if (attempts === 1) { req.socket.destroy(); return; }
    res.end('recovered');
  }, async (url) => {
    const response = await smokeTest.request(url + '/', {}, { backoffMs: 1 });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body, 'recovered');
    assert.equal(attempts, 2);
  });
});

test('smoke request retries truncated response streams', async () => {
  let attempts = 0;
  await withHttpServer((req, res) => {
    attempts++;
    if (attempts === 1) { res.writeHead(200); res.write('partial'); res.socket.destroy(); return; }
    res.end('complete');
  }, async (url) => {
    const response = await smokeTest.request(url + '/', {}, { backoffMs: 1 });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body, 'complete');
    assert.equal(attempts, 2);
  });
});

test('smoke request exhausts the bounded reset retries and fails', async () => {
  let attempts = 0;
  await withHttpServer((req) => { attempts++; req.socket.destroy(); }, async (url) => {
    await assert.rejects(smokeTest.request(url + '/', {}, { backoffMs: 1 }), { code: 'ECONNRESET' });
    assert.equal(attempts, 3);
  });
});

test('smoke request does not retry HTTP errors', async () => {
  let attempts = 0;
  await withHttpServer((req, res) => {
    attempts++;
    res.writeHead(503);
    res.end('Unavailable');
  }, async (url) => {
    const response = await smokeTest.request(url + '/', {}, { backoffMs: 1 });
    assert.equal(response.statusCode, 503);
    assert.equal(attempts, 1);
  });
});

test('smoke request never replays non-idempotent POST requests', async () => {
  let attempts = 0;
  await withHttpServer((req) => { attempts++; req.socket.destroy(); }, async (url) => {
    await assert.rejects(smokeTest.request(url + '/', { method: 'POST' }, { backoffMs: 1 }), { code: 'ECONNRESET' });
    assert.equal(attempts, 1);
  });
});
