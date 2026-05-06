import { supabase } from '../../supabase';

export const dashboard = {
  getStats: async (storeId: string) => {
    const { data, error } = await supabase.rpc('get_manager_dashboard_stats', { p_store_id: storeId });
    if (error) throw error;
    return data;
  },
  getLowStock: async (storeId: string) => {
    const { data, error } = await supabase.rpc('get_low_stock_items', { p_store_id: storeId });
    if (error) throw error;
    return data;
  },
};