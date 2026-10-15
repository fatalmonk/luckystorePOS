import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '../types';
import { RuleBasedBrandParser } from './index';

const { search, getCategories } = vi.hoisted(() => ({
  search: vi.fn(),
  getCategories: vi.fn(),
}));

vi.mock('../supabase', () => ({ supabase: {} }));

vi.mock('./index', () => ({
  createProductRepository: vi.fn(() => ({ repo: { search, getCategories, getById: vi.fn() } })),
  RuleBasedBrandParser: vi.fn().mockImplementation(() => ({ parse: (value: string) => value })),
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
    getCategories.mockResolvedValue([
      { id: 'category-rice', slug: 'rice-and-grain', name: 'Rice & Grain', emoji: '🌾' },
    ]);
    vi.mocked(RuleBasedBrandParser).mockImplementation(
      () => ({ parse: (value: string) => value }) as never,
    );
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
