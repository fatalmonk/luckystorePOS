import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadBuyAgainProducts } from './loadBuyAgainProducts';

describe('loadBuyAgainProducts', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('looks up an old order product by ID rather than relying on the first catalog page', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'product-on-page-two', price: 125, stock: 3 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const products = await loadBuyAgainProducts([
      { id: 'product-on-page-two' },
      { id: 'product-on-page-two' },
    ]);

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      '/api/products?id=product-on-page-two&fresh=1',
      { cache: 'no-store' },
    );
    expect(products.get('product-on-page-two')).toMatchObject({ price: 125, stock: 3 });
  });

  it('loads independent product IDs concurrently', async () => {
    let release: () => void = () => {};
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    const fetchMock = vi.fn(async (url: string) => {
      if (fetchMock.mock.calls.length === 2) release();
      await barrier;
      const id = new URL(url, 'https://store.test').searchParams.get('id')!;
      return { ok: true, json: async () => ({ id, price: 125, stock: 3 }) };
    });
    vi.stubGlobal('fetch', fetchMock);

    const products = await loadBuyAgainProducts([{ id: 'first' }, { id: 'second' }]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(products.size).toBe(2);
  });

  it('treats deleted products as unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404 }));
    await expect(loadBuyAgainProducts([{ id: 'deleted' }])).resolves.toEqual(new Map());
  });

  it('does not return a browse-only catalog snapshot for purchase', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'snapshot', price: 125, stock: 0, availabilityUnknown: true, degraded: true }),
    }));
    await expect(loadBuyAgainProducts([{ id: 'snapshot' }])).resolves.toEqual(new Map());
  });

  it('rejects negative catalog prices before returning products to add', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'negative-price', price: -1, stock: 3 }),
    }));
    await expect(loadBuyAgainProducts([{ id: 'negative-price' }])).rejects.toThrow('Invalid current product');
  });

  it('rejects a failed lookup before returning any products to add to cart', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'available', price: 125, stock: 3 }) })
      .mockResolvedValueOnce({ ok: false, status: 500 });
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadBuyAgainProducts([{ id: 'available' }, { id: 'failed' }])).rejects.toThrow(
      'Could not load current products',
    );
  });
});
