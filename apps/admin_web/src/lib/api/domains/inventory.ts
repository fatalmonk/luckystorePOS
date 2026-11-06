import { supabase } from "@/lib/supabase";

export const inventory = {
  hasAny: async (storeId: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('get_inventory_list_v2', {
      p_store_id: storeId,
      p_limit: 1,
      p_offset: 0,
    });
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  },
  list: async (storeId: string) => {
    const { data, error } = await supabase.rpc('get_inventory_list', { p_store_id: storeId });
    if (error) throw error;
    return data;
  },
  create: async (
    tenantId: string,
    product: {
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
    }
  ) => {
    const { data, error } = await supabase
      .from('items')
      .insert({ ...product, tenant_id: tenantId } as any)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (storeId: string, itemId: string, delta: number, reason: string, notes?: string) => {
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
  /** Updates supported item fields and rejects payloads with no database fields. */
  updateProduct: async (storeId: string, itemId: string, updates: {
    name?: string;
    price?: number;
    cost?: number;
    mrp?: number;
    sku?: string;
    barcode?: string;
    category_id?: string | null;
    image_url?: string;
  }) => {
    const { name, price, cost, mrp, sku, barcode, category_id, image_url } = updates;
    const databaseUpdates = {
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price }),
      ...(cost !== undefined && { cost }),
      ...(mrp !== undefined && { mrp }),
      ...(sku !== undefined && { sku }),
      ...(barcode !== undefined && { barcode }),
      ...(category_id !== undefined && { category_id }),
      ...(image_url !== undefined && { image_url }),
    };

    if (Object.keys(databaseUpdates).length === 0) {
      throw new Error('No supported product fields provided');
    }

    const { data, error } = await supabase
      .from('items')
      .update({
        ...databaseUpdates,
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
      p_reason: 'correction',
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
  deleteProduct: async (storeId: string, itemId: string) => {
    const { data, error } = await supabase
      .from('items')
      .update({ is_active: false } as any)
      .eq('id', itemId);
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
