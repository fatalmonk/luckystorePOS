import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../apps/customer_storefront');
const configPath = path.join(appRoot, 'next.config.js');

function loadImageConfig(vercelValue, env = {}) {
  const previousVercel = process.env.VERCEL;
  const previousAnalyze = process.env.ANALYZE;

  try {
    if (vercelValue === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = vercelValue;
    delete process.env.ANALYZE;
    delete require.cache[require.resolve(configPath)];
    return require(configPath).images;
  } finally {
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    if (previousAnalyze === undefined) delete process.env.ANALYZE;
    else process.env.ANALYZE = previousAnalyze;
    delete require.cache[require.resolve(configPath)];
  }
}

test('serves remote image originals directly across hosting modes', () => {
  assert.equal(loadImageConfig(undefined).unoptimized, true);
  assert.equal(loadImageConfig('1').unoptimized, true);
});

test('rejects all remote sources at the public optimizer endpoint', () => {
  assert.deepEqual(loadImageConfig(undefined).remotePatterns, []);
  assert.deepEqual(loadImageConfig('1').remotePatterns, []);
});
