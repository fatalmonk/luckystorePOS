import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '../services/inventory/inventoryService';

export function useInventoryList(storeId: string | null, searchQuery?: string, categoryId?: string, status?: string) {
  return useQuery({
    queryKey: ['inventory-list', storeId, searchQuery, categoryId, status],
    queryFn: () => inventoryService.getList(storeId!, searchQuery, categoryId, status),
    enabled: !!storeId,
  });
}

export function useLowStockItems(storeId: string | null, limit = 10) {
  return useQuery({
    queryKey: ['low-stock-items', storeId, limit],
    queryFn: () => inventoryService.getLowStock(storeId!, limit),
    enabled: !!storeId,
  });
}
