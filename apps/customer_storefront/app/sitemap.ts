import { MetadataRoute } from 'next';
import { supabase } from './lib/supabase';
import { getCachedCategories } from './lib/products/getCachedCategories';
import { toProductSlug } from './lib/products/slugify';
import { normalizeCategorySlug } from './lib/types';

const BASE_URL = 'https://luckystore1947.com';
const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

// Dynamic index pages — lastMod derived at runtime from newest DB content only
const dynamicIndexRoutes = [
  { path: '', priority: 1.0, changefreq: 'daily' },
  { path: '/category', priority: 0.8, changefreq: 'daily' },
] as const;

// Truly static pages — content rarely changes; hardcoded dates are appropriate
const staticRoutes = [
  { path: '/contact', priority: 0.5, changefreq: 'monthly', lastMod: '2026-06-01T00:00:00Z' },
  { path: '/privacy', priority: 0.3, changefreq: 'monthly', lastMod: '2026-06-01T00:00:00Z' },
  { path: '/terms', priority: 0.3, changefreq: 'monthly', lastMod: '2026-06-01T00:00:00Z' },
  { path: '/security-policy', priority: 0.3, changefreq: 'monthly', lastMod: '2026-06-01T00:00:00Z' },
  { path: '/data-deletion', priority: 0.3, changefreq: 'monthly', lastMod: '2026-06-01T00:00:00Z' },
] as const;

// Dynamic category pages: shares the exact canonical slug normalization used by category routing
async function getCategories(): Promise<{ slug: string }[]> {
  try {
    const categories = await getCachedCategories();
    const seenSlugs = new Set<string>();
    const result: { slug: string }[] = [];

    for (const cat of categories) {
      const canonicalSlug = normalizeCategorySlug(cat.slug || cat.name);
      if (canonicalSlug && !seenSlugs.has(canonicalSlug)) {
        seenSlugs.add(canonicalSlug);
        result.push({ slug: canonicalSlug });
      }
    }

    return result;
  } catch (error) {
    console.error('Error fetching categories for sitemap:', error);
    // Return empty list on failure — never inject fabricated fallback URLs
    return [];
  }
}

// Dynamic product pages: enforces strict sitemap eligibility contract
async function getProducts(): Promise<{ id: string; name: string; updatedAt: string | null }[]> {
  try {
    const { data, error } = await supabase.rpc('search_items_pos', {
      p_store_id: STORE_ID,
      p_query: '',
      p_category_id: null,
      p_limit: 5000,
      p_offset: 0,
    });

    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];

    return rows
      .filter((i: any) => {
        const id = i.id ?? i.item_id;
        const price = Number(i.price);
        const isActive = i.is_active !== false && i.active !== false;
        return (
          typeof id === 'string' &&
          id.trim().length > 0 &&
          typeof i.name === 'string' &&
          i.name.trim().length > 0 &&
          Number.isFinite(price) &&
          price > 0 &&
          isActive
        );
      })
      .map((i: any) => ({
        id: String(i.id ?? i.item_id).trim(),
        name: i.name.trim(),
        updatedAt: i.updated_at || i.created_at || null,
      }));
  } catch (error) {
    console.error('Error fetching products for sitemap:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts(),
  ]);

  // Derive homepage/listing lastMod from the newest *real* product timestamp only.
  // When no legitimate timestamp is available, lastModified is omitted (never use Date.now()).
  const productUpdatedAts = products
    .map((p) => p.updatedAt)
    .filter((ts): ts is string => typeof ts === 'string' && ts.length > 0);

  const newestMod = productUpdatedAts.length
    ? new Date(productUpdatedAts.reduce((a, b) => (a > b ? a : b))).toISOString().split('.')[0] + 'Z'
    : undefined;

  const dynamicIndexEntries: MetadataRoute.Sitemap = dynamicIndexRoutes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    ...(newestMod ? { lastModified: newestMod } : {}),
    changeFrequency: route.changefreq as any,
    priority: route.priority,
  }));

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: route.lastMod,
    changeFrequency: route.changefreq as any,
    priority: route.priority,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${BASE_URL}/category/${cat.slug}`,
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${BASE_URL}/product/${toProductSlug(product.name, product.id)}`,
    ...(product.updatedAt
      ? { lastModified: new Date(product.updatedAt).toISOString().split('.')[0] + 'Z' }
      : {}),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [
    ...dynamicIndexEntries,
    ...staticEntries,
    ...categoryEntries,
    ...productEntries,
  ];
}
