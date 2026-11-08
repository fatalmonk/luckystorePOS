import { afterEach, describe, expect, it, vi } from 'vitest';

describe('GET /api/health', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns ok status without build SHA when unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_BUILD_SHA', '');
    const { GET } = await import('./route');
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      service: 'customer-storefront',
      buildSha: null,
    });
  });

  it('exposes build SHA for release provenance verification', async () => {
    vi.stubEnv('NEXT_PUBLIC_BUILD_SHA', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    vi.resetModules();
    const { GET } = await import('./route');
    const response = await GET();
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      service: 'customer-storefront',
      buildSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
  });
});
