import { unstable_cache } from 'next/cache';
import { getCachedCategoriesOrThrow } from '../products/getCachedCategories';
import { createProductId, type Product } from '../products/types';
import { BENGALI_CATEGORY_NAMES } from '../products/getHomePageData';
import { getCategoryGroup, normalizeCategorySlug } from '../types';
import type { Category } from '../products/types';
import { WordMatchEmojiResolver } from '../products/parsers/EmojiResolver';
import { STOREFRONT_STORE_ID } from '../products/constants';
import { supabase } from '../supabase';

export type MobileLocale = 'en' | 'bn';
export type MobileCatalogSort = 'best' | 'price-asc' | 'price-desc' | 'name-asc';

const DEFAULT_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  || process.env.SUPABASE_URL
  || 'supabase-url-not-configured';

interface MobileCatalogRpcOptions {
  query: string;
  categoryIds: string[] | null;
  inStockOnly: boolean;
  sort: MobileCatalogSort;
  limit: number;
  offset: number;
}

const fetchMobileCatalogRpc = unstable_cache(
  async (options: MobileCatalogRpcOptions) => {
    const { data, error } = await (supabase as any).rpc('search_storefront_mobile_catalog_v1', {
      p_store_id: STOREFRONT_STORE_ID,
      p_query: options.query,
      p_category_ids: options.categoryIds,
      p_in_stock_only: options.inStockOnly,
      p_sort: options.sort,
      p_limit: options.limit,
      p_offset: options.offset,
    });
    if (error) {
      console.error('Mobile catalog RPC failed:', { code: error.code ?? 'unknown' });
      throw new Error('Mobile catalog service temporarily unavailable');
    }
    if (!data || !Array.isArray(data.items) || typeof data.total !== 'number'
      || !Number.isSafeInteger(data.total) || data.total < 0) {
      throw new Error('Mobile catalog RPC returned an invalid response');
    }
    return data as { items: Record<string, unknown>[]; total: number };
  },
  ['storefront-mobile-catalog-v1', DEFAULT_SUPABASE_URL],
  { revalidate: 60, tags: ['storefront-catalog-search', 'storefront-mobile-catalog'] },
);

