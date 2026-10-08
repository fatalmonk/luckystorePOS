import { getCachedCategories } from '../products/getCachedCategories';
import { createProductRepository } from '../products/index';
import { BENGALI_CATEGORY_NAMES } from '../products/getHomePageData';
import { getCategoryGroup, normalizeCategorySlug } from '../types';
import type { Category, Product } from '../products/types';
import { supabase } from '../supabase';

export type MobileLocale = 'en' | 'bn';
export type MobileCatalogSort = 'best' | 'price-asc' | 'price-desc' | 'name-asc';

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

function mapProductDto(product: Product): MobileCatalogProduct {
  const imageUrl = product.imageUrl ?? product.image_url;
  return {
    id: product.id,
    name: product.name,
    emoji: product.emoji || '🛒',
    price: product.price,
    ...(product.originalPrice !== undefined ? { originalPrice: product.originalPrice } : {}),
    unit: product.unit || 'pc',
    stock: product.stock,
    ...(imageUrl ? { imageUrl } : {}),
    ...(product.badge ? { badge: product.badge } : {}),
    category: product.category,
    ...(product.categoryId || product.category_id ? { categoryId: product.categoryId ?? product.category_id } : {}),
    ...(product.description ? { description: product.description } : {}),
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
      ? new Set(group.subCategories.map(normalizeCategorySlug))
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

  return {
    locale,
    categories,
    items: paginated.map(mapProductDto),
    total,
    hasMore,
    ...(activeCategory ? { category: activeCategory } : {}),
  };
}

export async function getMobileCatalog(query: MobileCatalogQuery = {}): Promise<MobileCatalogPage> {
  const rawCategories = await getCachedCategories();
  const { repo } = createProductRepository(supabase);
  const { products: allProducts } = await repo.search({ query: query.q?.trim() || undefined });
  return toMobileCatalog(rawCategories, allProducts, query);
}
