import { cache } from 'react';
import { supabase } from '../supabase';
import { createProductRepository, createProductId } from './index';
import { extractIdFromSlug, isBareUuid } from './slugify';
import type { Product } from './types';

/**
 * Cached product lookup for a given slug.
 * Deduplicates Supabase calls between generateMetadata and the page component
 * during the same request.
 */
export const getCachedProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  const { repo } = createProductRepository(supabase);

  if (isBareUuid(slug)) {
    return repo.getById(createProductId(slug));
  }

  const prefix = extractIdFromSlug(slug);
  return repo.getByIdPrefix(prefix);
});
