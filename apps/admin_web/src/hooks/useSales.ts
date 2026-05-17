import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesService } from '../services/sales/salesService';

export function useSalesHistory(storeId: string | null, searchQuery?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['sales-history', storeId, searchQuery, startDate, endDate],
    queryFn: () => salesService.getHistory(storeId!, searchQuery, startDate, endDate),
    enabled: !!storeId,
  });
}

export function useSaleDetails(saleId: string | null) {
  return useQuery({
    queryKey: ['sale-details', saleId],
    queryFn: () => salesService.getDetails(saleId!),
    enabled: !!saleId,
  });
}

export function useVoidSale() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ saleId, reason, idempotencyKey }: { saleId: string; reason: string; idempotencyKey: string }) => 
      salesService.voidSale(saleId, reason, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
    },
  });
}
