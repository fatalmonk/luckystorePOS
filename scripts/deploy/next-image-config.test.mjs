import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { evaluateStaticAssetCache } from '../ci/smoke-test.mjs';

const require = createRequire(import.meta.url);
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../apps/customer_storefront');
const configPath = path.join(appRoot, 'next.config.js');

function loadNextConfig(vercelValue) {
  const previousVercel = process.env.VERCEL;
  const previousAnalyze = process.env.ANALYZE;

  try {
    if (vercelValue === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = vercelValue;
    delete process.env.ANALYZE;
    delete require.cache[require.resolve(configPath)];
    return require(configPath);
  } finally {
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    if (previousAnalyze === undefined) delete process.env.ANALYZE;
    else process.env.ANALYZE = previousAnalyze;
    delete require.cache[require.resolve(configPath)];
  }
}

function loadImageConfig(vercelValue) {
  return loadNextConfig(vercelValue).images;
}

test('serves remote image originals directly across hosting modes', () => {
  assert.equal(loadImageConfig(undefined).unoptimized, true);
  assert.equal(loadImageConfig('1').unoptimized, true);
});

test('rejects all remote sources at the public optimizer endpoint', () => {
  assert.deepEqual(loadImageConfig(undefined).remotePatterns, []);
  assert.deepEqual(loadImageConfig('1').remotePatterns, []);
});

test('gives version-controlled public images at least a 30-day browser cache lifetime', async () => {
  const config = loadNextConfig(undefined);
  const rules = await config.headers();
  const expectedSources = [
    '/images/:path*',
    '/logo-main.png',
    '/logo-main-inverse.png',
    '/logo-bangla.svg',
    '/logo-bangla-inverse.svg',
  ];

  for (const source of expectedSources) {
    const rule = rules.find((candidate) => candidate.source === source);
    const cacheControl = rule?.headers.find((header) => header.key.toLowerCase() === 'cache-control');
    const result = evaluateStaticAssetCache({ statusCode: 200, cacheControl: cacheControl?.value });
    assert.equal(result.ok, true, `${source}: ${result.error}`);
  }
});
