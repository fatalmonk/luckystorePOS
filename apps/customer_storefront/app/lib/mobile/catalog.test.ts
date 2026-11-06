import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMobileCatalog, sortProducts, toMobileCatalog } from './catalog';
import type { Category, Product } from '../products/types';
import { createProductId } from '../products/types';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../supabase', () => ({ supabase: { rpc } }));
vi.mock('../products/getCachedCategories', () => ({ getCachedCategoriesOrThrow: vi.fn() }));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown, keyParts: string[]) => {
    const cache = new Map<string, unknown>();
    return async (...args: unknown[]) => {
      const key = JSON.stringify([keyParts, args]);
      if (cache.has(key)) return cache.get(key);
      const value = await fn(...args);
      cache.set(key, value);
      return value;
    };
  },
}));
import { getCachedCategoriesOrThrow } from '../products/getCachedCategories';

describe('mobile catalog adapter', () => {
  const dummyCategories: Category[] = [
    { id: 'c1', slug: 'rice-and-grain', name: 'Rice & Grains', emoji: '🌾' },
    { id: 'c2', slug: 'oil-and-ghee', name: 'Oil & Ghee', emoji: '🛢️' },
    { id: 'c3', slug: 'tea-and-coffee', name: 'Tea & Coffee', emoji: '☕' },
  ];

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requests one server-filtered page and preserves totals, stock, prices, and Bengali labels', async () => {
    vi.mocked(getCachedCategoriesOrThrow).mockResolvedValue(dummyCategories);
    rpc.mockResolvedValue({
      data: {
        total: 61,
        items: [{
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Chinigura Rice 1kg',
          bengali_name: 'চিনিগুঁড়া চাল ১ কেজি',
          description: 'Premium rice',
          bengali_description: 'উন্নত মানের চাল',
          price: 180,
          mrp: 210,
          sellable_qty: 3,
          category: 'Rice & Grains',
          category_id: 'c1',
          image_url: 'https://example.invalid/rice.jpg',
        }],
      },
      error: null,
    });

    const result = await getMobileCatalog({
      locale: 'bn',
      category: 'rice-and-grain',
      q: 'চাল',
      sort: 'price-asc',
      inStockOnly: true,
      limit: 10,
      offset: 50,
    });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('search_storefront_mobile_catalog_v1', {
      p_store_id: '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd',
      p_query: 'চাল',
      p_category_ids: ['c1'],
      p_in_stock_only: true,
      p_sort: 'price-asc',
      p_limit: 10,
      p_offset: 50,
    });
    expect(result.total).toBe(61);
    expect(result.hasMore).toBe(true);
    expect(result.items[0]).toMatchObject({
      name: 'চিনিগুঁড়া চাল ১ কেজি',
      description: 'উন্নত মানের চাল',
      price: 180,
      originalPrice: 210,
      stock: 3,
      categoryId: 'c1',
    });
  });

  it('keeps an exact empty-page total and normalizes invalid sort values to best', async () => {
    vi.mocked(getCachedCategoriesOrThrow).mockResolvedValue(dummyCategories);
    rpc.mockResolvedValue({ data: { total: 4, items: [] }, error: null });

    const result = await getMobileCatalog({ sort: 'unsupported' as never, offset: 60 });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_sort: 'best', p_offset: 60 });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(4);
    expect(result.hasMore).toBe(false);
  });

  it('reuses the same server catalog query for a warm cache entry', async () => {
    vi.mocked(getCachedCategoriesOrThrow).mockResolvedValue(dummyCategories);
    rpc.mockResolvedValue({ data: { total: 0, items: [] }, error: null });

    await getMobileCatalog({ q: 'cache-probe', limit: 20, offset: 0 });
    await getMobileCatalog({ q: 'cache-probe', limit: 20, offset: 0 });

    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('propagates category lookup failures instead of sending an empty category filter', async () => {
    vi.mocked(getCachedCategoriesOrThrow).mockRejectedValueOnce(new Error('categories unavailable'));

    await expect(getMobileCatalog({ category: 'rice-and-grain' })).rejects.toThrow('categories unavailable');
    expect(rpc).not.toHaveBeenCalled();
  });

  const dummyProducts: Product[] = [
    {
      id: createProductId('p1'),
      name: 'Chinigura Rice 1kg',
      emoji: '🌾',
      price: 160,
      unit: 'kg',
      category: 'rice-and-grain',
      stock: 10,
      description: 'Aromatic rice',
    },
    {
      id: createProductId('p2'),
      name: 'Soybean Oil 5L',
      emoji: '🛢️',
      price: 850,
      unit: 'bottle',
      category: 'oil-and-ghee',
      stock: 0,
      description: 'Refined oil',
    },
    {
      id: createProductId('p3'),
      name: 'Black Tea 400g',
      emoji: '☕',
      price: 240,
      unit: 'pack',
      category: 'tea-and-coffee',
      stock: 5,
      description: 'Premium tea',
    },
  ];

  it('sorts products by price ascending', () => {
    const sorted = sortProducts(dummyProducts, 'price-asc');
    expect(sorted.map((p) => p.price)).toEqual([160, 240, 850]);
  });

  it('sorts products by price descending', () => {
    const sorted = sortProducts(dummyProducts, 'price-desc');
    expect(sorted.map((p) => p.price)).toEqual([850, 240, 160]);
  });

  it('sorts products by name ascending', () => {
    const sorted = sortProducts(dummyProducts, 'name-asc');
    expect(sorted.map((p) => p.name)).toEqual(['Black Tea 400g', 'Chinigura Rice 1kg', 'Soybean Oil 5L']);
  });

  it('prioritizes in-stock items in best sort', () => {
    const sorted = sortProducts(dummyProducts, 'best');
    expect(sorted[sorted.length - 1].stock).toBe(0);
  });

  it('filters by category and inStockOnly', () => {
    const page = toMobileCatalog(dummyCategories, dummyProducts, {
      category: 'rice-and-grain',
      inStockOnly: true,
      locale: 'bn',
    });
    expect(page.locale).toBe('bn');
    expect(page.items.length).toBe(1);
    expect(page.items[0].id).toBe('p1');
    expect(page.total).toBe(1);
    expect(page.category?.name).toBe('চাল ও শস্য');
  });

  it('searches products by query string', () => {
    const page = toMobileCatalog(dummyCategories, dummyProducts, {
      q: 'Tea',
    });
    expect(page.items.length).toBe(1);
    expect(page.items[0].name).toBe('Black Tea 400g');
  });

  it('filters by category group slug and label-derived variants', () => {
    const biscuitCategories: Category[] = [
      { id: 'c4', slug: 'biscuits-and-cookies', name: 'Biscuits & Cookies', emoji: '🍪' },
    ];
    const biscuitProducts: Product[] = [
      {
        id: createProductId('b1'),
        name: 'Digestive Biscuits 200g',
        emoji: '🍪',
        price: 90,
        unit: 'pack',
        category: 'biscuits',
        stock: 10,
        description: 'Crispy wholewheat biscuits',
      },
      {
        id: createProductId('b2'),
        name: 'Chocolate Chip Cookies 150g',
        emoji: '🍪',
        price: 120,
        unit: 'pack',
        category: 'cookies',
        stock: 5,
        description: 'Rich chocolate chip cookies',
      },
      {
        id: createProductId('b3'),
        name: 'Butter Biscuits Group Pack',
        emoji: '🍪',
        price: 150,
        unit: 'box',
        category: 'biscuits-and-cookies',
        stock: 8,
        description: 'Assorted butter biscuits',
      },
      {
        id: createProductId('b4'),
        name: 'Soybean Oil 1L',
        emoji: '🛢️',
        price: 190,
        unit: 'bottle',
        category: 'oil-and-ghee',
        stock: 20,
        description: 'Pure soybean cooking oil',
      },
    ];

    // Query by canonical group slug
    const pageFromSlug = toMobileCatalog(biscuitCategories, biscuitProducts, {
      category: 'biscuits-and-cookies',
    });
    expect(pageFromSlug.items.map((p) => p.id)).toEqual(['b1', 'b2', 'b3']);

    // Query by label-derived variant
    const pageFromLabel = toMobileCatalog(biscuitCategories, biscuitProducts, {
      category: 'Biscuits & Cookies',
    });
    expect(pageFromLabel.items.map((p) => p.id)).toEqual(['b1', 'b2', 'b3']);
  });
});
