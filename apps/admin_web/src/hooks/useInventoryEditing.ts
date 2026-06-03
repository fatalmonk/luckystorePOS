import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useNotify } from '../components/NotificationContext';
import type { InventoryItem, InventoryEditableField } from '../types/inventory';
import { INVENTORY_NUMERIC_FIELDS } from '../types/inventory';

export function useInventoryEditing(storeId: string | undefined) {
  const queryClient = useQueryClient();
  const { notify } = useNotify();

  const handleInlineSave = useCallback(
    async (itemId: string, field: keyof InventoryItem, value: string | number) => {
      if (!storeId) {
        notify('Store ID required for updates', 'error');
        return;
      }

      // Convert string numbers to actual numbers for numeric fields
      let processedValue: string | number = value;
      if (['price', 'cost', 'mrp', 'current_qty'].includes(field)) {
        processedValue = typeof value === 'string' ? parseFloat(value) : value;
      }

      console.log('[InlineSave] Updating:', { itemId, field, originalValue: value, processedValue, storeId });

      try {
        // Optimistic update
        queryClient.setQueryData(['inventory', storeId], (old: any) => {
          if (!old) return old;
          return old.map((item: any) => (item.id === itemId ? { ...item, [field]: processedValue } : item));
        });

        let result;
        if (field === 'current_qty') {
          result = await api.inventory.updateStock(storeId, itemId, processedValue as number);
        } else {
          result = await api.inventory.updateProduct(storeId, itemId, { [field]: processedValue });
        }
        
        // Detect RLS silent failure (0 rows updated)
        if (result === null || (Array.isArray(result) && result.length === 0)) {
          console.error('[InlineSave] RLS blocked update or item not found:', { itemId, field });
          queryClient.invalidateQueries({ queryKey: ['inventory', storeId] });
          notify(`Update blocked by permissions or item not found`, 'error');
          throw new Error('Update blocked by permissions or item not found');
        }
        notify(`${field} updated successfully`, 'success');
      } catch (err) {
        console.error('[InlineSave] Error:', err);
        queryClient.invalidateQueries({ queryKey: ['inventory', storeId] });
        notify(err instanceof Error ? err.message : `Failed to update ${field}`, 'error');
        throw err;
      }
    },
    [storeId, notify, queryClient]
  );

  return { handleInlineSave };
}
