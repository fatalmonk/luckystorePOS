import { describe, expect, it, vi } from 'vitest';
import { fetchStorefrontCatalogItemsByIds } from './storefrontCatalogLookup';

const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

describe('fetchStorefrontCatalogItemsByIds', () => {
  it('requests only unique item IDs through the exact-selector storefront RPC', async () => {
    const rows = [{ id: 'item-1', name: 'Milk', price: 90, mrp: 100 }];
    const rpc = vi.fn().mockResolvedValue({ data: rows, error: null });

    await expect(fetchStorefrontCatalogItemsByIds(
      { rpc }, STORE_ID, ['item-1', 'item-1', 'item-2'],
    )).resolves.toEqual(rows);

    expect(rpc).toHaveBeenCalledWith('search_storefront_catalog_v2', {
      p_store_id: STORE_ID,
      p_query: '',
      p_category_id: null,
      p_item_ids: ['item-1', 'item-2'],
      p_limit: 2,
      p_offset: 0,
    });
  });

  it('does not make a catalog request for an empty item list', async () => {
    const rpc = vi.fn();
    await expect(fetchStorefrontCatalogItemsByIds({ rpc }, STORE_ID, [])).resolves.toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('surfaces lookup failures instead of treating prices as verified', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'RPC unavailable' } });
    await expect(fetchStorefrontCatalogItemsByIds({ rpc }, STORE_ID, ['item-1']))
      .rejects.toThrow('Failed to load storefront catalog items: RPC unavailable');
  });
});
