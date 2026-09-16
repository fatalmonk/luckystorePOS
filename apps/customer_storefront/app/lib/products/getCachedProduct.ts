import { cache } from 'react';
import { supabase } from '../supabase';
import { createProductRepository, createProductId } from './index';
import { extractIdFromSlug, isBareUuid, toProductSlug } from './slugify';
import { FALLBACK_PRODUCTS } from './getHomePageData';
import type { Product } from './types';

/**
 * Cached product lookup for a given slug.
 * Deduplicates Supabase calls between generateMetadata and the page component
 * during the same request.
 */
export const getCachedProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  try {
    const { repo } = createProductRepository(supabase);

    if (isBareUuid(slug)) {
      const prod = await repo.getById(createProductId(slug));
      if (prod) return prod;
    } else {
      const prefix = extractIdFromSlug(slug);
      const prod = await repo.getByIdPrefix(prefix);
      if (prod) return prod;
    }

    // Fallback lookup from known fixtures if database query fails or is empty
    const prefix = extractIdFromSlug(slug).toLowerCase();
    const fallback = FALLBACK_PRODUCTS.find(
      (p) =>
        p.id === slug ||
        p.id.replace(/-/g, '').toLowerCase().startsWith(prefix) ||
        toProductSlug(p.name, p.id) === slug
    );
    if (fallback) {
      return {
        ...fallback,
        id: createProductId(fallback.id),
      };
    }
    return null;
  } catch (err) {
    console.error('getCachedProductBySlug error:', err);
    return null;
  }
});

