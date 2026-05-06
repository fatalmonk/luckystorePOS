import { supabase } from '../../supabase';

export const purchases = {
  list: async (storeId: string, filters?: { startDate?: string; endDate?: string; status?: string }) => {
    let query = supabase
      .from('purchase_receipts')
      .select('*, parties:supplier_id(name), purchase_receipt_items(id, quantity, unit_cost, items:item_id(name, sku))')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (filters?.startDate) query = query.gte('created_at', filters.startDate);
    if (filters?.endDate) query = query.lte('created_at', filters.endDate);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  getDetails: async (receiptId: string) => {
    const { data, error } = await supabase
      .from('purchase_receipts')
      .select('*, parties:supplier_id(*), purchase_receipt_items(*, items:item_id(*))')
      .eq('id', receiptId)
      .single();

    if (error) throw error;
    return data;
  },

  getStats: async (storeId: string) => {
    const { count: totalCount, error: countError } = await supabase
      .from('purchase_receipts')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId);

    if (countError) throw countError;

    const { data: totalData, error: totalError } = await supabase
      .from('purchase_receipts')
      .select('invoice_total')
      .eq('store_id', storeId);

    if (totalError) throw totalError;

    const totalValue = totalData?.reduce((sum: number, r: any) => sum + (r.invoice_total || 0), 0) || 0;

    const { count: draftCount, error: draftError } = await supabase
      .from('purchase_receipts')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('status', 'draft');

    if (draftError) throw draftError;

    return { totalPurchases: totalCount || 0, totalValue, pendingDrafts: draftCount || 0 };
  },
};