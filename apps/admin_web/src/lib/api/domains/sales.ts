import { supabase } from '../../supabase';

export const sales = {
  history: async (storeId: string, search?: string, startDate?: string, endDate?: string) => {
    const { data, error } = await supabase.rpc('get_sales_history', {
      p_store_id: storeId,
      p_search_query: search,
      p_start_date: startDate,
      p_end_date: endDate
    });
    if (error) throw error;
    return data;
  },
  getDetails: async (saleId: string) => {
    const { data, error } = await supabase.rpc('get_sale_details', { p_sale_id: saleId });
    if (error) throw error;
    return data;
  },
  void: async (saleId: string, reason: string, idempotencyKey?: string) => {
    const { data, error } = await supabase.rpc('void_sale', {
      p_sale_id: saleId,
      p_reason: reason,
      p_idempotency_key: idempotencyKey
    });
    if (error) throw error;
    return data;
  },
};