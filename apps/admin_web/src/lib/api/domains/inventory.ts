import { supabase } from "@/lib/supabase";

export const inventory = {
  list: async (storeId: string) => {
    const { data, error } = await supabase.rpc('get_inventory_list', { p_store_id: storeId });
    if (error) throw error;
    return data;
  },
  create: async (product: {
    name: string;
    sku?: string;
    barcode?: string;
    price: number;
    cost?: number;
    mrp?: number;
    category_id?: string;
    image_url?: string;
    short_code?: string;
    brand?: string;
    group_tag?: string;
  }) => {
    const { data, error } = await supabase.from('items').insert(product as any).select().single();
    if (error) throw error;
    return data;
  },
  update: async (storeId: string, itemId: string, delta: number, reason: string, notes?: string, _idempotencyKey?: string) => {
    const { data, error } = await supabase.rpc('adjust_stock', {
      p_store_id: storeId,
      p_item_id: itemId,
      p_delta: delta,
      p_reason: reason,
      p_notes: notes,
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
  updateProduct: async (storeId: string, itemId: string, updates: {
    name?: string;
    price?: number;
    cost?: number;
    mrp?: number;
    sku?: string;
    barcode?: string;
    image_url?: string;
  }) => {
    // Remove properties that are not columns in the items table
    if ('last_purchased_date' in updates) {
      delete (updates as any).last_purchased_date;
    }
    console.log('[updateProduct] Updating item:', { storeId, itemId, updates });
    
    // RLS requires store_id check - filter by both id AND store_id
    const { data, error } = await supabase
      .from('items')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select();
    if (error) {
      console.error('[updateProduct] Update error:', error);
      throw error;
    }

    console.log('[updateProduct] Update result:', data);
    return data?.[0] ?? null;
  },
  /** Update stock quantity directly (for inline editing) */
  updateStock: async (storeId: string, itemId: string, newQty: number) => {
    const { data, error } = await supabase.rpc('set_stock', {
      p_store_id: storeId,
      p_item_id: itemId,
      p_new_qty: newQty,
      p_reason: 'Inline stock edit',
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

  // Inventory Analytics RPCs
  getStockValuation: async (storeId: string, limit = 100) => {
    const { data, error } = await supabase.rpc('get_stock_valuation', { p_store_id: storeId, p_limit: limit });
    if (error) throw error;
    return data;
  },
  getTopSellingItems: async (storeId: string, days = 30, limit = 20) => {
    const { data, error } = await supabase.rpc('get_top_selling_items', { p_store_id: storeId, p_days: days, p_limit: limit });
    if (error) throw error;
    return data;
  },
  getSlowMovingItems: async (storeId: string, days = 30, limit = 50) => {
    const { data, error } = await supabase.rpc('get_slow_moving_items', { p_store_id: storeId, p_days: days, p_limit: limit });
    if (error) throw error;
    return data;
  },
  getDailyMovementTrend: async (storeId: string, days = 14) => {
    const { data, error } = await supabase.rpc('get_daily_movement_trend', { p_store_id: storeId, p_days: days });
    if (error) throw error;
    return data;
  },
  setMinQty: async (storeId: string, itemId: string, minQty: number) => {
    const { data, error } = await supabase
      .from('stock_alert_thresholds')
      .upsert({ store_id: storeId, item_id: itemId, min_qty: minQty }, { onConflict: 'store_id,item_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  getPriceHistory: async (storeId: string, itemId: string, limit = 5) => {
    const { data, error } = await supabase.rpc('get_price_history' as any, {
      p_store_id: storeId,
      p_item_id: itemId,
      p_limit: limit
    });
    if (error) throw error;
    return data;
  },
};
