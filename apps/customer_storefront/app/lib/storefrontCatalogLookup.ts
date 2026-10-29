export interface StorefrontCatalogPriceRow {
  id?: string;
  item_id?: string;
  name: string;
  price: number | string;
  mrp: number | string | null;
}

/** Read storefront catalog rows only for the item IDs supplied by the caller. */
export async function fetchStorefrontCatalogItemsByIds(
  supabaseClient: any,
  storeId: string,
  itemIds: string[],
): Promise<StorefrontCatalogPriceRow[]> {
  const uniqueItemIds = [...new Set(itemIds)];
  if (uniqueItemIds.length === 0) return [];
  if (uniqueItemIds.length > 1000) {
    throw new Error('Too many item IDs for storefront lookup');
  }

  const { data, error } = await supabaseClient.rpc('search_storefront_catalog_v2', {
    p_store_id: storeId,
    p_query: '',
    p_category_id: null,
    p_item_ids: uniqueItemIds,
    p_limit: uniqueItemIds.length,
    p_offset: 0,
  });

  if (error) throw new Error(`Failed to load storefront catalog items: ${error.message}`);
  return Array.isArray(data) ? data as StorefrontCatalogPriceRow[] : [];
}
