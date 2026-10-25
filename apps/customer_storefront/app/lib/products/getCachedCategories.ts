import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { supabase } from '../supabase';
import { createProductRepository } from './index';

const DEFAULT_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  || process.env.SUPABASE_URL
  || 'supabase-url-not-configured';

// React cache only deduplicates within one render/request. Keep this public,
// slow-changing catalogue data in Next's shared Data Cache as well so separate
// Vercel function instances do not each repeat the same PostgREST read.
const getCategoriesFromDataCache = unstable_cache(
  async () => {
    const { repo } = createProductRepository(supabase);
    return repo.getCategories();
  },
  ['storefront-categories-v1', DEFAULT_SUPABASE_URL],
  { revalidate: 300, tags: ['storefront-categories'] }
);

// API routes use this strict variant to preserve their error response when the
// underlying catalogue read fails. Page callers can keep using the fallback
// helper below.
export const getCachedCategoriesOrThrow = cache(async () => getCategoriesFromDataCache());

export const getCachedCategories = cache(async () => {
  try {
    return await getCachedCategoriesOrThrow();
  } catch (err) {
    console.error('Failed to get cached categories:', err);
    return [];
  }
});
