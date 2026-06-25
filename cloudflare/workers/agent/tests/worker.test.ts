import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import worker from '../src/index.js';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Lucky Store Agent Worker', () => {
  const MOCK_ENV = {
    SUPABASE_URL: 'https://mock.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'mock-role-key',
    SUPABASE_ANON_KEY: 'mock-anon-key',
    NEON_PROXY_API_KEY: 'mock-neon-key',
    NEON_PROXY_URL: 'https://mock-neon-proxy.workers.dev',
    IMAGES_WORKER_URL: 'https://mock-images.com',
    OAUTH_METADATA_URL: 'https://mock-api.com/.well-known/oauth-protected-resource',
  };

  describe('Discovery', () => {
    it('GET /.well-known/oauth-authorization-server → 200, has .issuer', async () => {
      const request = new IncomingRequest('http://localhost/.well-known/oauth-authorization-server');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV as any, ctx);
      await waitOnExecutionContext(ctx);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect((data as any).issuer).toBe('https://agent.luckystore1947.com');
    });

    it('GET /auth.md → 200, Cache-Control: public,max-age=300', async () => {
      const request = new IncomingRequest('http://localhost/auth.md');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV as any, ctx);
      await waitOnExecutionContext(ctx);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toContain('public, max-age=300');
    });

    it('GET /robots.txt → 200, Disallow: /api/', async () => {
      const request = new IncomingRequest('http://localhost/robots.txt');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV as any, ctx);
      await waitOnExecutionContext(ctx);
      
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toContain('Disallow: /api/');
    });
  });

  describe('Auth', () => {
    it('missing token → 401, x-request-id present', async () => {
      const request = new IncomingRequest('http://localhost/api/test');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV as any, ctx);
      await waitOnExecutionContext(ctx);
      
      expect(response.status).toBe(401);
      expect(response.headers.has('x-request-id')).toBe(true);
    });

    it('malformed JWT → 401', async () => {
      const request = new IncomingRequest('http://localhost/api/test', {
        headers: { Authorization: 'Bearer not.a.jwt' }
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV as any, ctx);
      await waitOnExecutionContext(ctx);
      
      expect(response.status).toBe(401);
    });
  });

  describe('Security Headers', () => {
    it('all responses include X-Content-Type-Options: nosniff', async () => {
      const request = new IncomingRequest('http://localhost/auth.md');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV as any, ctx);
      await waitOnExecutionContext(ctx);
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('all responses include Content-Security-Policy', async () => {
      const request = new IncomingRequest('http://localhost/health');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV as any, ctx);
      await waitOnExecutionContext(ctx);
      
      expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
    });

    it('error responses include x-request-id', async () => {
      const request = new IncomingRequest('http://localhost/api/test'); // 401 error
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, MOCK_ENV as any, ctx);
      await waitOnExecutionContext(ctx);
      
      expect(response.headers.has('x-request-id')).toBe(true);
    });
  });
});
