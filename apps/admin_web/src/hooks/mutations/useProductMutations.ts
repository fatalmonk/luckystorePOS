import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ProductData } from '../../schemas/product.schema';

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProductData) => {
      const { id, ...payload } = data as any;
      return await api.products.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductData> }) => {
      return await api.products.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
}
