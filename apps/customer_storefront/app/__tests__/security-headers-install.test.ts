import http from 'node:http';
import { describe, expect, it } from 'vitest';

describe('outgoing security header install', () => {
  it('adds security headers and catalog cache policy on the way out of Node', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    (process.env as { NODE_ENV?: string }).NODE_ENV = 'production';
    await import('../../security-headers-install.cjs');
    const server = http.createServer((req, res) => {
      if (req.url === '/boom') {
        res.statusCode = 500;
        res.end('nope');
        return;
      }
      if (req.url === '/profile') {
        res.writeHead(200, { 'Cache-Control': 'public, max-age=3600', 'X-Frame-Options': 'DENY' });
        res.end('profile');
        return;
      }
      res.end('ok');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('no port');
    const base = `http://127.0.0.1:${address.port}`;

    async function read(path: string) {
      const response = await fetch(`${base}${path}`);
      return { status: response.status, headers: response.headers };
    }

    try {
      const home = await read('/');
      expect(home.headers.get('x-frame-options')).toBe('SAMEORIGIN');
      expect(home.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
      expect(home.headers.get('x-content-type-options')).toBe('nosniff');
      expect(home.headers.get('strict-transport-security')).toContain('max-age=31536000');
      expect(home.headers.get('content-security-policy-report-only')).toContain("default-src 'self'");
      expect(home.headers.get('permissions-policy')).toContain('camera=()');
      expect(home.headers.get('cache-control')).toBe('public, max-age=0, s-maxage=120, stale-while-revalidate=600');

      const bengali = await read('/bn/category/snacks');
      expect(bengali.headers.get('x-frame-options')).toBe('SAMEORIGIN');
      expect(bengali.headers.get('cache-control')).toContain('s-maxage=120');

      const asset = await read('/images/hero-reference.webp');
      expect(asset.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
      expect(asset.headers.get('cache-control')).toBe('public, max-age=2592000');

      const cart = await read('/bn/checkout');
      expect(cart.headers.get('permissions-policy')).toContain('geolocation=(self)');
      expect(cart.headers.get('cache-control')).toBe('private, no-store, max-age=0, must-revalidate');

      const authed = await fetch(`${base}/`, { headers: { cookie: 'sb-project-auth-token=session' } });
      expect(authed.headers.get('cache-control')).toBe('private, no-store, max-age=0, must-revalidate');
      expect(authed.headers.get('cdn-cache-control')).toBe('private, no-store');

      const profile = await new Promise<{ status: number; headers: Headers }>((resolve, reject) => {
        const request = http.request({
          hostname: '127.0.0.1',
          port: address.port,
          path: '/profile',
          method: 'GET',
        }, (response) => {
          response.resume();
          resolve({ status: response.statusCode || 0, headers: new Headers(Object.entries(response.headers).flatMap(([key, value]) => {
            const values = Array.isArray(value) ? value : value ? [value] : [];
            return values.map((item) => [key, item] as [string, string]);
          })) });
        });
        request.on('error', reject);
        request.end();
      });
      expect(profile.headers.get('x-frame-options')).toBe('SAMEORIGIN');
      expect(profile.headers.get('cache-control')).toBe('private, no-store, max-age=0, must-revalidate');

      const failure = await read('/boom');
      expect(failure.status).toBe(500);
      expect(failure.headers.get('x-frame-options')).toBe('SAMEORIGIN');
      expect(failure.headers.get('cache-control')).toBeNull();
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      (process.env as { NODE_ENV?: string }).NODE_ENV = previousNodeEnv;
    }
  });
});
