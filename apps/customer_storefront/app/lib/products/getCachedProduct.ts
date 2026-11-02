import { cache } from 'react';
import { supabase } from '../supabase';
import { createProductRepository, createProductId } from './index';
import { extractIdFromSlug, isBareUuid, toProductSlug } from './slugify';
import { CATALOG_SNAPSHOT_PRODUCTS, FALLBACK_PRODUCTS } from './getHomePageData';
import type { Product } from './types';

/**
 * Cached product lookup for a given slug.
 * Deduplicates Supabase calls between generateMetadata and the page component
 * during the same request.
 */
export const getCachedProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  const prefix = extractIdFromSlug(slug).toLowerCase();
  try {
    const { repo } = createProductRepository(supabase);

    if (isBareUuid(slug)) {
      const prod = await repo.getById(createProductId(slug));
      if (prod) return prod;
    } else {
      const prod = await repo.getByIdPrefix(prefix);
      if (prod) return prod;
    }
  } catch (err) {
    console.error('getCachedProductBySlug error:', err);
  }

  // Snapshot rows are explicitly marked unavailable for purchase because stock is unknown.
  const fallback = [...CATALOG_SNAPSHOT_PRODUCTS, ...FALLBACK_PRODUCTS].find(
    (p) =>
      p.id === slug ||
      p.id.replace(/-/g, '').toLowerCase().startsWith(prefix) ||
      toProductSlug(p.name, p.id) === slug
  );
  return fallback ? { ...fallback, id: createProductId(fallback.id) } : null;
});

