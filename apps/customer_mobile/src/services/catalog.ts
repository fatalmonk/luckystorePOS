import { z } from 'zod';
import { resolveApiBaseUrl, Locale } from './home';

export const CatalogProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  emoji: z.string().default('🛒'),
  price: z.number().finite().nonnegative(),
  originalPrice: z.number().finite().nonnegative().optional(),
  unit: z.string().min(1),
  stock: z.number().int().nonnegative(),
  imageUrl: z.string().url().optional(),
  badge: z.string().optional(),
  category: z.string().transform((val) => val.trim() || 'General'),
  categoryId: z.string().optional(),
  description: z.string().optional(),
}).strip();

export const CatalogCategorySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  emoji: z.string().default('🛒'),
  parentId: z.string().nullable().optional(),
}).strip();

export const CatalogPageSchema = z.object({
  locale: z.enum(['en', 'bn']),
  categories: z.array(CatalogCategorySchema),
  items: z.array(CatalogProductSchema),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  category: z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    emoji: z.string().default('🛒'),
  }).optional(),
}).strip();

export type CatalogProduct = z.infer<typeof CatalogProductSchema>;
export type CatalogCategory = z.infer<typeof CatalogCategorySchema>;
export type CatalogPage = z.infer<typeof CatalogPageSchema>;

export type CatalogSort = 'best' | 'price-asc' | 'price-desc' | 'name-asc';

export interface CatalogQuery {
  locale?: Locale;
  category?: string;
  q?: string;
  sort?: CatalogSort;
  inStockOnly?: boolean;
  limit?: number;
  offset?: number;
}

export async function fetchCatalog(query: CatalogQuery = {}, signal?: AbortSignal): Promise<CatalogPage> {
  const params = new URLSearchParams();
  if (query.locale) params.set('locale', query.locale);
  if (query.category && query.category !== 'all') params.set('category', query.category);
  if (query.q) params.set('q', query.q);
  if (query.sort) params.set('sort', query.sort);
  if (query.inStockOnly) params.set('inStockOnly', 'true');
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.offset !== undefined) params.set('offset', String(query.offset));

  const url = `${resolveApiBaseUrl()}/api/mobile/v1/catalog?${params.toString()}`;
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Catalog request failed (${response.status})`);
  }

  const json = await response.json();
  return CatalogPageSchema.parse(json);
}
