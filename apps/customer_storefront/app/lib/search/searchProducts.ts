import { supabase as defaultSupabase } from '../supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '../products/types';
import { createProductId } from '../products/types';
import { isMissingItemTranslationsTableError } from '../translationErrors';

export interface SearchOptions {
  query?: string;
  storeId?: string;
  categoryId?: string | null;
  categoryIds?: string[];
  limit?: number;
  offset?: number;
  page?: number;
  supabaseClient?: SupabaseClient | any;
}

export interface SearchProductResult extends Product {
  bengaliName?: string;
  bengaliDescription?: string;
  searchTerms?: string[];
}

export interface SearchProductsResponse {
  products: SearchProductResult[];
  hasMore: boolean;
}

const DEFAULT_STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

function sanitizePostgrestSearchTerm(input: string): string {
  // Strip PostgREST syntax characters and wildcards to prevent filter injection
  return input.replace(/[(),.*%\\":{}'"[\]]/g, ' ').trim().replace(/\s+/g, ' ');
}

export async function searchStorefrontProducts({
  query = '',
  storeId = DEFAULT_STORE_ID,
  categoryId = null,
  categoryIds,
  limit = 50,
  offset,
  page,
  supabaseClient = defaultSupabase,
}: SearchOptions): Promise<SearchProductsResponse> {
  const actualOffset = offset !== undefined ? offset : (page ?? 0) * limit;
  const cleanQuery = query.trim().toLowerCase();
  const safeQuery = sanitizePostgrestSearchTerm(cleanQuery);

  let translationMatchedItemIds: string[] = [];

  // 1. If searching with a text query, match published Bengali translations before pagination using sanitized predicate
  if (safeQuery.length > 0) {
    try {
      const { data: transMatches, error: transError } = await (supabaseClient as any)
        .from('item_translations')
        .select('item_id')
        .eq('locale', 'bn')
        .eq('review_status', 'published')
        .or(`name.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%,search_terms.cs.{${safeQuery}}`);

      if (transError) {
        if (!isMissingItemTranslationsTableError(transError)) {
          console.error('Failed to match item translations for search:', transError);
        }
      } else if (transMatches) {
        translationMatchedItemIds = transMatches
          .map((t: any) => String(t.item_id || ''))
          .filter((id: string) => id.length > 0);
      }
    } catch (err) {
      console.error('Unexpected error matching translations:', err);
    }
  }

  // 2. Fetch primary POS search items
  let targetCategoryIds: (string | null)[] = [categoryId];
  if (categoryIds && categoryIds.length > 0) {
    targetCategoryIds = categoryIds;
  }

  const rawRowsMap = new Map<string, any>();

  for (const catId of targetCategoryIds) {
    const { data: posItems, error: posError } = await (supabaseClient as any).rpc('search_items_pos', {
      p_store_id: storeId,
      p_query: cleanQuery,
      p_category_id: catId,
      p_limit: 1000,
      p_offset: 0,
    });

    if (posError) {
      console.error('search_items_pos failed:', posError);
      throw new Error(`RPC search failed: ${posError.message || posError}`);
    }

    for (const item of (posItems || [])) {
      const id = String(item.item_id ?? item.id ?? '').trim();
      if (id && !rawRowsMap.has(id)) {
        rawRowsMap.set(id, item);
      }
    }
  }

  // 3. Merge items matched via Bengali translations that weren't in POS RPC results, respecting category constraints
  if (translationMatchedItemIds.length > 0) {
    const missingIds = translationMatchedItemIds.filter((id) => !rawRowsMap.has(id));
    if (missingIds.length > 0) {
      try {
        const { data: allCatalogItems, error: catalogError } = await (supabaseClient as any).rpc('search_items_pos', {
          p_store_id: storeId,
          p_query: '',
          p_category_id: null,
          p_limit: 1000,
          p_offset: 0,
        });

        if (!catalogError && allCatalogItems) {
          const missingSet = new Set(missingIds);
          const requestedCategorySet = new Set<string>();
          if (categoryId) requestedCategorySet.add(categoryId);
          if (categoryIds && categoryIds.length > 0) {
            for (const cat of categoryIds) {
              if (cat) requestedCategorySet.add(cat);
            }
          }

          for (const item of allCatalogItems) {
            const id = String(item.item_id ?? item.id ?? '').trim();
            if (!missingSet.has(id) || rawRowsMap.has(id)) {
              continue;
            }

            if (requestedCategorySet.size > 0) {
              const itemCat = String(item.category_id ?? item.category ?? '').trim();
              if (!itemCat || !requestedCategorySet.has(itemCat)) {
                continue;
              }
            }

            rawRowsMap.set(id, item);
          }
        }
      } catch (err) {
        console.error('Failed to resolve missing translated items:', err);
      }
    }
  }

  const allRows = Array.from(rawRowsMap.values());
  const hasMore = allRows.length > actualOffset + limit;
  const paginatedRows = allRows.slice(actualOffset, actualOffset + limit);

  // 4. Map RPC fields (mrp -> originalPrice / sale badge, qty_on_hand -> stock)
  const items: SearchProductResult[] = paginatedRows.map((item: any) => {
    const id = createProductId(String(item.item_id ?? item.id ?? ''));
    const price = Number(item.price);
    const mrp = item.mrp ? Number(item.mrp) : undefined;
    const originalPrice = mrp && mrp > price ? mrp : undefined;
    const stock = Number(item.stock ?? item.qty_on_hand ?? 0);

    return {
      id,
      name: item.name,
      description: item.description || '',
      price,
      originalPrice,
      badge: originalPrice ? 'On Sale' : undefined,
      stock,
      unit: item.unit || 'pc',
      emoji: '',
      category: item.category || '',
      categoryId: item.category_id || undefined,
      category_id: item.category_id || undefined,
      brand: item.brand || '',
      imageUrl: item.image_url || undefined,
      image_url: item.image_url || undefined,
    };
  });

  // 5. Overlay published Bengali translations and search terms
  if (items.length > 0) {
    try {
      const itemIds = items.map((i) => String(i.id));
      const { data: translations, error: transError } = await (supabaseClient as any)
        .from('item_translations')
        .select('item_id, name, description, search_terms')
        .in('item_id', itemIds)
        .eq('locale', 'bn')
        .eq('review_status', 'published');

      if (transError) {
        if (!isMissingItemTranslationsTableError(transError)) {
          console.error('Failed to query item translations for search overlay:', transError);
        }
      } else if (translations && translations.length > 0) {
        const translationMap = new Map<string, any>();
        for (const t of translations) {
          translationMap.set(String(t.item_id), t);
        }

        for (const item of items) {
          const trans = translationMap.get(String(item.id));
          if (trans) {
            item.bengaliName = trans.name;
            item.bengaliDescription = trans.description;
            item.searchTerms = trans.search_terms;
          }
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching translation overlays:', err);
    }
  }

  return {
    products: items,
    hasMore,
  };
}
