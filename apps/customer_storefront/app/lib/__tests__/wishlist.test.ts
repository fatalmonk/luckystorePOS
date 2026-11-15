import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createWishlistItem, deleteWishlistItem, fetchWishlistItems } from '../wishlist';

const ok = (body: unknown) => ({ ok: true, json: async () => body });
const fail = (status: number, error: string) => ({ ok: false, status, json: async () => ({ error }) });

function stubFetch(...responses: Array<ReturnType<typeof ok> | ReturnType<typeof fail>>) {
  const fetchMock = vi.fn();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createWishlistItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a wishlist item successfully', async () => {
    const mockItem = {
      id: 'wl-1',
      product_id: 'prod-1',
      product_name: 'Milk',
      created_at: new Date().toISOString(),
    };
    const fetchMock = stubFetch(ok({ productIds: [] }), ok({ item: mockItem }));

    const result = await createWishlistItem('prod-1', 'Milk');
    expect(result.product_id).toBe('prod-1');
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/wishlist?initialize=1');
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 'prod-1', productName: 'Milk', phone: undefined }),
    });
  });

  it('creates a wishlist item with phone', async () => {
    const mockItem = {
      id: 'wl-2',
      product_id: 'prod-2',
      customer_phone: '+880****5678',
      product_name: 'Bread',
      created_at: new Date().toISOString(),
    };
    stubFetch(ok({ productIds: [] }), ok({ item: mockItem }));

    const result = await createWishlistItem('prod-2', 'Bread', '+880****5678');
    expect(result.customer_phone).toBe('+880****5678');
  });

  it('throws on duplicate (23505 error code)', async () => {
    stubFetch(ok({ productIds: [] }), fail(409, 'Already on wishlist'));

    await expect(createWishlistItem('prod-1', 'Milk')).rejects.toThrow('Already on wishlist');
  });

  it('throws on other DB errors', async () => {
    stubFetch(ok({ productIds: [] }), fail(500, 'permission denied'));

    await expect(createWishlistItem('prod-1', 'Milk')).rejects.toThrow('permission denied');
  });

  it('throws when productId is empty', async () => {
    await expect(createWishlistItem('', 'Milk')).rejects.toThrow('productId required');
  });

  it('throws when productName is empty', async () => {
    await expect(createWishlistItem('prod-1', '')).rejects.toThrow('productName required');
  });

  it('serializes simultaneous first-time adds behind one owner bootstrap', async () => {
    vi.stubGlobal('navigator', { locks: undefined });
    const trace: string[] = [];
    let ownerBootstrapped = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (input === '/api/wishlist?initialize=1') {
        trace.push('bootstrap');
        ownerBootstrapped = true;
        return ok({ productIds: [] });
      }
      if (input === '/api/wishlist' && init?.method === 'POST') {
        trace.push(ownerBootstrapped ? 'write' : 'write-before-bootstrap');
        return ok({ item: { id: 'wl-1', product_id: 'prod-1', product_name: 'Milk', created_at: 'now' } });
      }
      throw new Error(`Unexpected fetch: ${String(input)}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([
      createWishlistItem('prod-1', 'Milk'),
      createWishlistItem('prod-2', 'Bread'),
    ]);

    expect(trace).toEqual(['bootstrap', 'write', 'bootstrap', 'write']);
    expect(trace).not.toContain('write-before-bootstrap');
  });

  it('uses the origin-wide Web Lock when available', async () => {
    let lockTail = Promise.resolve();
    const request = vi.fn((_name: string, operation: () => Promise<unknown>) => {
      const queued = lockTail.then(operation, operation);
      lockTail = queued.then(() => undefined, () => undefined);
      return queued;
    });
    vi.stubGlobal('navigator', { locks: { request } });
    let cookieValue: string | undefined;
    const writes: Array<string | undefined> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (input === '/api/wishlist?initialize=1') {
        cookieValue ??= 'same-owner-cookie';
        return ok({ productIds: [] });
      }
      if (input === '/api/wishlist' && init?.method === 'POST') {
        writes.push(cookieValue);
        return ok({ item: { id: 'wl-1', product_id: 'prod-1', product_name: 'Milk', created_at: 'now' } });
      }
      throw new Error(`Unexpected fetch: ${String(input)}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([
      createWishlistItem('prod-1', 'Milk'),
      createWishlistItem('prod-2', 'Bread'),
    ]);

    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenCalledWith('lucky-store-wishlist-owner', expect.any(Function));
    expect(writes).toEqual(['same-owner-cookie', 'same-owner-cookie']);
  });
});

describe('deleteWishlistItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes successfully', async () => {
    const fetchMock = stubFetch(ok({ productIds: [] }), ok({ success: true }));

    await expect(deleteWishlistItem('prod-1')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/wishlist?initialize=1');
    expect(fetchMock).toHaveBeenNthCalledWith(2,
      '/api/wishlist?productId=prod-1',
      { method: 'DELETE' }
    );
  });

  it('throws on DB error', async () => {
    stubFetch(ok({ productIds: [] }), fail(400, 'RLS violation'));

    await expect(deleteWishlistItem('prod-1')).rejects.toThrow('RLS violation');
  });

  it('throws when productId is empty', async () => {
    await expect(deleteWishlistItem('')).rejects.toThrow('productId required');
  });
});

describe('fetchWishlistItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns array of product_ids', async () => {
    const fetchMock = stubFetch(ok({ productIds: ['prod-1', 'prod-2'] }));

    const result = await fetchWishlistItems();
    expect(result).toEqual(['prod-1', 'prod-2']);
    expect(fetchMock).toHaveBeenCalledWith('/api/wishlist?initialize=1');
  });

  it('returns empty array when no items', async () => {
    stubFetch(ok({ productIds: [] }));

    const result = await fetchWishlistItems();
    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    stubFetch(fail(500, 'connection failed'));

    await expect(fetchWishlistItems()).rejects.toThrow('connection failed');
  });
});
