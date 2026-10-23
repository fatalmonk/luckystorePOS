import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createStandaloneRuntimeManifest } from './standalone-runtime-manifest.mjs';

test('standalone runtime manifest follows the storefront patched dependency versions', () => {
  const appPackage = JSON.parse(
    fs.readFileSync(new URL('../../apps/customer_storefront/package.json', import.meta.url), 'utf8'),
  );
  const lockfile = JSON.parse(
    fs.readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'),
  );
  const manifest = createStandaloneRuntimeManifest(appPackage);

  assert.equal(
    manifest.dependencies.next,
    lockfile.packages['apps/customer_storefront/node_modules/next'].version,
  );
  assert.equal(manifest.dependencies.sharp, '^0.35.5');
  assert.equal(manifest.dependencies.postcss, manifest.overrides.postcss);
  assert.equal(manifest.overrides.next, appPackage.devDependencies.next);
  assert.equal(manifest.overrides.postcss, appPackage.overrides.postcss);
  assert.equal(
    manifest.overrides['postcss-selector-parser'],
    appPackage.overrides['postcss-selector-parser'],
  );
  assert.equal(manifest.overrides.sharp, '^0.35.5');
  assert.equal(lockfile.packages['node_modules/sharp'].version, '0.35.5');
  assert.equal(lockfile.packages['node_modules/postcss'].version, '8.5.29');
});

test('standalone runtime manifest rejects a storefront package without Next.js', () => {
  assert.throws(
    () => createStandaloneRuntimeManifest({ dependencies: {}, devDependencies: {} }),
    /must declare its Next\.js version/,
  );
});
