import { useQuery } from '@tanstack/react-query';
import { customerService } from '../services/customers/customerService';

export function useCustomers(storeId: string | null, searchQuery?: string) {
  return useQuery({
    queryKey: ['customers', storeId, searchQuery],
    queryFn: () => customerService.getCustomers(storeId!, searchQuery),
    enabled: !!storeId,
  });
}
