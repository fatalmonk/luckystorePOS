import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawn } from 'node:child_process';
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
    assert.doesNotMatch(wrapper, /require\('\.\/origin-gate-install\.cjs'\)/);
    assert.ok(entry.indexOf('origin-gate-install.cjs') < entry.indexOf("require('node:http')"));
    assert.ok(fs.existsSync(path.join(standaloneDir, 'apps/customer_storefront/origin-gate-install.cjs')));
    assert.ok(fs.existsSync(path.join(standaloneDir, 'origin-gate-install.cjs')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});


async function launchPackagedEntry(entry, secret) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entry], {
      cwd: path.dirname(entry),
      env: {
        ...process.env,
        LUCKY_ORIGIN_GATE_ENABLED: '1',
        LUCKY_ORIGIN_GATE_SECRET: secret,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (error, port) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) { child.kill(); reject(error); }
      else resolve({ child, port });
    };
    const timeout = setTimeout(() => finish(new Error('Packaged server startup timeout; stderr: ' + stderr)), 5000);
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      const match = stdout.match(/READY:(\d+)/);
      if (match) finish(null, Number(match[1]));
    });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', (error) => finish(error));
    child.once('exit', (code, signal) => finish(new Error(
      'Packaged server exited before listening: code=' + code + ' signal=' + signal + ' stderr=' + stderr
    )));
  });
}

test('both packaged server entrypoints start with origin gate enabled and enforce HTTP requests', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lucky-origin-entrypoint-'));
  const secret = 'z'.repeat(43); // synthetic-only, not an environment credential
  try {
    const app = path.join(root, 'apps/customer_storefront');
    const standalone = path.join(app, '.next/standalone');
    const sourceRoot = path.resolve(import.meta.dirname, '../../apps/customer_storefront');
    fs.mkdirSync(path.join(standalone, 'apps/customer_storefront'), { recursive: true });
    fs.mkdirSync(path.join(app, '.next/static'), { recursive: true });
    fs.mkdirSync(path.join(app, 'public'), { recursive: true });
    // A tiny Node HTTP server substitutes for Next, exercising the exact packaged entrypoint chain.
    fs.writeFileSync(path.join(standalone, 'apps/customer_storefront/server.js'), [
      "const http = require('node:http');",
      "const server = http.createServer((req, res) => res.end('accepted'));",
      "server.listen(0, '127.0.0.1', () => process.stdout.write('READY:' + server.address().port + '\\n'));",
    ].join('\n'));
    fs.copyFileSync(path.join(sourceRoot, 'package.json'), path.join(app, 'package.json'));
    for (const module of ['security-headers.cjs', 'security-headers-install.cjs', 'origin-gate-install.cjs']) {
      fs.copyFileSync(path.join(sourceRoot, module), path.join(app, module));
    }
    const result = packageStandalone({ rootDir: root, outputZip: 'test.zip', buildSha: 'a'.repeat(40) });
    for (const entry of [
      path.join(result.standaloneDir, 'server.js'),
      path.join(result.standaloneDir, 'apps/customer_storefront/server.js'),
    ]) {
      const { child, port } = await launchPackagedEntry(entry, secret);
      try {
        const url = 'http://127.0.0.1:' + port;
        for (const requestPath of ['/', '/api/products?limit=1', '/_next/image?url=test']) {
          const direct = await fetch(url + requestPath);
          assert.equal(direct.status, 403, 'missing origin header should be rejected: ' + requestPath);
          const authorized = await fetch(url + requestPath, { headers: { 'x-lucky-origin-auth': secret } });
          assert.equal(authorized.status, 200, 'valid proxy header should succeed: ' + requestPath);
        }
        const wrong = await fetch(url + '/api/health', { headers: { 'x-lucky-origin-auth': 'wrong' } });
        assert.equal(wrong.status, 403);
      } finally {
        if (child.exitCode === null) {
          const done = new Promise(resolve => child.once('exit', resolve));
          child.kill('SIGTERM');
          await done;
        }
      }
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
