import { supabase } from '../../lib/supabase';
import { InventoryListRow } from '../../types/rpc';

export const inventoryService = {
  async getList(storeId: string) {
    if (!storeId) throw new Error("Store ID is required");
    
    const { data, error } = await supabase.rpc('get_inventory_list', {
      p_store_id: storeId,
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