export interface MobileCatalogQuery {
  locale?: MobileLocale;
  category?: string;
  q?: string;
  sort?: MobileCatalogSort;
  inStockOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface MobileCatalogCategory {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  parentId?: string | null;
}

export interface MobileCatalogProduct {
  id: string;
  name: string;
  emoji: string;
  price: number;
  originalPrice?: number;
  unit: string;
  stock: number;
  imageUrl?: string;
  badge?: string;
  category: string;
  categoryId?: string;
  description?: string;
}

export interface MobileCatalogPage {
  locale: MobileLocale;
  categories: MobileCatalogCategory[];
  items: MobileCatalogProduct[];
  total: number;
  hasMore: boolean;
  category?: {
    slug: string;
    name: string;
    emoji: string;
  };
}

function mapProductDto(
  product: Product,
  locale: MobileLocale = 'en',
  categoryMap?: Map<string, string>,
): MobileCatalogProduct {
  const imageUrl = product.imageUrl ?? product.image_url;
  const name = (locale === 'bn' && product.bengaliName) ? product.bengaliName : product.name;
  const description = (locale === 'bn' && product.bengaliDescription) ? product.bengaliDescription : product.description;
  const catId = product.categoryId || product.category_id;
  const resolvedCategory = product.category?.trim() || (catId && categoryMap?.get(catId)) || 'General';
  return {
    id: product.id,
    name,
    emoji: product.emoji || '🛒',
    price: product.price,
    ...(product.originalPrice !== undefined ? { originalPrice: product.originalPrice } : {}),
    unit: product.unit || 'pc',
    stock: product.stock,
    ...(imageUrl ? { imageUrl } : {}),
    ...(product.badge ? { badge: product.badge } : {}),
    category: resolvedCategory,
    ...(catId ? { categoryId: catId } : {}),
    ...(description ? { description } : {}),
  };
}

export function sortProducts(products: Product[], sort: MobileCatalogSort): Product[] {
  const result = [...products];
  switch (sort) {
    case 'price-asc':
      return result.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
    case 'price-desc':
      return result.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
    case 'name-asc':
      return result.sort((a, b) => a.name.localeCompare(b.name));
    case 'best':
    default:
      // Keep in-stock priority then stability
      return result.sort((a, b) => {
        if (a.stock > 0 && b.stock === 0) return -1;
        if (a.stock === 0 && b.stock > 0) return 1;
        return 0;
      });
  }
}

export function toMobileCatalog(
  rawCategories: Category[],
  allProducts: Product[],
  query: MobileCatalogQuery = {},
): MobileCatalogPage {
  const locale = query.locale === 'bn' ? 'bn' : 'en';
  const sort = query.sort || 'best';
  const inStockOnly = Boolean(query.inStockOnly);
  const limit = Math.max(1, Math.min(query.limit ?? 20, 60));
  const offset = Math.max(0, query.offset ?? 0);
  const categorySlug = query.category && query.category !== 'all' ? normalizeCategorySlug(query.category) : undefined;
  const searchTerm = query.q?.trim().toLowerCase();

  const categories: MobileCatalogCategory[] = (rawCategories ?? []).map((cat) => ({
    id: cat.id,
    slug: cat.slug,
    name: locale === 'bn' ? (BENGALI_CATEGORY_NAMES[cat.slug] || cat.name) : cat.name,
    emoji: cat.emoji || '🛒',
    parentId: cat.parentId ?? cat.parent_id ?? null,
  }));

  let filtered = allProducts;

  if (searchTerm) {
    filtered = filtered.filter((p) =>
      p.name.toLowerCase().includes(searchTerm) ||
      (p.bengaliName && p.bengaliName.includes(searchTerm)) ||
      (p.description && p.description.toLowerCase().includes(searchTerm))
    );
  }

  if (categorySlug) {
    const group = getCategoryGroup(categorySlug);
    const targetSlugs = group
      ? new Set([
          ...group.subCategories.map(normalizeCategorySlug),
          normalizeCategorySlug(group.slug),
          categorySlug,
        ])
      : new Set([categorySlug]);

    filtered = filtered.filter((p) => {
      const pCat = normalizeCategorySlug(p.category ?? '');
      return targetSlugs.has(pCat);
    });
  }

  if (inStockOnly) {
    filtered = filtered.filter((p) => p.stock > 0);
  }

  const sorted = sortProducts(filtered, sort);
  const total = sorted.length;
  const paginated = sorted.slice(offset, offset + limit);
  const hasMore = total > offset + limit;

  let activeCategory: MobileCatalogPage['category'];
  if (categorySlug) {
    const matched = categories.find((c) => normalizeCategorySlug(c.slug) === categorySlug);
    if (matched) {
      activeCategory = { slug: matched.slug, name: matched.name, emoji: matched.emoji };
    }
  }

  const categoryNameById = new Map<string, string>();
  for (const cat of rawCategories ?? []) {
    categoryNameById.set(cat.id, cat.name);
  }

  return {
    locale,
    categories,
    items: paginated.map((p) => mapProductDto(p, locale, categoryNameById)),
    total,
    hasMore,
    ...(activeCategory ? { category: activeCategory } : {}),
  };
}

export async function getMobileCatalog(query: MobileCatalogQuery = {}): Promise<MobileCatalogPage> {
  const rawCategories = await getCachedCategoriesOrThrow();
  const locale = query.locale === 'bn' ? 'bn' : 'en';
  const limit = Math.max(1, Math.min(Math.trunc(query.limit ?? 20), 60));
  const offset = Math.max(0, Math.trunc(query.offset ?? 0));
  const normalizedCategory = query.category && query.category !== 'all'
    ? normalizeCategorySlug(query.category)
    : undefined;
  const group = normalizedCategory ? getCategoryGroup(normalizedCategory) : undefined;
  const categorySlugs = normalizedCategory
    ? new Set([
        ...(group ? group.subCategories.map(normalizeCategorySlug) : []),
        ...(group ? [normalizeCategorySlug(group.slug)] : []),
        normalizedCategory,
      ])
    : null;
  const categoryIds = categorySlugs
    ? [...new Set((rawCategories ?? [])
        .filter((category) => categorySlugs.has(normalizeCategorySlug(category.slug))
          || categorySlugs.has(normalizeCategorySlug(category.name)))
        .map((category) => category.id))]
    : null;
  const requestedSort = query.sort ?? 'best';
  const sort = ['price-asc', 'price-desc', 'name-asc'].includes(requestedSort) ? requestedSort : 'best';

  const data = await fetchMobileCatalogRpc({
    query: query.q?.trim().toLowerCase() ?? '',
    categoryIds: categoryIds?.sort() ?? null,
    inStockOnly: Boolean(query.inStockOnly),
    sort: sort as MobileCatalogSort,
    limit,
    offset,
  });

  const categoryById = new Map((rawCategories ?? []).map((category) => [category.id, category]));
  const categoryNameById = new Map((rawCategories ?? []).map((category) => [category.id, category.name]));
  const emojiResolver = new WordMatchEmojiResolver();
  const items = data.items.map((row: Record<string, unknown>) => {
    const categoryId = typeof row.category_id === 'string' ? row.category_id : undefined;
    const category = typeof row.category === 'string' ? row.category : '';
    const categoryEmoji = categoryId ? categoryById.get(categoryId)?.emoji : undefined;
    const price = Number(row.price);
    const mrp = Number(row.mrp);
    const product: Product = {
      id: createProductId(String(row.id ?? '')),
      name: String(row.name ?? ''),
      emoji: emojiResolver.resolve(category, categoryEmoji),
      price,
      ...(Number.isFinite(mrp) && mrp > price ? { originalPrice: mrp, badge: 'On Sale' } : {}),
      unit: 'pc',
      category,
      ...(categoryId ? { categoryId, category_id: categoryId } : {}),
      stock: Number(row.sellable_qty ?? 0),
      description: String(row.description ?? ''),
      ...(typeof row.image_url === 'string' ? { imageUrl: row.image_url, image_url: row.image_url } : {}),
      ...(typeof row.brand === 'string' ? { brand: row.brand } : {}),
      ...(typeof row.bengali_name === 'string' ? { bengaliName: row.bengali_name } : {}),
      ...(typeof row.bengali_description === 'string' ? { bengaliDescription: row.bengali_description } : {}),
    };
    return mapProductDto(product, locale, categoryNameById);
  });

  const categories: MobileCatalogCategory[] = (rawCategories ?? []).map((category) => ({
    id: category.id,
    slug: category.slug,
    name: locale === 'bn' ? (BENGALI_CATEGORY_NAMES[category.slug] || category.name) : category.name,
    emoji: category.emoji || '🛒',
    parentId: category.parentId ?? category.parent_id ?? null,
  }));
  const matchedCategory = normalizedCategory
    ? categories.find((category) => normalizeCategorySlug(category.slug) === normalizedCategory)
    : undefined;
  const total = Number(data.total);
  return {
    locale,
    categories,
    items,
    total,
    hasMore: total > offset + limit,
    ...(matchedCategory ? { category: {
      slug: matchedCategory.slug,
      name: matchedCategory.name,
      emoji: matchedCategory.emoji,
    } } : {}),
  };
}
