import { MetadataRoute } from 'next';
import { supabase } from './lib/supabase';
import { getCachedCategories } from './lib/products/getCachedCategories';
import { toProductSlug } from './lib/products/slugify';
import { getCanonicalCategorySlug } from './lib/types';
import { isMissingItemTranslationsTableError } from './lib/translationErrors';
import { POPULAR_BRANDS, isProductOfBrand } from './lib/brandsData';

const BASE_URL = 'https://www.luckystore1947.com';
const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';
export const revalidate = 86_400;

// Dynamic index pairs — reciprocal alternates & real DB-derived newest lastMod
const dynamicIndexRoutes = [
  {
    enPath: '',
    bnPath: '/bn',
    priority: 1.0,
    changefreq: 'daily',
  },
  {
    enPath: '/category',
    bnPath: '/bn/category',
    priority: 0.8,
    changefreq: 'daily',
  },
  {
    enPath: '/brand',
    bnPath: '/bn/brand',
    priority: 0.8,
    changefreq: 'daily',
  },
] as const;

// Truly static routes: audited for exact localized /bn/... route existence.
// Only routes with verified page implementations emit localized counterparts and alternates.
const staticRoutes = [
  {
    enPath: '/fortune-cookies-near-me',
    bnPath: '/bn/fortune-cookies-near-me',
    priority: 0.8,
    changefreq: 'weekly',
    lastMod: '2026-09-25T00:00:00Z',
  },
  {
    enPath: '/delivery',
    bnPath: '/bn/delivery',
    priority: 0.8,
    changefreq: 'weekly',
    lastMod: '2026-09-08T00:00:00Z',
  },
  {
    enPath: '/contact',
    bnPath: null,
    priority: 0.5,
    changefreq: 'monthly',
    lastMod: '2026-06-01T00:00:00Z',
  },
  {
    enPath: '/privacy',
    bnPath: null,
    priority: 0.3,
    changefreq: 'monthly',
    lastMod: '2026-06-01T00:00:00Z',
  },
  {
    enPath: '/terms',
    bnPath: null,
    priority: 0.3,
    changefreq: 'monthly',
    lastMod: '2026-06-01T00:00:00Z',
  },
  {
    enPath: '/security-policy',
    bnPath: null,
    priority: 0.3,
    changefreq: 'monthly',
    lastMod: '2026-06-01T00:00:00Z',
  },
  {
    enPath: '/data-deletion',
    bnPath: null,
    priority: 0.3,
    changefreq: 'monthly',
    lastMod: '2026-06-01T00:00:00Z',
  },
] as const;

// Dynamic category pages: shares the exact canonical slug normalization used by category routing
async function getCategories(): Promise<{ id?: string; slug: string; name?: string }[]> {
  try {
    const categories = await getCachedCategories();
    const seenSlugs = new Set<string>();
    const result: { id?: string; slug: string; name?: string }[] = [];

    for (const cat of categories) {
      const canonicalSlug = getCanonicalCategorySlug(cat.slug || cat.name);
      if (canonicalSlug && !seenSlugs.has(canonicalSlug)) {
        seenSlugs.add(canonicalSlug);
        result.push({ id: cat.id, slug: canonicalSlug, name: cat.name });
      }
    }

    return result;
  } catch (error) {
    console.error('Error fetching categories for sitemap:', error);
    return [];
  }
}

/**
 * Product Sitemap Eligibility Predicate
 */
export function isProductSitemapEligible(item: {
  id?: unknown;
  item_id?: unknown;
  name?: unknown;
  price?: unknown;
  is_active?: unknown;
  active?: unknown;
}): boolean {
  const id = item.id ?? item.item_id;
  const name = item.name;
  const price = Number(item.price);

  if (typeof id !== 'string' || id.trim().length === 0) return false;
  if (typeof name !== 'string' || name.trim().length === 0) return false;
  if (!Number.isFinite(price) || price <= 0) return false;

  if (item.is_active !== undefined && item.is_active !== true) return false;
  if (item.active !== undefined && item.active !== true) return false;

  return true;
}

