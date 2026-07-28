import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mocks.rpc,
  },
}));

import {
  addCompetitorPrice,
  fetchEffectiveCompetitorPrices,
  normalizeCompetitorKey,
  setManualCompetitorPrice,
} from './competitorPrices';

describe('competitor price API', () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ data: null, error: null });
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
