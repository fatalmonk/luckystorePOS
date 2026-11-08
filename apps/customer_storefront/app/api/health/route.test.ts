import { afterEach, describe, expect, it, vi } from 'vitest';

describe('GET /api/health', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns ok status and timestamp without build SHA when unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_BUILD_SHA', '');
    vi.stubEnv('BUILD_SHA', '');
    vi.stubEnv('GITHUB_SHA', '');
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '');
    vi.resetModules();
    const { GET } = await import('./route');
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      status: 'ok',
      service: 'customer-storefront',
      buildSha: null,
    });
    expect(typeof body.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it('exposes build SHA and timestamp for release provenance verification', async () => {
    vi.stubEnv('NEXT_PUBLIC_BUILD_SHA', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    vi.resetModules();
    const { GET } = await import('./route');
    const response = await GET();
    const body = await response.json();
    expect(body).toMatchObject({
      status: 'ok',
      service: 'customer-storefront',
      buildSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });
});
