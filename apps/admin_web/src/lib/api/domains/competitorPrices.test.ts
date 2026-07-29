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
  fetchCompetitorPrices,
  fetchEffectiveCompetitorPrices,
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
