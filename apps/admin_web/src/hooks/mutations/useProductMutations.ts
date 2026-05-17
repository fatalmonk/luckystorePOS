import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ProductData } from '../../schemas/product.schema';
import type { ProductCreateInput, ProductUpdateInput } from '../../lib/api/types';

function toProductPayload(data: Partial<ProductData>): ProductUpdateInput {
  const payload: ProductUpdateInput = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.sku !== undefined) payload.sku = data.sku;
  if (data.barcode !== undefined) payload.barcode = data.barcode;
  if (data.price !== undefined) payload.price = data.price;
  if (data.cost !== undefined) payload.cost = data.cost;
  if (data.categoryId !== undefined) payload.category_id = data.categoryId || null;
  if (data.isActive !== undefined) payload.is_active = data.isActive;

  return payload;
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProductData) => {
      const payload = toProductPayload(data) as ProductCreateInput;
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
      return await api.products.update(id, toProductPayload(data));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
}
