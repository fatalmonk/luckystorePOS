import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CachingProductAdapter } from './CachingProductAdapter';
import type { ProductDataPort, PaginatedProducts, Category, Product, ProductId } from '../types';
import { createProductId } from '../types';

function createFakeAdapter(overrides?: Partial<ProductDataPort>): ProductDataPort {
  return {
    search: vi.fn().mockResolvedValue({ products: [], hasMore: false }),
    getById: vi.fn().mockResolvedValue(null),
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
});
