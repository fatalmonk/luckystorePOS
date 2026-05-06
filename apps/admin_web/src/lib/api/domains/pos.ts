import { supabase } from '../../supabase';
import { mapSearchItems, mapCategories } from '../mappers';
import type { PosProduct, PosCategory, SaleResult } from '../types';
import { createDebugLogger } from '../../debug';

const debugLog = createDebugLogger('POS API');

export const pos = {
  getCategories: async (storeId: string): Promise<PosCategory[]> => {
    debugLog('Fetching categories for store', storeId);
    const { data, error } = await supabase.rpc('get_pos_categories', { p_store_id: storeId });
    if (error) throw error;
    debugLog('Raw categories response', data);
    return mapCategories(data);
  },
  getProducts: async (storeId: string, search?: string, categoryId?: string): Promise<PosProduct[]> => {
    debugLog('Fetching products', { storeId, search, categoryId });
    const { data, error } = await supabase.rpc('search_items_pos', {
      p_store_id: storeId,
      p_query: search || '',
      p_category_id: categoryId || null,
      p_limit: 50,
      p_offset: 0,
    });
    if (error) throw error;
    debugLog('Raw products response', data);
    return mapSearchItems(data);
  },
  lookupByScan: async (scanValue: string, storeId: string): Promise<PosProduct | null> => {
    debugLog('Looking up item by scan', { scanValue, storeId });
    const { data, error } = await supabase.rpc('lookup_item_by_scan', {
      p_scan_value: scanValue,
      p_store_id: storeId,
    });
    if (error) throw error;
    debugLog('Raw scan lookup response', data);
    if (!data) return null;
    return mapSearchItems(data)[0] || null;
  },
  createSale: async (saleData: {
    idempotencyKey: string;
    tenantId: string;
    storeId: string;
    items: Array<{ item_id: string; quantity: number; unit_price: number }>;
    payments: Array<{ account_id: string; amount: number; party_id?: string | null }>;
    notes?: string | null;
  }): Promise<SaleResult> => {
    debugLog('Creating sale', saleData);
    const { data, error } = await supabase.rpc('record_sale', {
      p_idempotency_key: saleData.idempotencyKey,
      p_tenant_id: saleData.tenantId,
      p_store_id: saleData.storeId,
      p_items: JSON.stringify(saleData.items),
      p_payments: JSON.stringify(saleData.payments),
      p_notes: saleData.notes || null,
    });
    if (error) throw error;
    debugLog('Sale result', data);
    return {
      status: data?.status === 'success' ? 'success' : 'error',
      batchId: data?.batch_id,
      totalAmount: data?.total_revenue,
      error: data?.status !== 'success' ? 'Sale failed' : undefined,
    };
  },
};