import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { PurchaseEntryData } from '../../schemas/purchase.schema';
import { useAuth } from '../../lib/AuthContext';
import { withSerializableRetry } from '../../lib/api/withSerializableRetry';

export function useCreatePurchase() {
  const { storeId, tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PurchaseEntryData) => {
      if (!storeId || !tenantId) throw new Error('Missing authentication context');

      const itemsJson = data.lines.map(l => ({
        item_id: l.itemId,
        quantity: l.quantity,
        unit_cost: l.unitCost,
      }));

      const result = await withSerializableRetry(async () => {
        const { data: resData, error: resErr } = await supabase.rpc('record_purchase_v2', {
          p_tenant_id: tenantId,
          p_store_id: storeId,
          p_supplier_id: data.supplierId,
          p_invoice_number: data.invoiceNumber || null,
          p_amount_paid: data.amountPaid,
          p_items_json: itemsJson,
        });
        if (resErr) throw resErr;
        return resData;
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-list'] });
    }
  });
}
