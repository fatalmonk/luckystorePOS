import type { MetadataRoute } from 'next';
import { fetchProducts, fetchCategories } from './lib/products';
import { CATEGORY_GROUPS } from './lib/types';

const BASE_URL = 'https://luckystore1947.com';

export const revalidate = 3600; // Regenerate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/category`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ];

  // Add category pages
  try {
    const categories = await fetchCategories();
    for (const cat of categories) {
      urls.push({
        url: `${BASE_URL}/category/${cat.slug}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      });
    }
  } catch (e) {
    console.error('Sitemap: failed to fetch categories:', e);
  }

  // Add category group pages
  for (const group of CATEGORY_GROUPS) {
    urls.push({
      url: `${BASE_URL}/category/${group.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    });
  }

  // Add product pages
  try {
    const { products } = await fetchProducts();
    for (const product of products) {
      urls.push({
        url: `${BASE_URL}/product/${product.id}`,
        lastModified: product.created_at ? new Date(product.created_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  } catch (e) {
    console.error('Sitemap: failed to fetch products:', e);
  }

  return urls;
}