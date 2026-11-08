import { describe, expect, it, vi } from 'vitest';

/**
 * Regression test for the homepage/listing search cache (PR #601, Cubic P2).
 *
 * `SupabaseProductAdapter.search()` forwards its client to
 * `searchStorefrontProducts`, which bypasses the shared Data Cache for any
 * client that is not the default one. The dedicated anonymous storefront client
 * reads the same public catalog over the same URL, so it must keep sharing the
 * cache instead of forcing an uncached Supabase read on every render.
 */

const { defaultClient, anonymousClient } = vi.hoisted(() => ({
  defaultClient: { rpc: vi.fn(), from: vi.fn() } as Record<string, any>,
  anonymousClient: { id: 'anonymous' },
}));

vi.mock('next/cache', () => ({
  // Pass-through wrapper: the cached function always executes, so we can
  // observe which client the cached path actually used via defaultClient.rpc.
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock('../supabase', () => ({ supabase: defaultClient }));
vi.mock('../supabase/anonymousStorefront', () => ({
  isAnonymousStorefrontClient: (client: unknown) => client === anonymousClient,
}));

function emptyCatalogClient() {
  return {
    rpc: vi.fn(() => Promise.resolve({ data: [], error: null })),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null }),
    })),
  };
}

describe('searchStorefrontProducts cache eligibility', () => {
  it('routes the anonymous storefront client through the shared Data Cache', async () => {
    const shared = emptyCatalogClient();
    defaultClient.rpc = shared.rpc;
    defaultClient.from = shared.from;

    const { searchStorefrontProducts } = await import('./searchProducts');
    await searchStorefrontProducts({ limit: 10, supabaseClient: anonymousClient as any });

    // The cached path executes with the shared default client, proving the
    // anonymous client did not bypass the Data Cache.
    expect(shared.rpc).toHaveBeenCalledWith(
      'search_storefront_catalog_v2',
      expect.objectContaining({ p_limit: expect.any(Number) }),
    );
  });

  it('keeps genuinely isolated clients on the uncached path', async () => {
    const sharedRpc = defaultClient.rpc as ReturnType<typeof vi.fn>;
    const callsBefore = sharedRpc.mock.calls.length;
    const isolated = emptyCatalogClient();

    const { searchStorefrontProducts } = await import('./searchProducts');
    await searchStorefrontProducts({ limit: 10, supabaseClient: isolated as any });

    expect(isolated.rpc).toHaveBeenCalledTimes(1);
    expect(sharedRpc.mock.calls.length).toBe(callsBefore);
  });
});
