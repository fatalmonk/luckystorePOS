import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { toProductSlug } from './lib/products/slugify';

const BASE_URL = 'https://luckystore1947.com';
const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

// Dynamic index pages — lastMod derived at runtime from newest DB content
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

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder',
  { auth: { persistSession: false } }
);

// Dynamic category pages
async function getCategories(): Promise<{ slug: string }[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('slug, name, category')
      .eq('active', true)
      .eq('store_id', STORE_ID);

    if (error) throw error;

    return (data || []).map((c: any) => ({
      slug: (c.slug || c.name || c.category || '')
        .toLowerCase()
        .trim()
        .replace(/&/g, 'and')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-'),
    }));
  } catch (error) {
    console.error('Error fetching categories for sitemap:', error);
    // Fallback static categories if DB query fails to ensure a valid sitemap is generated
    return [
      'oil-and-ghee',
      'rice-and-grain',
      'dairy-and-eggs',
      'snacks',
      'cold-beverages',
      'personal-care',
      'cooking-essentials',
      'cleaning-supplies',
      'breakfast',
      'tea-and-coffee',
      'electronics',
      'baking-needs',
      'baby-care',
    ].map((slug) => ({ slug }));
  }
}

// Dynamic product pages
async function getProducts(): Promise<{ id: string; name: string; updatedAt: string }[]> {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('id, name, updated_at')
      .eq('is_active', true);

    if (error) throw error;

    return (data || []).map((i: any) => ({
      id: i.id,
      name: i.name || '',
      updatedAt: i.updated_at || new Date().toISOString(),
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
  // Category pages have no updated_at column, so we exclude them to avoid
  // every build appearing as "just modified" and triggering unnecessary crawler re-fetches.
  const productUpdatedAts = products.map(p => p.updatedAt).filter(Boolean);
  const newestUpdatedAt = productUpdatedAts.length
    ? productUpdatedAts.reduce((a, b) => (a > b ? a : b))
    : new Date().toISOString();
  const newestMod = new Date(newestUpdatedAt).toISOString().split('.')[0] + 'Z';

  const dynamicIndexEntries: MetadataRoute.Sitemap = dynamicIndexRoutes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: newestMod,
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
    // lastModified intentionally omitted: no updated_at column on categories table.
    // Omitting is spec-compliant and prevents false "just updated" signals to crawlers.
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${BASE_URL}/product/${toProductSlug(product.name, product.id)}`,
    lastModified: new Date(product.updatedAt).toISOString().split('.')[0] + 'Z',
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