import { supabase } from "@/lib/supabase";
import { mapSearchItems, mapCategories } from '../mappers';
import type { PosProduct, PosCategory, SaleResult } from '../types';
import { createDebugLogger } from '../../debug';
import type { Database } from '../../database.types';

const debugLog = createDebugLogger('POS API');

type CreateSaleFunction = Database['public']['Functions']['create_sale'];
type CreateSaleArgs = CreateSaleFunction['Args'];

interface SaleResultData {
  status: string;
  batch_id?: string;
  total_revenue?: number;
}

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
      p_category_id: categoryId ?? undefined,
      p_limit: 50,
      p_offset: 0,
    });
    if (error) {
      console.error('getProducts RPC error:', error);
      throw error;
    }
    debugLog('Raw products response', data);
    return mapSearchItems(data);
  },
  lookupByScan: async (scanValue: string, storeId: string): Promise<PosProduct | null> => {
    debugLog('Looking up item by scan', { scanValue, storeId });
    const { data, error } = await supabase.rpc('lookup_item_by_scan', {
      p_barcode: scanValue,
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
    cashierId: string;
    notes?: string | null;
  }): Promise<SaleResult> => {
    debugLog('Creating sale', saleData);
    const args: CreateSaleArgs = {
      p_cashier_id: saleData.cashierId,
      p_client_transaction_id: saleData.idempotencyKey,
      p_store_id: saleData.storeId,
      p_items: saleData.items,
      p_payments: saleData.payments,
      p_notes: saleData.notes ?? undefined,
    };
    const { data, error } = await supabase.rpc('create_sale', args);
    if (error) throw error;
    const result = (data ?? {}) as unknown as SaleResultData;
    debugLog('Sale result', result);
    return {
      status: (result.status || '').toUpperCase() === 'SUCCESS' ? 'success' : 'error',
      batchId: result.batch_id,
      totalAmount: result.total_revenue,
      error: result.status !== 'success' ? 'Sale failed' : undefined,
    };
  },
};
