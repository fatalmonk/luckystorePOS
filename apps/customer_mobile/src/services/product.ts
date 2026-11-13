import { z } from 'zod';
import { resolveApiBaseUrl, Locale } from './home';

export const LocalizedProductDetailsSchema = z.object({
  summary: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  specifications: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  usageDirections: z.string().optional(),
  storageInstructions: z.string().optional(),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
}).strip().optional();

const ProductDetailBaseSchema = z.object({
  id: z.string().min(1),
  emoji: z.string().default('🛒'),
  price: z.number().finite().nonnegative(),
  originalPrice: z.number().finite().nonnegative().optional(),
  unit: z.string().min(1),
  stock: z.number().int().nonnegative(),
  imageUrl: z.string().url().optional(),
  categoryId: z.string().optional(),
  nutrition: z.string().optional(),
  brand: z.string().optional(),
  sku: z.string().optional(),
  origin: z.string().optional(),
  details: LocalizedProductDetailsSchema,
  bengaliName: z.string().optional(),
  bengaliDescription: z.string().optional(),
}).strip();

export const ProductDetailItemSchema = z.union([
  ProductDetailBaseSchema.extend({
    name: z.string().min(1),
    badge: z.string().optional(),
    category: z.string(),
    description: z.string().default(''),
    translationStatus: z.literal('published').optional(),
  }),
  ProductDetailBaseSchema.extend({
    name: z.literal(''),
    badge: z.undefined().optional(),
    category: z.string().optional().default(''),
    description: z.literal(''),
    translationStatus: z.literal('missing'),
  }),
]);

export const ProductDetailResponseSchema = z.object({
  locale: z.enum(['en', 'bn']),
  product: ProductDetailItemSchema,
  related: z.array(ProductDetailItemSchema),
}).strip().refine((data) => {
  return [data.product, ...data.related].every((product) => {
    if (data.locale === 'en') return product.translationStatus !== 'missing';
    if (product.badge !== undefined) return false;
    if (product.translationStatus === 'missing') return product.name === '' && product.description === '';
    return product.translationStatus === 'published' && Boolean(product.name.trim());
  });
}, { message: 'Invalid locale and translation status combination' });

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
