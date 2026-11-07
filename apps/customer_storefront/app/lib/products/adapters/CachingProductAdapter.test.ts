import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CachingProductAdapter } from './CachingProductAdapter';
import type { ProductDataPort, PaginatedProducts, Category, Product, ProductId } from '../types';
import { createProductId } from '../types';

function createFakeAdapter(overrides?: Partial<ProductDataPort>): ProductDataPort {
  return {
    search: vi.fn().mockResolvedValue({ products: [], hasMore: false }),
    getById: vi.fn().mockResolvedValue(null),
    getByIdPrefix: vi.fn().mockResolvedValue(null),
    getCategories: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function fakeProduct(id: string): Product {
  return {
    id: createProductId(id),
    name: `Product ${id}`,
    emoji: '📦',
    price: 100,
    unit: 'pc',
    category: 'test',
    stock: 10,
    description: '',
  };
}

describe('CachingProductAdapter', () => {
  let inner: ProductDataPort;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('search', () => {
    it('caches search results by criteria', async () => {
      const result: PaginatedProducts = {
        products: [fakeProduct('1')],
        hasMore: false,
      };
      inner = createFakeAdapter({ search: vi.fn().mockResolvedValue(result) });
      const adapter = new CachingProductAdapter(inner, {
        searchTtlMs: 60_000,
        productTtlMs: 300_000,
        categoryTtlMs: 600_000,
        maxSearchEntries: 200,
        maxProductEntries: 500,
      });

      const criteria = { query: 'milk', limit: 10 };

      const r1 = await adapter.search(criteria);
      const r2 = await adapter.search(criteria);

      expect(r1).toEqual(result);
      expect(r2).toEqual(result);
      expect(inner.search).toHaveBeenCalledTimes(1);
    });

    it('does not return stale cache after TTL expires', async () => {
      inner = createFakeAdapter({
        search: vi.fn()
          .mockResolvedValueOnce({ products: [fakeProduct('old')], hasMore: false })
          .mockResolvedValueOnce({ products: [fakeProduct('new')], hasMore: false }),
      });

      const adapter = new CachingProductAdapter(inner, {
        searchTtlMs: 50,
        productTtlMs: 300_000,
        categoryTtlMs: 600_000,
        maxSearchEntries: 200,
        maxProductEntries: 500,
      });

      await adapter.search({ query: 'x' });

      // Wait past TTL
      await new Promise((r) => setTimeout(r, 60));

      const r2 = await adapter.search({ query: 'x' });
      expect(r2.products[0].name).toBe('Product new');
      expect(inner.search).toHaveBeenCalledTimes(2);
    });

    it('treats different criteria as different cache keys', async () => {
      inner = createFakeAdapter();
      const adapter = new CachingProductAdapter(inner);

      await adapter.search({ query: 'a' });
      await adapter.search({ query: 'b' });

      expect(inner.search).toHaveBeenCalledTimes(2);
    });

    it('returns distinct results for different explicit offsets', async () => {
      inner = createFakeAdapter({
        search: vi.fn(async (criteria) => ({
          products: [fakeProduct(String(criteria.offset))],
          hasMore: true,
        })),
      });
      const adapter = new CachingProductAdapter(inner);
      const page1 = await adapter.search({ query: 'milk', limit: 10, offset: 0 });
      const page2 = await adapter.search({ query: 'milk', limit: 10, offset: 10 });
      expect(page1.products[0].id).toBe('0');
      expect(page2.products[0].id).toBe('10');
      expect(inner.search).toHaveBeenCalledTimes(2);
    });

    it('shares equivalent page and offset pagination while separating distinct pages', async () => {
      inner = createFakeAdapter();
      const adapter = new CachingProductAdapter(inner);
      await adapter.search({ query: 'milk', limit: 10 });
      await adapter.search({ query: 'milk', limit: 10, page: 0 });
      await adapter.search({ query: 'milk', limit: 10, offset: 0 });
      await adapter.search({ query: 'milk', page: 1, limit: 10 });
      await adapter.search({ query: 'milk', limit: 10, offset: 10 });
      await adapter.search({ query: 'milk', page: 1, limit: 20 });
      expect(inner.search).toHaveBeenCalledTimes(3);
    });

    it('keys category filters without delimiter collisions', async () => {
      inner = createFakeAdapter();
      const adapter = new CachingProductAdapter(inner);
      await adapter.search({ categoryId: 'dairy' });
      await adapter.search({ categoryId: 'produce' });
      await adapter.search({ categoryIds: ['dairy', 'produce'] });
      await adapter.search({ categoryIds: ['dairy,produce'] });
      expect(inner.search).toHaveBeenCalledTimes(4);
    });

    it('does not share search results across adapter instances', async () => {
      const firstInner = createFakeAdapter({
        search: vi.fn().mockResolvedValue({ products: [fakeProduct('first')], hasMore: false }),
      });
      const secondInner = createFakeAdapter({
        search: vi.fn().mockResolvedValue({ products: [fakeProduct('second')], hasMore: false }),
      });
      const criteria = { query: 'milk' };

      const first = await new CachingProductAdapter(firstInner).search(criteria);
      const second = await new CachingProductAdapter(secondInner).search(criteria);

      expect(first.products[0].id).toBe('first');
      expect(second.products[0].id).toBe('second');
      expect(firstInner.search).toHaveBeenCalledTimes(1);
      expect(secondInner.search).toHaveBeenCalledTimes(1);
    });

    it('returns updated search data after explicit invalidation', async () => {
      const oldResult = { products: [fakeProduct('old')], hasMore: false };
      const updatedProduct = { ...fakeProduct('updated'), price: 125, stock: 3 };
      inner = createFakeAdapter({
        search: vi.fn()
          .mockResolvedValueOnce(oldResult)
          .mockResolvedValueOnce({ products: [updatedProduct], hasMore: false }),
      });
      const adapter = new CachingProductAdapter(inner);

      await adapter.search({ query: 'milk' });
      adapter.invalidate({ search: true });
      const refreshed = await adapter.search({ query: 'milk' });

      expect(refreshed.products[0]).toMatchObject({ id: 'updated', price: 125, stock: 3 });
      expect(inner.search).toHaveBeenCalledTimes(2);
    });
  });

  describe('getById', () => {
    it('caches product lookups', async () => {
      const product = fakeProduct('abc');
      inner = createFakeAdapter({ getById: vi.fn().mockResolvedValue(product) });
      const adapter = new CachingProductAdapter(inner);

      const id = createProductId('abc');
      const r1 = await adapter.getById(id);
      const r2 = await adapter.getById(id);

      expect(r1).toEqual(product);
      expect(r2).toEqual(product);
      expect(inner.getById).toHaveBeenCalledTimes(1);
    });

    it('caches null results', async () => {
      inner = createFakeAdapter({ getById: vi.fn().mockResolvedValue(null) });
      const adapter = new CachingProductAdapter(inner);

      const id = createProductId('missing');
      await adapter.getById(id);
      await adapter.getById(id);

      expect(inner.getById).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCategories', () => {
    it('caches category list', async () => {
      const cats: Category[] = [
        { id: '1', slug: 'dairy', name: 'Dairy', emoji: '🥛', parentId: null },
      ];
      inner = createFakeAdapter({ getCategories: vi.fn().mockResolvedValue(cats) });
      const adapter = new CachingProductAdapter(inner);

      await adapter.getCategories();
      await adapter.getCategories();

      expect(inner.getCategories).toHaveBeenCalledTimes(1);
    });
  });

  // ─── getByIdPrefix cache ──────────────────────────────────────────────────

  describe('getByIdPrefix', () => {
    it('caches a positive prefix result and suppresses a second upstream call', async () => {
      const product = fakeProduct('ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4');
      inner = createFakeAdapter({ getByIdPrefix: vi.fn().mockResolvedValue(product) });
      const adapter = new CachingProductAdapter(inner);

      const r1 = await adapter.getByIdPrefix('ae09a3ef');
      const r2 = await adapter.getByIdPrefix('ae09a3ef');

      expect(r1).toEqual(product);
      expect(r2).toEqual(product);
      expect(inner.getByIdPrefix).toHaveBeenCalledTimes(1);
    });

    it('caches a null (miss) prefix result', async () => {
      inner = createFakeAdapter({ getByIdPrefix: vi.fn().mockResolvedValue(null) });
      const adapter = new CachingProductAdapter(inner);

      await adapter.getByIdPrefix('deadbeef');
      await adapter.getByIdPrefix('deadbeef');

      expect(inner.getByIdPrefix).toHaveBeenCalledTimes(1);
    });

    it('treats equivalent normalized prefixes as the same cache key', async () => {
      const product = fakeProduct('ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4');
      inner = createFakeAdapter({ getByIdPrefix: vi.fn().mockResolvedValue(product) });
      const adapter = new CachingProductAdapter(inner);

      // Uppercase, lowercase, and padded should all share one slot
      await adapter.getByIdPrefix('AE09A3EF');
      await adapter.getByIdPrefix('ae09a3ef');
      await adapter.getByIdPrefix('  ae09a3ef  ');

      expect(inner.getByIdPrefix).toHaveBeenCalledTimes(1);
    });

    it('returns null for invalid prefixes without touching the inner adapter', async () => {
      inner = createFakeAdapter();
      const adapter = new CachingProductAdapter(inner);

      // Too short after normalization
      expect(await adapter.getByIdPrefix('ae')).toBeNull();
      // Too long
      expect(await adapter.getByIdPrefix('ae09a3ef5f2c4f148a9ca66c63e028b4f')).toBeNull();
      // No hex chars
      expect(await adapter.getByIdPrefix('zzzz')).toBeNull();
      // Malformed / non-hex characters in prefix
      expect(await adapter.getByIdPrefix('ae09-zz-a3ef')).toBeNull();
      expect(await adapter.getByIdPrefix('ab!cd')).toBeNull();
      // Arbitrary embedded hyphens (not canonical UUID)
      expect(await adapter.getByIdPrefix('ae09-a3ef')).toBeNull();
      expect(await adapter.getByIdPrefix('ae-09-a3-ef')).toBeNull();

      expect(inner.getByIdPrefix).not.toHaveBeenCalled();
    });

    it('normalizes full canonical UUID and contiguous hex to the same cache key', async () => {
      const product = fakeProduct('ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4');
      inner = createFakeAdapter({ getByIdPrefix: vi.fn().mockResolvedValue(product) });
      const adapter = new CachingProductAdapter(inner);

      await adapter.getByIdPrefix('ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4');
      await adapter.getByIdPrefix('ae09a3ef5f2c4f148a9ca66c63e028b4');

      expect(inner.getByIdPrefix).toHaveBeenCalledTimes(1);
    });

    it('does not cache RPC failures — propagates the error to callers', async () => {
      inner = createFakeAdapter({
        getByIdPrefix: vi.fn().mockRejectedValueOnce(new Error('resolver RPC failed')),
      });
      const adapter = new CachingProductAdapter(inner);

      await expect(adapter.getByIdPrefix('ae09a3ef')).rejects.toThrow('resolver RPC failed');

      // A subsequent call must retry the inner adapter, not return a cached null
      inner.getByIdPrefix = vi.fn().mockResolvedValue(fakeProduct('x'));
      const result = await adapter.getByIdPrefix('ae09a3ef');
      expect(result).not.toBeNull();
      expect(inner.getByIdPrefix).toHaveBeenCalledTimes(1);
    });

    it('does not share prefix cache across adapter instances (store/client isolation)', async () => {
      const product = fakeProduct('ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4');
      const inner1 = createFakeAdapter({ getByIdPrefix: vi.fn().mockResolvedValue(product) });
      const inner2 = createFakeAdapter({ getByIdPrefix: vi.fn().mockResolvedValue(null) });

      const adapter1 = new CachingProductAdapter(inner1);
      const adapter2 = new CachingProductAdapter(inner2);

      expect(await adapter1.getByIdPrefix('ae09a3ef')).not.toBeNull();
      expect(await adapter2.getByIdPrefix('ae09a3ef')).toBeNull();

      expect(inner1.getByIdPrefix).toHaveBeenCalledTimes(1);
      expect(inner2.getByIdPrefix).toHaveBeenCalledTimes(1);
    });

    it('re-fetches after TTL expires (stale positive result)', async () => {
      const v1 = fakeProduct('ae09a3ef-0001-4000-8000-000000000000');
      const v2 = fakeProduct('ae09a3ef-0002-4000-8000-000000000000');
      inner = createFakeAdapter({
        getByIdPrefix: vi.fn()
          .mockResolvedValueOnce(v1)
          .mockResolvedValueOnce(v2),
      });
      const adapter = new CachingProductAdapter(inner, {
        searchTtlMs: 60_000,
        productTtlMs: 50, // very short
        categoryTtlMs: 600_000,
        maxSearchEntries: 200,
        maxProductEntries: 500,
      });

      const r1 = await adapter.getByIdPrefix('ae09a3ef');
      await new Promise((r) => setTimeout(r, 60));
      const r2 = await adapter.getByIdPrefix('ae09a3ef');

      expect(r1?.id).toBe(v1.id);
      expect(r2?.id).toBe(v2.id);
      expect(inner.getByIdPrefix).toHaveBeenCalledTimes(2);
    });

    it('re-fetches after TTL expires (stale null / ambiguous result)', async () => {
      inner = createFakeAdapter({
        getByIdPrefix: vi.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(fakeProduct('ae09a3ef-0001-4000-8000-000000000000')),
      });
      const adapter = new CachingProductAdapter(inner, {
        searchTtlMs: 60_000,
        productTtlMs: 50,
        categoryTtlMs: 600_000,
        maxSearchEntries: 200,
        maxProductEntries: 500,
      });

      expect(await adapter.getByIdPrefix('ae09a3ef')).toBeNull();
      await new Promise((r) => setTimeout(r, 60));
      expect(await adapter.getByIdPrefix('ae09a3ef')).not.toBeNull();
      expect(inner.getByIdPrefix).toHaveBeenCalledTimes(2);
    });
  });

  // ─── invalidate ───────────────────────────────────────────────────────────

  describe('invalidate', () => {
    it('clears all caches when called with no args', async () => {
      inner = createFakeAdapter();
      const adapter = new CachingProductAdapter(inner);

      await adapter.search({ query: 'x' });
      await adapter.getById(createProductId('1'));
      await adapter.getCategories();

      adapter.invalidate();

      await adapter.search({ query: 'x' });
      await adapter.getById(createProductId('1'));
      await adapter.getCategories();

      expect(inner.search).toHaveBeenCalledTimes(2);
      expect(inner.getById).toHaveBeenCalledTimes(2);
      expect(inner.getCategories).toHaveBeenCalledTimes(2);
    });

    it('selectively invalidates search cache', async () => {
      inner = createFakeAdapter();
      const adapter = new CachingProductAdapter(inner);

      await adapter.search({ query: 'x' });
      await adapter.getCategories();

      adapter.invalidate({ search: true });

      await adapter.search({ query: 'x' });
      await adapter.getCategories();

      expect(inner.search).toHaveBeenCalledTimes(2);
      expect(inner.getCategories).toHaveBeenCalledTimes(1); // still cached
    });

    it('selectively invalidates specific products', async () => {
      inner = createFakeAdapter({
        getById: vi.fn().mockResolvedValue(fakeProduct('a')),
      });
      const adapter = new CachingProductAdapter(inner);

      const idA = createProductId('a');
      const idB = createProductId('b');

      await adapter.getById(idA);
      await adapter.getById(idB);

      adapter.invalidate({ products: [idA] });

      await adapter.getById(idA); // should re-fetch
      await adapter.getById(idB); // should still be cached

      expect(inner.getById).toHaveBeenCalledTimes(3); // 2 initial + 1 re-fetch for 'a'
    });

    it('clears all prefix cache entries when any product is invalidated', async () => {
      const product = fakeProduct('ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4');
      inner = createFakeAdapter({
        getById: vi.fn().mockResolvedValue(product),
        getByIdPrefix: vi.fn().mockResolvedValue(product),
      });
      const adapter = new CachingProductAdapter(inner);

      // Warm up two prefix cache entries
      await adapter.getByIdPrefix('ae09a3ef');
      await adapter.getByIdPrefix('deadbeef');

      // Invalidate one product by ID — should also evict all prefix entries
      adapter.invalidate({ products: [createProductId('ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4')] });

      // Both prefixes must trigger new upstream calls
      await adapter.getByIdPrefix('ae09a3ef');
      await adapter.getByIdPrefix('deadbeef');

      expect(inner.getByIdPrefix).toHaveBeenCalledTimes(4); // 2 warm + 2 re-fetch
    });

    it('does not evict prefix entries when only search is invalidated', async () => {
      const product = fakeProduct('ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4');
      inner = createFakeAdapter({ getByIdPrefix: vi.fn().mockResolvedValue(product) });
      const adapter = new CachingProductAdapter(inner);

      await adapter.getByIdPrefix('ae09a3ef');
      adapter.invalidate({ search: true });
      await adapter.getByIdPrefix('ae09a3ef');

      // Prefix cache still warm — no additional upstream call
      expect(inner.getByIdPrefix).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStats', () => {
    it('reports cache entry counts', async () => {
      inner = createFakeAdapter();
      const adapter = new CachingProductAdapter(inner);

      expect(adapter.getStats()).toEqual({
        searchEntries: 0,
        productEntries: 0,
        categoryEntries: 0,
      });

      await adapter.search({ query: 'x' });
      await adapter.getById(createProductId('1'));
      await adapter.getCategories();

      expect(adapter.getStats()).toEqual({
        searchEntries: 1,
        productEntries: 1,
        categoryEntries: 1,
      });
    });
  });

  describe('LRU eviction', () => {
    it('evicts oldest search entries when maxSearchEntries exceeded', async () => {
      inner = createFakeAdapter();
      const adapter = new CachingProductAdapter(inner, {
        searchTtlMs: 60_000,
        productTtlMs: 300_000,
        categoryTtlMs: 600_000,
        maxSearchEntries: 2,
        maxProductEntries: 500,
      });

      await adapter.search({ query: 'a' });
      await adapter.search({ query: 'b' });
      await adapter.search({ query: 'c' }); // evicts 'a'

      expect(adapter.getStats().searchEntries).toBe(2);

      // 'a' was evicted, should re-fetch
      await adapter.search({ query: 'a' });
      expect(inner.search).toHaveBeenCalledTimes(4); // 3 initial + 1 re-fetch
    });

    it('evicts oldest product entries when maxProductEntries exceeded', async () => {
      inner = createFakeAdapter({
        getById: vi.fn().mockResolvedValue(fakeProduct('x')),
      });
      const adapter = new CachingProductAdapter(inner, {
        searchTtlMs: 60_000,
        productTtlMs: 300_000,
        categoryTtlMs: 600_000,
        maxSearchEntries: 200,
        maxProductEntries: 2,
      });

      await adapter.getById(createProductId('1'));
      await adapter.getById(createProductId('2'));
      await adapter.getById(createProductId('3')); // evicts '1'

      expect(adapter.getStats().productEntries).toBe(2);

      // '1' was evicted, should re-fetch
      await adapter.getById(createProductId('1'));
      expect(inner.getById).toHaveBeenCalledTimes(4);
    });
  });

  describe('request deduplication (in-flight coalescing)', () => {
    function deferred<T>() {
      let resolve!: (v: T) => void;
      let reject!: (e: unknown) => void;
      const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
      return { promise, resolve, reject };
    }

    it('coalesces concurrent identical search calls into one inner call', async () => {
      const gate = deferred<PaginatedProducts>();
      inner = createFakeAdapter({ search: vi.fn().mockReturnValue(gate.promise) });
      const adapter = new CachingProductAdapter(inner);

      const [a, b] = [adapter.search({ query: 'tea' }), adapter.search({ query: 'tea' })];
      gate.resolve({ products: [fakeProduct('1')], hasMore: false });
      const results = await Promise.all([a, b]);

      expect(inner.search).toHaveBeenCalledTimes(1);
      expect(results[0]).toEqual(results[1]);
    });

    it('does not coalesce searches with different criteria', async () => {
      const gate1 = deferred<PaginatedProducts>();
      const gate2 = deferred<PaginatedProducts>();
      inner = createFakeAdapter({
        search: vi.fn()
          .mockReturnValueOnce(gate1.promise)
          .mockReturnValueOnce(gate2.promise),
      });
      const adapter = new CachingProductAdapter(inner);

      const a = adapter.search({ query: 'tea' });
      const b = adapter.search({ query: 'coffee' });
      gate1.resolve({ products: [], hasMore: false });
      gate2.resolve({ products: [], hasMore: false });
      await Promise.all([a, b]);

      expect(inner.search).toHaveBeenCalledTimes(2);
    });

    it('coalesces concurrent identical getByIdPrefix calls', async () => {
      const gate = deferred<Product | null>();
      inner = createFakeAdapter({ getByIdPrefix: vi.fn().mockReturnValue(gate.promise) });
      const adapter = new CachingProductAdapter(inner);

      const [a, b] = [adapter.getByIdPrefix('ae09a3ef'), adapter.getByIdPrefix('ae09a3ef')];
      gate.resolve(fakeProduct('1'));
      const results = await Promise.all([a, b]);

      expect(inner.getByIdPrefix).toHaveBeenCalledTimes(1);
      expect(results[0]).toEqual(results[1]);
    });

    it('coalesces concurrent getCategories calls', async () => {
      const gate = deferred<Category[]>();
      inner = createFakeAdapter({ getCategories: vi.fn().mockReturnValue(gate.promise) });
      const adapter = new CachingProductAdapter(inner);

      const [a, b] = [adapter.getCategories(), adapter.getCategories()];
      gate.resolve([]);
      await Promise.all([a, b]);

      expect(inner.getCategories).toHaveBeenCalledTimes(1);
    });

    it('does not cache or coalesce after an inner failure — next call retries', async () => {
      const gate = deferred<Product | null>();
      inner = createFakeAdapter({
        getByIdPrefix: vi.fn()
          .mockReturnValueOnce(gate.promise)
          .mockResolvedValueOnce(fakeProduct('1')),
      });
      const adapter = new CachingProductAdapter(inner);

      const first = adapter.getByIdPrefix('ae09a3ef');
      const second = adapter.getByIdPrefix('ae09a3ef');
      gate.reject(new Error('resolver RPC failed'));

      await expect(first).rejects.toThrow('resolver RPC failed');
      await expect(second).rejects.toThrow('resolver RPC failed');
      expect(inner.getByIdPrefix).toHaveBeenCalledTimes(1);

      // Failure was not cached: a later call hits the inner adapter again and succeeds.
      const recovered = await adapter.getByIdPrefix('ae09a3ef');
      expect(recovered).not.toBeNull();
      expect(inner.getByIdPrefix).toHaveBeenCalledTimes(2);
    });

    it('does not repopulate an invalidated cache when an in-flight search settles after invalidate()', async () => {
      const gate = deferred<PaginatedProducts>();
      inner = createFakeAdapter({
        search: vi.fn()
          .mockReturnValueOnce(gate.promise)
          .mockResolvedValueOnce({ products: [fakeProduct('fresh')], hasMore: false }),
      });
      const adapter = new CachingProductAdapter(inner);

      const pending = adapter.search({ query: 'tea' });
      adapter.invalidate({ search: true });
      gate.resolve({ products: [fakeProduct('stale')], hasMore: false });
      // The waiting caller still receives its resolved value.
      await expect(pending).resolves.toEqual({ products: [fakeProduct('stale')], hasMore: false });

      // Cache must be empty: the stale response was not committed.
      expect(adapter.getStats().searchEntries).toBe(0);

      // A later search refetches and caches fresh data.
      const fresh = await adapter.search({ query: 'tea' });
      expect(inner.search).toHaveBeenCalledTimes(2);
      expect(fresh.products[0]?.name).toBe('Product fresh');
      expect(adapter.getStats().searchEntries).toBe(1);
    });

    it('does not repopulate an invalidated cache when an in-flight getById settles after full invalidate()', async () => {
      const gate = deferred<Product | null>();
      inner = createFakeAdapter({
        getById: vi.fn()
          .mockReturnValueOnce(gate.promise)
          .mockResolvedValueOnce(fakeProduct('fresh')),
      });
      const adapter = new CachingProductAdapter(inner);

      const pending = adapter.getById(createProductId('1'));
      adapter.invalidate(); // full clear bumps all domains
      gate.resolve(fakeProduct('stale'));
      await expect(pending).resolves.toEqual(fakeProduct('stale'));

      expect(adapter.getStats().productEntries).toBe(0);
      const fresh = await adapter.getById(createProductId('1'));
      expect(fresh).toEqual(fakeProduct('fresh'));
      expect(inner.getById).toHaveBeenCalledTimes(2);
    });

    it('does not commit an in-flight prefix result after product invalidation', async () => {
      const gate = deferred<Product | null>();
      inner = createFakeAdapter({
        getByIdPrefix: vi.fn()
          .mockReturnValueOnce(gate.promise)
          .mockResolvedValueOnce(fakeProduct('fresh')),
      });
      const adapter = new CachingProductAdapter(inner);

      const pending = adapter.getByIdPrefix('ae09a3ef');
      adapter.invalidate({ products: [createProductId('other')] });
      gate.resolve(fakeProduct('stale'));
      await expect(pending).resolves.toEqual(fakeProduct('stale'));

      expect(adapter.getStats().productEntries).toBe(0);
      await adapter.getByIdPrefix('ae09a3ef');
      expect(inner.getByIdPrefix).toHaveBeenCalledTimes(2);
    });

    it('does not commit in-flight categories after category invalidation but leaves search cache intact', async () => {
      const catGate = deferred<Category[]>();
      inner = createFakeAdapter({
        getCategories: vi.fn()
          .mockReturnValueOnce(catGate.promise)
          .mockResolvedValueOnce([]),
        search: vi.fn().mockResolvedValue({ products: [fakeProduct('1')], hasMore: false }),
      });
      const adapter = new CachingProductAdapter(inner);

      await adapter.search({ query: 'tea' }); // populate search cache
      const pending = adapter.getCategories();
      adapter.invalidate({ categories: true });
      catGate.resolve([]);
      await pending;

      expect(adapter.getStats().categoryEntries).toBe(0);
      // Unrelated search cache survives a category-only invalidation.
      expect(adapter.getStats().searchEntries).toBe(1);

      await adapter.getCategories();
      expect(inner.getCategories).toHaveBeenCalledTimes(2);
    });

    it('commits normally when invalidation targets an unrelated domain', async () => {
      const gate = deferred<PaginatedProducts>();
      inner = createFakeAdapter({ search: vi.fn().mockReturnValue(gate.promise) });
      const adapter = new CachingProductAdapter(inner);

      const pending = adapter.search({ query: 'tea' });
      adapter.invalidate({ categories: true }); // unrelated domain
      gate.resolve({ products: [fakeProduct('1')], hasMore: false });
      await pending;

      expect(adapter.getStats().searchEntries).toBe(1);
    });

    it('starts a fresh fetch for callers arriving after invalidate() instead of joining the stale in-flight', async () => {
      const gate = deferred<PaginatedProducts>();
      inner = createFakeAdapter({
        search: vi.fn()
          .mockReturnValueOnce(gate.promise)
          .mockResolvedValueOnce({ products: [fakeProduct('fresh')], hasMore: false }),
      });
      const adapter = new CachingProductAdapter(inner);

      const staleLeader = adapter.search({ query: 'tea' });
      adapter.invalidate({ search: true });

      // Post-invalidation caller must not join the pre-invalidation leader.
      const postInvalidate = adapter.search({ query: 'tea' });
      gate.resolve({ products: [fakeProduct('stale')], hasMore: false });

      await expect(staleLeader).resolves.toEqual({ products: [fakeProduct('stale')], hasMore: false });
      await expect(postInvalidate).resolves.toEqual({ products: [fakeProduct('fresh')], hasMore: false });
      expect(inner.search).toHaveBeenCalledTimes(2);
      // The committed entry is the fresh one, not the stale leader's result.
      expect(adapter.getStats().searchEntries).toBe(1);
      const cached = await adapter.search({ query: 'tea' });
      expect(cached.products[0]?.name).toBe('Product fresh');
      expect(inner.search).toHaveBeenCalledTimes(2);
    });

    it('propagates category invalidation to an inner adapter with its own category cache', async () => {
      const invalidateCategoriesCache = vi.fn();
      inner = createFakeAdapter({
        getCategories: vi.fn().mockResolvedValue([]),
        invalidateCategoriesCache,
      } as Partial<ProductDataPort> as ProductDataPort);
      const adapter = new CachingProductAdapter(inner);

      adapter.invalidate({ categories: true });
      expect(invalidateCategoriesCache).toHaveBeenCalledTimes(1);

      adapter.invalidate();
      expect(invalidateCategoriesCache).toHaveBeenCalledTimes(2);

      // Unrelated domains must not touch the inner category cache.
      adapter.invalidate({ search: true });
      expect(invalidateCategoriesCache).toHaveBeenCalledTimes(2);
    });

    it('serves subsequent calls from cache once an in-flight request settles', async () => {
      const gate = deferred<Product | null>();
      inner = createFakeAdapter({ getById: vi.fn().mockReturnValue(gate.promise) });
      const adapter = new CachingProductAdapter(inner);

      const pending = adapter.getById(createProductId('1'));
      gate.resolve(fakeProduct('1'));
      await pending;

      await adapter.getById(createProductId('1'));
      expect(inner.getById).toHaveBeenCalledTimes(1);
      expect(adapter.getStats().productEntries).toBe(1);
    });
  });
});
