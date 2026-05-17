import { supabase } from '../../supabase';

import { withSerializableRetry } from '../withSerializableRetry';

export const inventory = {
  list: async (storeId: string) => {
    const { data, error } = await supabase.rpc('get_inventory_list', { p_store_id: storeId });
    if (error) throw error;
    return data;
  },
  update: async (tenantId: string, storeId: string, itemId: string, delta: number, reason: string, notes?: string, operationId?: string) => {
    return withSerializableRetry(async () => {
      const { data, error } = await supabase.rpc('adjust_inventory_stock', {
        p_tenant_id: tenantId,
        p_store_id: storeId,
        p_item_id: itemId,
        p_quantity_delta: delta,
        p_movement_type: 'adjustment',
        p_reference_type: 'adjustment',
        p_reference_id: null,
        p_notes: `[${reason}] ${notes || ''}`.trim(),
        p_operation_id: operationId || crypto.randomUUID()
      });
      if (error) throw error;
      return data;
    });
  },
  set: async (tenantId: string, storeId: string, itemId: string, newQty: number, reason: string, notes?: string, operationId?: string) => {
    return withSerializableRetry(async () => {
      const { data, error } = await supabase.rpc('set_inventory_stock', {
        p_tenant_id: tenantId,
        p_store_id: storeId,
        p_item_id: itemId,
        p_new_quantity: newQty,
        p_movement_type: 'manual',
        p_reference_type: 'adjustment',
        p_reference_id: null,
        p_notes: `[${reason}] ${notes || ''}`.trim(),
        p_operation_id: operationId || crypto.randomUUID()
      });
      if (error) throw error;
      return data;
    });
  },
  history: async (storeId: string, itemId?: string, movementType?: string) => {
    const { data, error } = await supabase.rpc('get_inventory_movements', {
      p_store_id: storeId,
      p_item_id: itemId || null,
      p_movement_type: movementType || null
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
};