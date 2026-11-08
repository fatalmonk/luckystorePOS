import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn((url: string, key: string) => ({ url, key })),
}));

vi.mock('@supabase/supabase-js', () => ({ createClient }));

describe('anonymous storefront client', () => {
  beforeEach(() => {
    vi.resetModules();
    createClient.mockClear();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    vi.stubEnv('SUPABASE_API_KEY', '');
    vi.stubEnv('SUPABASE_ANON_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('falls back to SUPABASE_API_KEY like the shared client', async () => {
    vi.stubEnv('SUPABASE_API_KEY', 'api-key-alias');

    const { getAnonymousStorefrontClient } = await import('./anonymousStorefront');
    getAnonymousStorefrontClient();

    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient.mock.calls[0]?.[0]).toBe('https://example.supabase.co');
    expect(createClient.mock.calls[0]?.[1]).toBe('api-key-alias');
  });

  it('prefers NEXT_PUBLIC_SUPABASE_ANON_KEY over the aliases', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-anon-key');
    vi.stubEnv('SUPABASE_API_KEY', 'api-key-alias');
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-alias');

    const { getAnonymousStorefrontClient } = await import('./anonymousStorefront');
    getAnonymousStorefrontClient();

    expect(createClient.mock.calls[0]?.[1]).toBe('public-anon-key');
  });

  it('recognises only the shared instance as cache-eligible', async () => {
    const { getAnonymousStorefrontClient, isAnonymousStorefrontClient } = await import(
      './anonymousStorefront'
    );

    expect(isAnonymousStorefrontClient(undefined)).toBe(false);
    expect(isAnonymousStorefrontClient(null)).toBe(false);
    expect(isAnonymousStorefrontClient({})).toBe(false);

    const client = getAnonymousStorefrontClient();
    expect(isAnonymousStorefrontClient(client)).toBe(true);
    expect(isAnonymousStorefrontClient(getAnonymousStorefrontClient())).toBe(true);
    expect(createClient).toHaveBeenCalledTimes(1);
  });
});
