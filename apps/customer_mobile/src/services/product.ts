import { z } from 'zod';
import { resolveApiBaseUrl, Locale } from './home';

export const ProductDetailItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  emoji: z.string().default('🛒'),
  price: z.number().finite().nonnegative(),
  originalPrice: z.number().finite().nonnegative().optional(),
  unit: z.string().min(1),
  stock: z.number().int().nonnegative(),
  imageUrl: z.string().url().optional(),
  badge: z.string().optional(),
  category: z.string().min(1),
  categoryId: z.string().optional(),
  description: z.string().default(''),
  nutrition: z.string().optional(),
  brand: z.string().optional(),
  sku: z.string().optional(),
  bengaliName: z.string().optional(),
  bengaliDescription: z.string().optional(),
}).strip();

export const ProductDetailResponseSchema = z.object({
  locale: z.enum(['en', 'bn']),
  product: ProductDetailItemSchema,
  related: z.array(ProductDetailItemSchema),
}).strip();

export type ProductDetailItem = z.infer<typeof ProductDetailItemSchema>;
export type ProductDetailResponse = z.infer<typeof ProductDetailResponseSchema>;

export async function fetchProductDetail(
  idOrSlug: string,
  locale: Locale = 'en',
  signal?: AbortSignal,
): Promise<ProductDetailResponse> {
  const url = `${resolveApiBaseUrl()}/api/mobile/v1/products/${encodeURIComponent(idOrSlug)}?locale=${locale}`;
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Product detail request failed (${response.status})`);
  }

  const json = await response.json();
  return ProductDetailResponseSchema.parse(json);
}
