import { supabase } from '../../supabase';

export const inventory = {
  list: async (storeId: string) => {
    const { data, error } = await supabase.rpc('get_inventory_list', { p_store_id: storeId });
    if (error) throw error;
    return data;
  },
  update: async (storeId: string, itemId: string, delta: number, reason: string, notes?: string, idempotencyKey?: string) => {
    const { data, error } = await supabase.rpc('adjust_stock', {
      p_store_id: storeId,
      p_item_id: itemId,
      p_delta: delta,
      p_reason: reason,
      p_notes: notes,
      p_idempotency_key: idempotencyKey
    });
    if (error) throw error;
    return data;
  },
  set: async (storeId: string, itemId: string, newQty: number, reason: string, notes?: string) => {
    const { data, error } = await supabase.rpc('set_stock', {
      p_store_id: storeId,
      p_item_id: itemId,
      p_new_qty: newQty,
      p_reason: reason,
      p_notes: notes
    });
    if (error) throw error;
    return data;
  },
  history: async (storeId: string, itemId?: string) => {
    const { data, error } = await supabase.rpc('get_stock_history_simple', {
      p_store_id: storeId,
      p_item_id: itemId
    });
    if (error) throw error;
    return data;
  },
  getSummary: async (storeId: string) => {
    const { data, error } = await supabase.rpc('get_inventory_summary', { p_store_id: storeId });
    if (error) throw error;
    return data;
  },
};