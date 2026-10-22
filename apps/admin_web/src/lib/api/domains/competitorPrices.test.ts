import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mocks.rpc,
    from: mocks.from,
  },
}));

import {
  addCompetitorPrice,
  calculatePriceGapFraction,
  fetchCompetitorPrices,
  fetchCompetitorPriceCounts,
  fetchEffectiveCompetitorPrices,
  fetchPriceAlerts,
  formatPriceGapPercent,
  linkScrapedProductToItem,
  normalizeCompetitorKey,
  setManualCompetitorPrice,
} from './competitorPrices';

describe('competitor price API', () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    mocks.from.mockReset();
    mocks.select.mockReset();
    mocks.eq.mockReset();
    mocks.order.mockReset();
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ order: mocks.order });
    mocks.order.mockResolvedValue({ data: null, error: null });
  });

  it('normalizes competitor keys consistently', () => {
    expect(normalizeCompetitorKey('  Aamader Bazaar (BD) ')).toBe('aamader-bazaar-bd');
  });

  it('calculates signed gaps with positive meaning Lucky Store is more expensive', () => {
    expect(calculatePriceGapFraction(945, 1300)).toBeCloseTo(-0.2730769, 6);
    expect(formatPriceGapPercent(calculatePriceGapFraction(945, 1300))).toBe('-27.31%');
    expect(calculatePriceGapFraction(1300, 945)).toBeCloseTo(0.3756614, 6);
    expect(formatPriceGapPercent(calculatePriceGapFraction(1300, 945))).toBe('+37.57%');
    expect(calculatePriceGapFraction(140, 135)).toBeCloseTo(0.037, 4);
    expect(calculatePriceGapFraction(135, 140)).toBeCloseTo(-0.0357, 4);
    expect(calculatePriceGapFraction(135, 135)).toBe(0);
    expect(formatPriceGapPercent(0)).toBe('0.00%');
    expect(calculatePriceGapFraction(140, 0)).toBeNull();
    expect(calculatePriceGapFraction(0, 135)).toBeNull();
    expect(calculatePriceGapFraction(140, -135)).toBeNull();
    expect(calculatePriceGapFraction(-1, 135)).toBeNull();
    expect(calculatePriceGapFraction(null, 135)).toBeNull();
    expect(calculatePriceGapFraction(Number.NaN, 135)).toBeNull();
    expect(calculatePriceGapFraction(Number.POSITIVE_INFINITY, 135)).toBeNull();
    expect(calculatePriceGapFraction(Number.MAX_VALUE, Number.MIN_VALUE)).toBeNull();
    expect(formatPriceGapPercent(null)).toBe('N/A');
    expect(formatPriceGapPercent(Number.NaN)).toBe('N/A');
    expect(formatPriceGapPercent(1_000)).toBe('+100000.00%');
    expect(formatPriceGapPercent(Number.MAX_VALUE)).toBe('N/A');
  });

  it('fetches effective prices through the store-scoped RPC', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [{
        competitor_key: 'chaldal', status: 'fresh',
        our_price: 945, competitor_price: 1300, price_gap_percent: 37.57,
        matcher_version: 'safe-v2:VERIFIED:barcode-and-attributes',
      }],
      error: null,
    });

    const [price] = await fetchEffectiveCompetitorPrices('store-1', 'item-1');
    expect(price.price_gap_percent).toBeCloseTo(-0.2730769, 6);
    expect(mocks.rpc).toHaveBeenCalledWith('get_effective_competitor_prices', {
      p_store_id: 'store-1',
      p_item_id: 'item-1',
    });
  });

  it('excludes non-verified observations from effective pricing consumers', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [
        {
          competitor_key: 'chaldal', status: 'fresh', item_id: 'item-1',
          our_price: 945, competitor_price: 1300, matcher_version: 'safe-v2:PROBABLE:name-similar',
        },
        {
          competitor_key: 'shwapno', status: 'fresh', item_id: 'item-1',
          our_price: 945, competitor_price: 1250, matcher_version: 'safe-v2:VERIFIED:brand-variant-package-exact',
        },
      ],
      error: null,
    });

    const prices = await fetchEffectiveCompetitorPrices('store-1', 'item-1');
    expect(prices.map((price) => price.competitor_key)).toEqual(['shwapno']);
  });

  it('excludes zero-priced effective observations from pricing consumers', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [{
        competitor_key: 'chaldal', status: 'fresh', item_id: 'item-1',
        our_price: 0, competitor_price: 1300, matcher_version: 'safe-v2:VERIFIED:brand-variant-package-exact',
      }],
      error: null,
    });

    await expect(fetchEffectiveCompetitorPrices('store-1', 'item-1')).resolves.toEqual([]);
  });

  it('uses the scraped product name when an observation is not matched to an item', async () => {
    mocks.order.mockResolvedValueOnce({
      data: [{
        id: 'price-1',
        store_id: 'store-1',
        item_id: null,
        product_name: 'Pran Potato Crackers',
        items: null,
        competitor_name: 'chaldal',
        competitor_price: 85,
        scraped_at: '2026-07-29T00:00:00Z',
        created_at: '2026-07-29T00:00:00Z',
        updated_at: '2026-07-29T00:00:00Z',
      }],
      error: null,
    });

    await expect(fetchCompetitorPrices('store-1')).resolves.toEqual([
      expect.objectContaining({
        item_id: null,
        product_name: 'Pran Potato Crackers',
        item_name: 'Pran Potato Crackers',
      }),
    ]);
  });

  it('derives the displayed gap from captured prices instead of a legacy percent-point value', async () => {
    mocks.order.mockResolvedValueOnce({
      data: [{
        id: 'price-2',
        store_id: 'store-1',
        item_id: 'item-1',
        product_name: 'Crackers',
        items: { name: 'Crackers', sku: 'SKU-1' },
        competitor_name: 'Chaldal',
        competitor_price: 135,
        our_price: 140,
        price_gap_percent: 3.7,
        matcher_version: 'safe-v2:VERIFIED:brand-variant-package-exact',
        scraped_at: '2026-07-29T00:00:00Z',
        created_at: '2026-07-29T00:00:00Z',
        updated_at: '2026-07-29T00:00:00Z',
      }],
      error: null,
    });

    const [price] = await fetchCompetitorPrices('store-1');

    expect(price.price_gap_percent).toBeCloseTo(0.037, 4);
  });

  it('does not show a price gap for unmatched or invalid observations', async () => {
    mocks.order.mockResolvedValueOnce({
      data: [
        {
          id: 'unmatched', item_id: null, competitor_price: 20, our_price: 480,
          product_name: 'Unmatched powder', competitor_name: 'Shwapno',
        },
        {
          id: 'invalid', item_id: 'item-1', competitor_price: -1, our_price: 480,
          product_name: 'Invalid price', competitor_name: 'Chaldal',
        },
        {
          id: 'dangling', item_id: 'foreign-item', competitor_price: 20, our_price: 480,
          product_name: 'Hidden catalog item', competitor_name: 'Shwapno',
          matcher_version: 'safe-v2:VERIFIED:brand-variant-package-exact', items: null,
        },
      ],
      error: null,
    });

    const prices = await fetchCompetitorPrices('store-1');
    expect(prices.map((price) => price.price_gap_percent)).toEqual([null, null, null]);
    expect(prices[2].our_price).toBeNull();
    expect(prices[2].match_status).toBe('AMBIGUOUS');
  });

  it('suppresses actionable gaps for non-verified product matches', async () => {
    mocks.order.mockResolvedValueOnce({
      data: [{
        id: 'probable', item_id: 'item-1', competitor_price: 1300, our_price: 945,
        product_name: 'Acme Laundry Powder 1kg', competitor_name: 'Chaldal',
        matcher_version: 'safe-v2:PROBABLE:name-similar',
        items: { name: 'Acme Laundry Powder 1kg', sku: null },
      }],
      error: null,
    });

    const [price] = await fetchCompetitorPrices('store-1');
    expect(price.match_status).toBe('PROBABLE');
    expect(price.price_gap_percent).toBeNull();
  });

  it('calculates actionable gaps only for verified matches', async () => {
    mocks.order.mockResolvedValueOnce({
      data: [{
        id: 'verified', item_id: 'item-1', competitor_price: 1300, our_price: 945,
        product_name: 'Acme Laundry Powder 1kg', competitor_name: 'Chaldal',
        matcher_version: 'safe-v2:VERIFIED:brand-variant-package-exact',
        items: { name: 'Acme Laundry Powder 1kg', sku: null },
      }],
      error: null,
    });

    const [price] = await fetchCompetitorPrices('store-1');
    expect(price.match_status).toBe('VERIFIED');
    expect(price.price_gap_percent).toBeCloseTo(-0.2730769, 6);
  });

  it('derives price alert gaps from our price and the market average', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [{
        item_id: 'item-1',
        item_name: 'Crackers',
        our_price: 140,
        market_avg_price: 135,
        price_gap_percent: 99,
        competitors: null,
      }],
      error: null,
    });

    const [alert] = await fetchPriceAlerts('store-1');

    expect(alert.price_gap_percent).toBeCloseTo(0.037, 4);
  });

  it('does not fall back to a stored gap when alert prices are unavailable', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [{
        item_id: 'item-1', item_name: 'Unknown', our_price: null,
        market_avg_price: 135, price_gap_percent: 99, competitors: null,
      }],
      error: null,
    });
    const [alert] = await fetchPriceAlerts('store-1');
    expect(alert.price_gap_percent).toBeNull();
  });

  it('does not bypass verified-link validation when the secure link RPC fails', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error('RPC unavailable') });

    await expect(linkScrapedProductToItem('store-1', 'price-1', 'item-1', undefined, true))
      .rejects.toThrow('RPC unavailable');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('fetches exact store-wide observation, matched, and unmatched counts', async () => {
    const results = [
      { count: 1001, error: null },
      { count: 107, error: null },
      { count: 894, error: null },
    ];
    const queries: Array<{ args: unknown[]; chain: Record<string, ReturnType<typeof vi.fn>> }> = [];

    mocks.from.mockImplementation(() => ({
      select: vi.fn((...args: unknown[]) => {
        const result = results[queries.length];
        const chain: any = {
          eq: vi.fn(() => chain),
          not: vi.fn(() => chain),
          is: vi.fn(() => chain),
          then: (resolve: (value: typeof result) => unknown, reject: (reason: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject),
        };
        queries.push({ args, chain });
        return chain;
      }),
    }));

    await expect(fetchCompetitorPriceCounts('store-1')).resolves.toEqual({
      total: 1001,
      matched: 107,
      unmatched: 894,
    });

    expect(queries.map(({ args }) => args)).toEqual([
      ['id', { count: 'exact', head: true }],
      ['id', { count: 'exact', head: true }],
      ['id', { count: 'exact', head: true }],
    ]);
    expect(queries[0].chain.eq).toHaveBeenCalledWith('store_id', 'store-1');
    expect(queries[1].chain.not).toHaveBeenCalledWith('item_id', 'is', null);
    expect(queries[2].chain.is).toHaveBeenCalledWith('item_id', null);
  });

  it('applies the same store and item_id predicates to the three KPI count queries', async () => {
    const results = [
      { count: 10, error: null },
      { count: 4, error: null },
      { count: 6, error: null },
    ];
    const filters: Array<Array<[string, ...unknown[]]>> = [];

    mocks.from.mockImplementation(() => ({
      select: vi.fn(() => {
        const result = results[filters.length];
        const queryFilters: Array<[string, ...unknown[]]> = [];
        filters.push(queryFilters);
        const chain: any = {
          eq: vi.fn((...args: [string, ...unknown[]]) => { queryFilters.push(['eq', ...args]); return chain; }),
          not: vi.fn((...args: [string, ...unknown[]]) => { queryFilters.push(['not', ...args]); return chain; }),
          is: vi.fn((...args: [string, ...unknown[]]) => { queryFilters.push(['is', ...args]); return chain; }),
          then: (resolve: (value: typeof result) => unknown, reject: (reason: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject),
        };
        return chain;
      }),
    }));

    await expect(fetchCompetitorPriceCounts('store-2')).resolves.toEqual({ total: 10, matched: 4, unmatched: 6 });
    expect(filters).toEqual([
      [['eq', 'store_id', 'store-2']],
      [['eq', 'store_id', 'store-2'], ['not', 'item_id', 'is', null]],
      [['eq', 'store_id', 'store-2'], ['is', 'item_id', null]],
    ]);
  });

  it('routes manual add and replacement through set_manual_competitor_price', async () => {
    mocks.rpc.mockResolvedValue({ data: 'override-1', error: null });

    await addCompetitorPrice('store-1', {
      item_id: 'item-1',
      competitor_key: 'chaldal',
      competitor_name: 'Chaldal',
      competitor_price: 89,
      competitor_url: 'https://example.invalid/product',
    });

    expect(mocks.rpc).toHaveBeenCalledWith('set_manual_competitor_price', {
      p_store_id: 'store-1',
      p_item_id: 'item-1',
      p_competitor_key: 'chaldal',
      p_competitor_name: 'Chaldal',
      p_price: 89,
      p_reason: null,
      p_competitor_product_url: 'https://example.invalid/product',
    });
  });

  it('propagates RPC failures', async () => {
    const error = new Error('denied');
    mocks.rpc.mockResolvedValueOnce({ data: null, error });

    await expect(
      setManualCompetitorPrice('store-1', 'item-1', 'chaldal', 'Chaldal', 89),
    ).rejects.toBe(error);
  });
});
