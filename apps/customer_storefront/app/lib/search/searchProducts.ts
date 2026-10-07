import { supabase } from '../supabase';
import type { Product } from '../products/types';
import { isMissingItemTranslationsTableError } from '../translationErrors';

export interface SearchOptions {
  query: string;
  storeId: string;
  categoryId?: string | null;
  limit?: number;
  offset?: number;
}

export interface SearchProductResult extends Product {
  bengaliName?: string;
  bengaliDescription?: string;
  searchTerms?: string[];
}

export async function searchStorefrontProducts({
  query,
  storeId,
  categoryId = null,
  limit = 50,
  offset = 0,
}: SearchOptions): Promise<SearchProductResult[]> {
  const cleanQuery = query.trim().toLowerCase();

  // 1. Query matching items from POS RPC
  const { data: posItems, error: posError } = await supabase.rpc('search_items_pos', {
    p_store_id: storeId,
    p_query: cleanQuery,
    p_category_id: categoryId,
    p_limit: limit,
    p_offset: offset,
  });

  if (posError) {
    console.error('search_items_pos failed:', posError);
    return [];
  }

  const items: SearchProductResult[] = (posItems || []).map((item: any) => ({
    id: item.item_id || item.id,
    name: item.name,
    description: item.description || '',
    price: Number(item.price),
    originalPrice: item.compare_price ? Number(item.compare_price) : undefined,
    stock: Number(item.stock || 0),
    unit: item.unit || '',
    emoji: '',
    category: item.category || '',
    brand: item.brand || '',
    image_url: item.image_url || '',
    imageUrl: item.image_url || '',
  }));

  if (items.length === 0) return [];

  // 2. Overlay published Bengali translations and search terms
  try {
    const itemIds = items.map((i) => i.id);
    const { data: translations, error: transError } = await (supabase as any)
      .from('item_translations')
      .select('item_id, name, description, search_terms')
      .in('item_id', itemIds)
      .eq('locale', 'bn')
      .eq('review_status', 'published');

    if (transError) {
      if (!isMissingItemTranslationsTableError(transError)) {
        console.error('Failed to query item translations for search:', transError);
      }
      return items;
    }

    if (translations && translations.length > 0) {
      const translationMap = new Map<string, any>();
      for (const t of translations) {
        translationMap.set(t.item_id, t);
      }

      for (const item of items) {
        const trans = translationMap.get(item.id);
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

  return items;
}
