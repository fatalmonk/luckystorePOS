import http from 'node:http';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const require = createRequire(import.meta.url);

const secret = 'A'.repeat(43);

async function createServerWithGuard({ enabled = '1', key = secret } = {}) {
  const originGate = require('../../origin-gate-install.cjs');
  const restore = originGate.installOriginGate({ enabled, secret: key });
  let handlerCalls = 0;
  const server = http.createServer((req, res) => {
    handlerCalls++;
    res.setHeader('Content-Type', 'text/plain');
    res.end('accepted');
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No listener');
  return {
    url: 'http://127.0.0.1:' + address.port,
    handlerCalls: () => handlerCalls,
    async close() {
      await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
      restore();
    },
  };
}

describe('Hostinger origin gate', () => {
  it('is disabled by default and leaves normal shopping requests untouched', async () => {
    const server = await createServerWithGuard({ enabled: '0' });
    try {
      const r = await fetch(server.url + '/api/products');
      expect(r.status).toBe(200);
      expect(server.handlerCalls()).toBe(1);
    } finally { await server.close(); }
  });

  it('fails closed on missing, weak, or malformed enabled secret', () => {
    const { validateConfig } = require('../../origin-gate-install.cjs');
    for (const x of ['', 'weak', '!!'.repeat(30)]) {
      expect(() => validateConfig('1', x)).toThrow('refusing to start');
    }
  });

  it('denies direct-origin browser and API requests before they reach Next', async () => {
    const server = await createServerWithGuard();
    try {
      for (const path of ['/', '/api/products?limit=1', '/api/checkout', '/_next/image?url=foo', '/_next/static/main.js', '/favicon.ico']) {
        const r = await fetch(server.url + path);
        expect(r.status).toBe(403);
        expect(r.headers.get('cache-control')).toContain('no-store');
        expect(await r.text()).toBe('Forbidden');
      }
      expect(server.handlerCalls()).toBe(0);
    } finally { await server.close(); }
  });

  it('accepts only the exact Cloudflare-injected header, including POST requests', async () => {
    const server = await createServerWithGuard();
    try {
      for (const path of ['/', '/api/products?limit=1', '/api/checkout', '/_next/static/main.js']) {
        const r = await fetch(server.url + path, {
          method: path.includes('checkout') ? 'POST' : 'GET',
          headers: { 'x-lucky-origin-auth': secret },
        });
        expect(r.status).toBe(200);
        expect(await r.text()).toBe('accepted');
      }
      for (const bad of [secret.slice(1), secret + 'A', ' '.repeat(43), secret.toLowerCase()]) {
        const r = await fetch(server.url, { headers: { 'x-lucky-origin-auth': bad } });
        expect(r.status).toBe(403);
      }
      expect(server.handlerCalls()).toBe(4);
    } finally { await server.close(); }
  });
});
