import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://luckystore1947.com';
const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

// Static pages that actually exist in the production build and are indexable
const staticRoutes = [
  { path: '', priority: 1.0, changefreq: 'daily' },
  { path: '/category', priority: 0.8, changefreq: 'daily' },
  { path: '/privacy', priority: 0.3, changefreq: 'monthly' },
  { path: '/terms', priority: 0.3, changefreq: 'monthly' },
  { path: '/security-policy', priority: 0.3, changefreq: 'monthly' },
  { path: '/data-deletion', priority: 0.3, changefreq: 'monthly' },
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
async function getCategories(): Promise<{ slug: string; updatedAt: string }[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('slug, name, category')
      .eq('active', true)
      .eq('store_id', STORE_ID);

    if (error) throw error;

    return (data || []).map((c: any) => ({
      slug: c.slug || (c.name || c.category || '').toLowerCase().trim().replace(/\s+/g, '-'),
      updatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching categories for sitemap:', error);
    // Fallback static categories if DB query fails to ensure a valid sitemap is generated
    return [
      { slug: 'snacks', updatedAt: new Date().toISOString() },
      { slug: 'cooking-essentials', updatedAt: new Date().toISOString() },
      { slug: 'personal-care', updatedAt: new Date().toISOString() },
      { slug: 'cleaning-supplies', updatedAt: new Date().toISOString() },
      { slug: 'air-freshner', updatedAt: new Date().toISOString() },
      { slug: 'pest-control', updatedAt: new Date().toISOString() },
      { slug: 'breakfast', updatedAt: new Date().toISOString() },
      { slug: 'baby-care', updatedAt: new Date().toISOString() },
      { slug: 'tea-&-coffee', updatedAt: new Date().toISOString() },
      { slug: 'electronics', updatedAt: new Date().toISOString() },
      { slug: 'baking-needs', updatedAt: new Date().toISOString() },
    ];
  }
}

// Dynamic product pages
async function getProducts(): Promise<{ id: string; updatedAt: string }[]> {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('id, updated_at')
      .eq('is_active', true);

    if (error) throw error;

    return (data || []).map((i: any) => ({
      id: i.id,
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

  const now = new Date().toISOString().split('.')[0] + 'Z';

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changefreq as any,
    priority: route.priority,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${BASE_URL}/category/${encodeURIComponent(cat.slug)}`,
    lastModified: new Date(cat.updatedAt).toISOString().split('.')[0] + 'Z',
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${BASE_URL}/product/${product.id}`,
    lastModified: new Date(product.updatedAt).toISOString().split('.')[0] + 'Z',
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  return [
    ...staticEntries,
    ...categoryEntries,
    ...productEntries,
  ];
}