// Dynamic product pages: enforces strict sitemap eligibility contract
async function getProducts(): Promise<{ id: string; name: string; brand: string; category: string; categoryId: string; updatedAt: string | null }[]> {
  try {
    // Protocol limit: 50,000 URLs per sitemap file. With up to 2 URLs per product (EN & BN),
    // cap at 24,000 products to strictly prevent crawlers rejecting an oversized single file.
    const MAX_SITEMAP_PRODUCTS = 24_000;
    const PAGE_SIZE = 1000;
    let offset = 0;
    const allProducts: { id: string; name: string; brand: string; category: string; categoryId: string; updatedAt: string | null }[] = [];

    while (allProducts.length < MAX_SITEMAP_PRODUCTS) {
      const fetchLimit = Math.min(PAGE_SIZE, MAX_SITEMAP_PRODUCTS - allProducts.length);
      const { data, error } = await supabase.rpc('search_storefront_catalog', {
        p_store_id: STORE_ID,
        p_query: '',
        p_category_id: null,
        p_limit: fetchLimit,
        p_offset: offset,
      });

      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      if (rows.length === 0) break;

      for (const i of rows) {
        if (isProductSitemapEligible(i)) {
          allProducts.push({
            id: String(i.id ?? i.item_id).trim(),
            name: i.name.trim(),
            brand: String(i.brand || '').trim(),
            category: String(i.category || '').trim(),
            categoryId: String(i.category_id || '').trim(),
            updatedAt: i.updated_at || i.created_at || null,
          });
          if (allProducts.length >= MAX_SITEMAP_PRODUCTS) break;
        }
      }

      if (rows.length < fetchLimit) break;
      offset += fetchLimit;
    }

    return allProducts;
  } catch (error) {
    console.error('Error fetching products for sitemap:', error);
    return [];
  }
}

