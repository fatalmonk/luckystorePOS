import { MetadataRoute } from 'next';

const BASE_URL = 'https://luckystore1947.com';

// Static pages
const staticRoutes = [
  { path: '', priority: 1.0, changefreq: 'daily' },
  { path: '/about', priority: 0.6, changefreq: 'monthly' },
  { path: '/contact', priority: 0.6, changefreq: 'monthly' },
  { path: '/faq', priority: 0.5, changefreq: 'monthly' },
  { path: '/privacy', priority: 0.3, changefreq: 'yearly' },
  { path: '/terms', priority: 0.3, changefreq: 'yearly' },
  { path: '/delivery-policy', priority: 0.5, changefreq: 'monthly' },
  { path: '/return-policy', priority: 0.5, changefreq: 'monthly' },
  { path: '/blog', priority: 0.7, changefreq: 'weekly' },
  { path: '/offers', priority: 0.8, changefreq: 'daily' },
  { path: '/categories', priority: 0.8, changefreq: 'weekly' },
  { path: '/search', priority: 0.4, changefreq: 'always' },
  { path: '/cart', priority: 0.4, changefreq: 'always' },
  { path: '/checkout', priority: 0.4, changefreq: 'always' },
  { path: '/track-order', priority: 0.5, changefreq: 'always' },
] as const;

// Dynamic category pages (fetch from your CMS/DB)
async function getCategories(): Promise<{ slug: string; updatedAt: string }[]> {
  // Replace with your actual data fetch from Supabase
  return [
    { slug: 'fresh-vegetables', updatedAt: '2026-06-26T00:00:00.000Z' },
    { slug: 'fruits', updatedAt: '2026-06-26T00:00:00.000Z' },
    { slug: 'dairy-eggs', updatedAt: '2026-06-26T00:00:00.000Z' },
    { slug: 'meat-seafood', updatedAt: '2026-06-26T00:00:00.000Z' },
    { slug: 'bakery', updatedAt: '2026-06-26T00:00:00.000Z' },
    { slug: 'beverages', updatedAt: '2026-06-26T00:00:00.000Z' },
    { slug: 'snacks', updatedAt: '2026-06-26T00:00:00.000Z' },
    { slug: 'pantry-staples', updatedAt: '2026-06-26T00:00:00.000Z' },
    { slug: 'cleaning-household', updatedAt: '2026-06-26T00:00:00.000Z' },
    { slug: 'personal-care', updatedAt: '2026-06-26T00:00:00.000Z' },
    { slug: 'baby-care', updatedAt: '2026-06-26T00:00:00.000Z' },
    { slug: 'frozen-foods', updatedAt: '2026-06-26T00:00:00.000Z' },
  ];
}

// Dynamic product pages (fetch from your CMS/DB)
async function getProducts(): Promise<{ slug: string; updatedAt: string }[]> {
  // Replace with your actual data fetch from Supabase
  return [
    { slug: 'fresh-potato-1kg', updatedAt: '2026-06-25T00:00:00.000Z' },
    { slug: 'red-tomato-500g', updatedAt: '2026-06-25T00:00:00.000Z' },
    { slug: 'deshi-egg-12pcs', updatedAt: '2026-06-24T00:00:00.000Z' },
  ];
}

// Dynamic blog posts
async function getBlogPosts(): Promise<{ slug: string; updatedAt: string }[]> {
  // Replace with your actual data fetch from Supabase
  return [
    { slug: 'how-to-choose-fresh-vegetables', updatedAt: '2026-06-20T00:00:00.000Z' },
    { slug: 'seasonal-fruits-chittagong-summer-2026', updatedAt: '2026-06-15T00:00:00.000Z' },
    { slug: 'bengali-cooking-essentials-pantry', updatedAt: '2026-06-10T00:00:00.000Z' },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products, blogPosts] = await Promise.all([
    getCategories(),
    getProducts(),
    getBlogPosts(),
  ]);

  // Strip milliseconds to ensure strict XML validator compatibility (Google Search Console prefers this)
  const now = new Date().toISOString().split('.')[0] + 'Z';

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: (route.changefreq === 'always' ? 'daily' : route.changefreq) as any,
    priority: route.priority,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${BASE_URL}/categories/${cat.slug}`,
    lastModified: new Date(cat.updatedAt).toISOString().split('.')[0] + 'Z',
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${BASE_URL}/products/${product.slug}`,
    lastModified: new Date(product.updatedAt).toISOString().split('.')[0] + 'Z',
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt).toISOString().split('.')[0] + 'Z',
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [
    ...staticEntries,
    ...categoryEntries,
    ...productEntries,
    ...blogEntries,
  ];
}