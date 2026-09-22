import { supabase } from "@/lib/supabase";

export const purchases = {
  list: async (storeId: string, filters?: { startDate?: string; endDate?: string; status?: string; supplierId?: string }) => {
    let query = supabase
      .from('purchase_receipts')
      .select('*, parties:supplier_id(name), purchase_receipt_items(id, quantity, unit_cost, items:item_id(name, sku, category_id))')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (filters?.startDate) query = query.gte('created_at', filters.startDate);
    if (filters?.endDate) query = query.lte('created_at', filters.endDate);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.supplierId) query = query.eq('supplier_id', filters.supplierId);

    const pageSize = 1000;
    const rows: any[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await query.range(from, from + pageSize - 1);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }
    return rows;
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

    let totalValue = 0;
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error: totalError } = await supabase
        .from('purchase_receipts')
        .select('invoice_total')
        .eq('store_id', storeId)
        .range(from, from + pageSize - 1);
      if (totalError) throw totalError;
      totalValue += data?.reduce((sum: number, r: any) => sum + (r.invoice_total || 0), 0) || 0;
      if (!data || data.length < pageSize) break;
    }

    const { count: draftCount, error: draftError } = await supabase
      .from('purchase_receipts')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('status', 'draft');

    if (draftError) throw draftError;

    return { totalPurchases: totalCount || 0, totalValue, pendingDrafts: draftCount || 0 };
  },
};
