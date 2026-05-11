import { supabase } from '../../lib/supabase';
import { InventoryListRow } from '../../types/rpc';

export const inventoryService = {
  async getList(storeId: string, searchQuery?: string, categoryId?: string, status?: string) {
    if (!storeId) throw new Error("Store ID is required");
    
    // Instead of raw Supabase RPC everywhere, we abstract it here.
    const { data, error } = await supabase.rpc('get_inventory_list', {
      p_store_id: storeId,
      p_search_query: searchQuery || '',
      p_category_id: categoryId || null,
      p_status: status || null
    });

    if (error) throw error;
    return data as InventoryListRow[];
  },

  async getLowStock(storeId: string, limit = 10) {
    if (!storeId) throw new Error("Store ID is required");
    
    const { data, error } = await supabase.rpc('get_low_stock_items', {
      p_store_id: storeId,
      p_limit: limit
    });

    if (error) throw error;
    return data;
  }
};
