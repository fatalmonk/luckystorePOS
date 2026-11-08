import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '../types';
import { RuleBasedBrandParser } from './index';

const { search, getCategories, supabaseFrom } = vi.hoisted(() => ({
  search: vi.fn(),
  getCategories: vi.fn(),
  supabaseFrom: vi.fn(),
}));

vi.mock('../supabase', () => ({ supabase: { from: supabaseFrom } }));

vi.mock('./index', () => ({
  createProductRepository: vi.fn(() => ({ repo: { search, getCategories, getById: vi.fn() } })),
  createAnonymousStorefrontProductRepository: vi.fn(() => ({ repo: { search, getCategories, getById: vi.fn() } })),
  RuleBasedBrandParser: vi.fn().mockImplementation(function (this: { parse: (value: string) => string }) {
    this.parse = (value: string) => value;
  }),
}));

vi.mock('../storefront-promotions', () => ({
  getActiveWeeklyDealEdition: vi.fn(() => []),
  loadCurrentStorefrontDealCampaign: vi.fn(async () => []),
}));

import { getHomePageData } from './getHomePageData';

const product: Product = {
  id: 'catalogue-fixture',
  name: 'Test Rice',
  emoji: '🌾',
  price: 85,
  unit: '1 kg',
  category: 'rice-and-grain',
  stock: 5,
  description: 'Test fixture',
};

describe('getHomePageData catalogue diagnostics', () => {
  beforeEach(() => {
    search.mockReset();
    getCategories.mockReset();
    supabaseFrom.mockReset();
    getCategories.mockResolvedValue([
      { id: 'category-rice', slug: 'rice-and-grain', name: 'Rice & Grain', emoji: '🌾' },
    ]);
    vi.mocked(RuleBasedBrandParser).mockImplementation(function (this: { parse: (value: string) => string }) {
      this.parse = (value: string) => value;
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the main catalogue when the optional brand search fails and identifies that request', async () => {
    search
      .mockResolvedValueOnce({ products: [product], hasMore: false })
      .mockRejectedValueOnce(Object.assign(new Error('Search service temporarily unavailable'), { code: 'RPC_ERROR' }));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const data = await getHomePageData('en');

    expect(data.inStock).toEqual([product]);
    expect(error).toHaveBeenCalledWith('[homepage-catalog] request failed', {
      source: 'Nestle product search',
      errorName: 'Error',
      errorCode: 'RPC_ERROR',
    });
  });

  it('reports when the main search returns products but none are sellable', async () => {
    search
      .mockResolvedValueOnce({ products: [{ ...product, stock: 0 }], hasMore: false })
      .mockResolvedValueOnce({ products: [], hasMore: false });
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const data = await getHomePageData('en');

    expect(data.inStock).toEqual([]);
    expect(warning).toHaveBeenCalledWith('[homepage-catalog] request returned an empty or unusable result', {
      source: 'all-products search',
      productCount: 1,
      sellableProductCount: 0,
    });
  });

  it('does not warn when the optional Nestle search returns no matches', async () => {
    search
      .mockResolvedValueOnce({ products: [product], hasMore: false })
      .mockResolvedValueOnce({ products: [], hasMore: false });
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await getHomePageData('en');

    expect(warning).not.toHaveBeenCalledWith(
      '[homepage-catalog] request returned an empty or unusable result',
      expect.objectContaining({ source: 'Nestle product search' }),
    );
  });

});

describe('getHomePageData Bengali overlay (PR 2B defect fix)', () => {
  beforeEach(() => {
    search.mockReset();
    getCategories.mockReset();
    supabaseFrom.mockReset();
    getCategories.mockResolvedValue([
      { id: 'category-rice', slug: 'rice-and-grain', name: 'Rice & Grain', emoji: '🌾' },
    ]);
    vi.mocked(RuleBasedBrandParser).mockImplementation(function (this: { parse: (value: string) => string }) {
      this.parse = (value: string) => value;
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('issues ZERO item_translations requests when the search overlay resolved every product (even with no translations)', async () => {
    // Live-catalog response: translation lookup already completed successfully
    // in the shared search overlay; none of the products have a bn row.
    const liveProducts = [
      { ...product, id: 'p1', stock: 5, bengaliTranslationResolved: true },
      { ...product, id: 'p2', name: 'Other Rice', stock: 3, bengaliTranslationResolved: true },
    ];
    search
      .mockResolvedValueOnce({ products: liveProducts, hasMore: false })
      .mockResolvedValueOnce({ products: [], hasMore: false });

    const data = await getHomePageData('bn');

    expect(supabaseFrom).not.toHaveBeenCalled();
    // Bengali fallback preserved: base-language names remain.
    expect(data.inStock.map((p) => p.name)).toEqual(['Test Rice', 'Other Rice']);
  });

  it('applies in-memory Bengali names without a DB read when resolved with translations', async () => {
    const liveProducts = [
      {
        ...product, id: 'p1', stock: 5,
        bengaliName: 'টেস্ট রাইস', bengaliDescription: 'বিবরণ',
        bengaliTranslationResolved: true,
      },
    ];
    search
      .mockResolvedValueOnce({ products: liveProducts, hasMore: false })
      .mockResolvedValueOnce({ products: [], hasMore: false });

    const data = await getHomePageData('bn');

    expect(supabaseFrom).not.toHaveBeenCalled();
    expect(data.inStock[0].name).toBe('টেস্ট রাইস');
    expect(data.inStock[0].originalName).toBe('Test Rice');
  });

  it('falls back to a DB read for unresolved (snapshot/unqueried) products only', async () => {
    const mixed = [
      { ...product, id: 'p1', stock: 5, bengaliTranslationResolved: true },
      { ...product, id: 'p2', name: 'Snapshot Rice', stock: 2 },
    ];
    search
      .mockResolvedValueOnce({ products: mixed, hasMore: false })
      .mockResolvedValueOnce({ products: [], hasMore: false });

    const inFn = vi.fn().mockReturnThis();
    supabaseFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      in: inFn,
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [{ item_id: 'p2', name: 'স্ন্যাপশট রাইস', description: null }], error: null }),
      }),
    }));

    const data = await getHomePageData('bn');

    expect(supabaseFrom).toHaveBeenCalledWith('item_translations');
    // Only the unresolved product is queried — never the resolved one.
    expect(inFn).toHaveBeenCalledWith('item_id', ['p2']);
    const names = new Map(data.inStock.map((p) => [p.id, p.name]));
    expect(names.get('p1')).toBe('Test Rice');
    expect(names.get('p2')).toBe('স্ন্যাপশট রাইস');
  });

  it('degrades to base-language content when the fallback translation read fails', async () => {
    const unresolved = [{ ...product, id: 'p1', stock: 5 }];
    search
      .mockResolvedValueOnce({ products: unresolved, hasMore: false })
      .mockResolvedValueOnce({ products: [], hasMore: false });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    supabaseFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'timeout' } }),
      }),
    }));

    const data = await getHomePageData('bn');

    expect(data.inStock[0].name).toBe('Test Rice');
    errorSpy.mockRestore();
  });
});
