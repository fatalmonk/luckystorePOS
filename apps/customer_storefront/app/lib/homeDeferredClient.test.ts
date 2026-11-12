import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchDeferredHomeShelves } from './homeDeferredClient';

describe('fetchDeferredHomeShelves', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('revalidates through the browser cache and exposes refreshed catalog data', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ pantryProducts: [{ name: 'Old price' }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ pantryProducts: [{ name: 'Updated price' }] })));
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;

    const first = await fetchDeferredHomeShelves('en', signal);
    const refreshed = await fetchDeferredHomeShelves('en', signal);

    expect(first.pantryProducts[0].name).toBe('Old price');
    expect(refreshed.pantryProducts[0].name).toBe('Updated price');
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/home/deferred?locale=en', { signal, cache: 'no-cache' });
  });
});
