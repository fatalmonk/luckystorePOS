import { supabase } from '../../lib/supabase';
import { SalesHistoryRow, SaleDetailsResponse } from '../../types/rpc';

export const salesService = {
  async getHistory(storeId: string, searchQuery?: string, startDate?: string, endDate?: string, limit = 50, offset = 0) {
    if (!storeId) throw new Error("Store ID is required");
    
    const { data, error } = await supabase.rpc('get_sales_history', {
      p_store_id: storeId,
      p_search_query: searchQuery || '',
      p_start_date: startDate || new Date(0).toISOString(),
      p_end_date: endDate || new Date().toISOString(),
      p_limit: limit,
      p_offset: offset
    });

    if (error) throw error;
    return data as SalesHistoryRow[];
  },

  async getDetails(saleId: string) {
    if (!saleId) throw new Error("Sale ID is required");
    
    const { data, error } = await supabase.rpc('get_sale_details', {
      p_sale_id: saleId
    });

    if (error) throw error;
    if (!data || !data.sale) throw new Error('Sale not found');
    return data as SaleDetailsResponse;
  },

  async voidSale(saleId: string, reason: string, idempotencyKey: string) {
    if (!saleId) throw new Error("Sale ID is required");
    
    const { data, error } = await supabase.rpc('void_sale', {
      p_sale_id: saleId,
      p_reason: reason,
      p_idempotency_key: idempotencyKey
    });

    if (error) throw error;
    return data;
  }
};