async function getPublishedBengaliItemIds(): Promise<Set<string>> {
  try {
    const PAGE_SIZE = 1000;
    let offset = 0;
    const itemIds = new Set<string>();

    while (true) {
      const { data, error } = await (supabase as any)
        .from('item_translations')
        .select('item_id')
        .eq('locale', 'bn')
        .eq('review_status', 'published')
        .order('item_id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        if (!isMissingItemTranslationsTableError(error)) {
          console.error('Error querying published item translations for sitemap:', error);
        }
        break;
      }

      const rows = data || [];
      for (const row of rows) {
        if (row.item_id) {
          itemIds.add(String(row.item_id));
        }
      }

      if (rows.length < PAGE_SIZE) {
        break;
      }

      offset += PAGE_SIZE;
    }

    return itemIds;
  } catch (error) {
    console.error('Unexpected error fetching published translations for sitemap:', error);
    return new Set<string>();
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products, publishedBnItemIds] = await Promise.all([
    getCategories(),
    getProducts(),
    getPublishedBengaliItemIds(),
  ]);

  const productUpdatedAts = products
    .map((p) => p.updatedAt)
    .filter((ts): ts is string => typeof ts === 'string' && ts.length > 0);

  const newestMod = productUpdatedAts.length
    ? new Date(productUpdatedAts.reduce((a, b) => (a > b ? a : b))).toISOString().split('.')[0] + 'Z'
    : undefined;

  const dynamicIndexEntries: MetadataRoute.Sitemap = [];
  for (const route of dynamicIndexRoutes) {
    const enUrl = `${BASE_URL}${route.enPath}`;
    const bnUrl = `${BASE_URL}${route.bnPath}`;

    dynamicIndexEntries.push({
      url: enUrl,
      ...(newestMod ? { lastModified: newestMod } : {}),
      changeFrequency: route.changefreq as any,
      priority: route.priority,
      alternates: {
        languages: {
          'en-BD': enUrl,
          'bn-BD': bnUrl,
          'x-default': enUrl,
        },
      },
    });

    dynamicIndexEntries.push({
      url: bnUrl,
      ...(newestMod ? { lastModified: newestMod } : {}),
      changeFrequency: route.changefreq as any,
      priority: route.priority,
      alternates: {
        languages: {
          'en-BD': enUrl,
          'bn-BD': bnUrl,
          'x-default': enUrl,
        },
      },
    });
  }

  const staticEntries: MetadataRoute.Sitemap = [];
  for (const route of staticRoutes) {
    const enUrl = `${BASE_URL}${route.enPath}`;
    const bnUrl = route.bnPath ? `${BASE_URL}${route.bnPath}` : null;

    staticEntries.push({
      url: enUrl,
      lastModified: route.lastMod,
      changeFrequency: route.changefreq as any,
      priority: route.priority,
      ...(bnUrl
        ? {
            alternates: {
              languages: {
                'en-BD': enUrl,
                'bn-BD': bnUrl,
                'x-default': enUrl,
              },
            },
          }
        : {}),
    });

    if (bnUrl) {
      staticEntries.push({
        url: bnUrl,
        lastModified: route.lastMod,
        changeFrequency: route.changefreq as any,
        priority: route.priority,
        alternates: {
          languages: {
            'en-BD': enUrl,
            'bn-BD': bnUrl,
            'x-default': enUrl,
          },
        },
      });
    }
  }

  const categoryEntries: MetadataRoute.Sitemap = [];
  for (const cat of categories) {
    const url = `${BASE_URL}/category/${cat.slug}`;
    const bnUrl = `${BASE_URL}/bn/category/${cat.slug}`;
    const catProducts = products.filter(
      (p) =>
        (cat.id && p.categoryId && p.categoryId === cat.id) ||
        (p.category && getCanonicalCategorySlug(p.category) === cat.slug) ||
        (cat.name && p.category && p.category.toLowerCase() === cat.name.toLowerCase())
    );
    const catUpdatedAts = catProducts
      .map((p) => p.updatedAt)
      .filter((ts): ts is string => typeof ts === 'string' && ts.length > 0);
    const catLastMod = catUpdatedAts.length
      ? new Date(catUpdatedAts.reduce((a, b) => (a > b ? a : b))).toISOString().split('.')[0] + 'Z'
      : undefined;

    categoryEntries.push({
      url,
      ...(catLastMod ? { lastModified: catLastMod } : {}),
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: {
        languages: {
          'en-BD': url,
          'bn-BD': bnUrl,
          'x-default': url,
        },
      },
    });
    categoryEntries.push({
      url: bnUrl,
      ...(catLastMod ? { lastModified: catLastMod } : {}),
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: {
        languages: {
          'en-BD': url,
          'bn-BD': bnUrl,
          'x-default': url,
        },
      },
    });
  }

  const brandEntries: MetadataRoute.Sitemap = [];
  for (const brand of POPULAR_BRANDS) {
    const url = `${BASE_URL}/brand/${brand.slug}`;
    const bnUrl = `${BASE_URL}/bn/brand/${brand.slug}`;
    const brandProducts = products.filter((p) => isProductOfBrand(p, brand));
    const brandUpdatedAts = brandProducts
      .map((p) => p.updatedAt)
      .filter((ts): ts is string => typeof ts === 'string' && ts.length > 0);
    const brandLastMod = brandUpdatedAts.length
      ? new Date(brandUpdatedAts.reduce((a, b) => (a > b ? a : b))).toISOString().split('.')[0] + 'Z'
      : undefined;

    brandEntries.push({
      url,
      ...(brandLastMod ? { lastModified: brandLastMod } : {}),
      changeFrequency: 'daily',
      priority: 0.8,
      alternates: {
        languages: {
          'en-BD': url,
          'bn-BD': bnUrl,
          'x-default': url,
        },
      },
    });
    brandEntries.push({
      url: bnUrl,
      ...(brandLastMod ? { lastModified: brandLastMod } : {}),
      changeFrequency: 'daily',
      priority: 0.8,
      alternates: {
        languages: {
          'en-BD': url,
          'bn-BD': bnUrl,
          'x-default': url,
        },
      },
    });
  }

  const productEntries: MetadataRoute.Sitemap = [];
  for (const product of products) {
    const slug = toProductSlug(product.name, product.id);
    const url = `${BASE_URL}/product/${slug}`;
    const bnUrl = `${BASE_URL}/bn/product/${slug}`;
    const lastMod = product.updatedAt
      ? { lastModified: new Date(product.updatedAt).toISOString().split('.')[0] + 'Z' }
      : {};

    const hasPublishedBn = publishedBnItemIds.has(product.id);

    productEntries.push({
      url,
      ...lastMod,
      changeFrequency: 'daily',
      priority: 0.8,
      alternates: {
        languages: hasPublishedBn
          ? {
              'en-BD': url,
              'bn-BD': bnUrl,
              'x-default': url,
            }
          : {
              'en-BD': url,
              'x-default': url,
            },
      },
    });

    if (hasPublishedBn) {
      productEntries.push({
        url: bnUrl,
        ...lastMod,
        changeFrequency: 'daily',
        priority: 0.8,
        alternates: {
          languages: {
            'en-BD': url,
            'bn-BD': bnUrl,
            'x-default': url,
          },
        },
      });
    }
  }

  return [
    ...dynamicIndexEntries,
    ...staticEntries,
    ...categoryEntries,
    ...brandEntries,
    ...productEntries,
  ];
}