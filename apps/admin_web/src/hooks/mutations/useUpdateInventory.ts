import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { InventoryAdjustmentData } from '../../schemas/inventory.schema';
import { useAuth } from '../../lib/AuthContext';

export function useUpdateInventory() {
  const { storeId, tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ data, mode }: { data: InventoryAdjustmentData; mode: 'add' | 'remove' | 'set' }) => {
      if (!storeId || !tenantId) throw new Error('Missing context');

      if (mode === 'set') {
        return api.inventory.set(
          tenantId,
          storeId, 
          data.productId, 
          data.adjustmentQuantity, 
          data.reason, 
          data.notes
        );
      } else {
        const delta = mode === 'add' ? data.adjustmentQuantity : -data.adjustmentQuantity;
        return api.inventory.update(
          tenantId,
          storeId, 
          data.productId, 
          delta, 
          data.reason, 
          data.notes
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-list'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
}
