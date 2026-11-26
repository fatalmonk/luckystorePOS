import 'server-only';
import { unstable_cache } from 'next/cache';
import { supabase } from './supabase';
import { STOREFRONT_STORE_ID } from './products/constants';
import { getCategoryBrandCounts } from './categoryBrandFacets';

// The Ice Cream pilot uses the same 60-second catalog freshness contract as
// searchStorefrontProducts. Brand options must cover the whole category, but
// a paginated request must not refetch all name/brand sources on every visit.
export const getCachedCategoryBrandCounts = unstable_cache(
  async (categoryId: string) => getCategoryBrandCounts(supabase, categoryId),
  [
    'ice-cream-brand-facets-v1',
    STOREFRONT_STORE_ID,
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'unconfigured',
  ],
  { revalidate: 60, tags: ['storefront-catalog-search'] },
);
