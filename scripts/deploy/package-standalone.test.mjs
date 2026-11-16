import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { writeBuildProvenance, packageStandalone } from './package-standalone.mjs';

test('writeBuildProvenance writes reviewed commit SHA into standalone package before zipping', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'e6r-provenance-'));
  writeBuildProvenance(root, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  const txt = fs.readFileSync(path.join(root, 'build_sha.txt'), 'utf8').trim();
  const json = JSON.parse(fs.readFileSync(path.join(root, 'build_provenance.json'), 'utf8'));
  assert.equal(txt, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  assert.equal(json.buildSha, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
});


test('Hostinger deployment package places origin gate before Next on BOTH server entrypoints', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lucky-origin-package-'));
  try {
    const app = path.join(root, 'apps/customer_storefront');
    const standalone = path.join(app, '.next/standalone');
    const sourceRoot = path.resolve(import.meta.dirname, '../../apps/customer_storefront');
    fs.mkdirSync(path.join(standalone, 'apps/customer_storefront'), { recursive: true });
    fs.mkdirSync(path.join(app, '.next/static'), { recursive: true });
    fs.mkdirSync(path.join(app, 'public'), { recursive: true });
    fs.writeFileSync(path.join(standalone, 'apps/customer_storefront/server.js'), "require('node:http').createServer(()=>{});\n");
    fs.copyFileSync(path.join(sourceRoot, 'package.json'), path.join(app, 'package.json'));
    for (const module of ['security-headers.cjs', 'security-headers-install.cjs', 'origin-gate-install.cjs']) {
      fs.copyFileSync(path.join(sourceRoot, module), path.join(app, module));
    }
    const { standaloneDir } = packageStandalone({ rootDir: root, outputZip: 'test.zip', buildSha: 'a'.repeat(40) });
    const entry = fs.readFileSync(path.join(standaloneDir, 'apps/customer_storefront/server.js'), 'utf8');
    const wrapper = fs.readFileSync(path.join(standaloneDir, 'server.js'), 'utf8');
    assert.match(entry, /require\('\.\/origin-gate-install\.cjs'\)/);
    assert.match(wrapper, /require\('\.\/origin-gate-install\.cjs'\)/);
    assert.ok(entry.indexOf('origin-gate-install.cjs') < entry.indexOf("require('node:http')"));
    assert.ok(fs.existsSync(path.join(standaloneDir, 'apps/customer_storefront/origin-gate-install.cjs')));
    assert.ok(fs.existsSync(path.join(standaloneDir, 'origin-gate-install.cjs')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
