import { cache } from 'react';
import { supabase } from '../supabase';
import { createProductRepository } from './index';
import type { Product } from './types';

const MAX_CROSS_SELL = 8;

/**
 * Cached cross-sell lookup for a product page.
 * Fallback strategy (until real order co-occurrence data exists):
 * 1. Same category products, excluding the current product.
 * 2. Limit to MAX_CROSS_SELL * 2 so both carousels can be populated.
 *
 * In the future, swap this helper to use real order co-occurrence data
 * without changing the component interface.
 */
export const getCachedCrossSellProducts = cache(
  async (
    categorySlug: string,
    categoryId: string | undefined,
    currentProductId: string
  ): Promise<Product[]> => {
    const { repo } = createProductRepository(supabase);

    // Prefer categoryId (UUID) for exact DB filtering; fall back to broad search + slug match.
    const { products } = categoryId
      ? await repo.search({
          categoryId,
          limit: MAX_CROSS_SELL * 2 + 1,
        })
      : await repo.search({
          query: categorySlug,
          limit: 200,
        });

    return products
      .filter((p) => p.id !== currentProductId)
      .slice(0, MAX_CROSS_SELL * 2);
  }
);

/**
 * Prepare cross-sell products for the product detail page.
 *
 * Current implementation: returns a single list of products from the same
 * category ("More to explore"). This is a fallback until real order
 * co-occurrence data exists; at that point, replace with a separate
 * "Customers also bought" query instead of pretending the same source
 * represents two distinct signals.
 */
export function prepareCrossSell(products: Product[]): Product[] {
  return products;
}
