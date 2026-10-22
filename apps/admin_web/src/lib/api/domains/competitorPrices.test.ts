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

  it('calculates a signed fractional price gap from the two prices', () => {
    expect(calculatePriceGapFraction(140, 135)).toBeCloseTo(0.037, 4);
    expect(calculatePriceGapFraction(135, 140)).toBeCloseTo(-0.0357, 4);
    expect(calculatePriceGapFraction(135, 135)).toBe(0);
    expect(calculatePriceGapFraction(140, 0)).toBeNull();
    expect(calculatePriceGapFraction(140, -135)).toBeNull();
    expect(calculatePriceGapFraction(null, 135)).toBeNull();
  });

  it('fetches effective prices through the store-scoped RPC', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [{ competitor_key: 'chaldal', status: 'fresh' }],
      error: null,
    });

    await expect(fetchEffectiveCompetitorPrices('store-1', 'item-1')).resolves.toHaveLength(1);
    expect(mocks.rpc).toHaveBeenCalledWith('get_effective_competitor_prices', {
      p_store_id: 'store-1',
      p_item_id: 'item-1',
    });
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
        scraped_at: '2026-07-29T00:00:00Z',
        created_at: '2026-07-29T00:00:00Z',
        updated_at: '2026-07-29T00:00:00Z',
      }],
      error: null,
    });

    const [price] = await fetchCompetitorPrices('store-1');

    expect(price.price_gap_percent).toBeCloseTo(0.037, 4);
  });

  it('derives price alert gaps from our price and the market average', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [{
        item_id: 'item-1',
        item_name: 'Crackers',
        our_price: 140,
        market_avg_price: 135,
        price_gap_percent: 3.7,
        competitors: null,
      }],
      error: null,
    });

    const [alert] = await fetchPriceAlerts('store-1');

    expect(alert.price_gap_percent).toBeCloseTo(0.037, 4);
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
