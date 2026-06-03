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
  /** Inline update product fields (name, price, cost, mrp, sku, barcode, last_purchased_date) */
  updateProduct: async (_storeId: string, itemId: string, updates: {
    name?: string;
    price?: number;
    cost?: number;
    mrp?: number;
    sku?: string;
    barcode?: string;
    last_purchased_date?: string;
    image_url?: string;
  }) => {
    console.log('[updateProduct] Updating item:', { itemId, updates });

    // Check if this is a price-related update (can use RPC)
    if (updates.price !== undefined || updates.cost !== undefined || updates.mrp !== undefined) {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('Not authenticated');
      }

      // Get user's tenant_id - use RPC that handles RLS properly
      const { data: user, error: roleError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_id', userData.user.id)
        .single();

      if (roleError || !user?.tenant_id) {
        throw new Error('Cannot determine tenant');
      }

      // Use the update_item_prices RPC for price updates (handles NULL tenant_id)
      const { data, error } = await supabase.rpc('update_item_prices', {
        p_item_id: itemId,
        p_tenant_id: user.tenant_id,
        p_price: updates.price ?? null,
        p_mrp: updates.mrp ?? null,
        p_cost: updates.cost ?? null,
      });

      if (error) {
        console.error('[updateProduct] RPC error:', error);
        throw error;
      }

      // If there are other non-price fields to update, do them separately
      if (updates.name !== undefined || updates.sku !== undefined || updates.barcode !== undefined) {
        const { error: updateError } = await supabase
          .from('items')
          .update({
            ...(updates.name !== undefined && { name: updates.name }),
            ...(updates.sku !== undefined && { sku: updates.sku }),
            ...(updates.barcode !== undefined && { barcode: updates.barcode }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', itemId);

        if (updateError) {
          console.error('[updateProduct] Field update error:', updateError);
          throw updateError;
        }
      }

      console.log('[updateProduct] RPC result:', data);
      return data?.[0] ?? null;
    }

    // Non-price updates - direct table update (RLS will check tenant_id)
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
