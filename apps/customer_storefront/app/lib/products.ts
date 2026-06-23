import { supabase } from './supabase';
import type { Product, Category } from './types';

const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

/**
 * Fetch a single product by ID.
 * TODO: Replace with a dedicated `get_item_by_id` RPC to avoid loading the full catalog.
 * Currently uses search_items_pos (SECURITY DEFINER) because items table RLS blocks anon direct queries.
 */
export async function fetchProductById(id: string): Promise<Product | null> {
  try {
    const [itemsRes, cats] = await Promise.all([
      supabase.rpc('search_items_pos', {
        p_store_id: STORE_ID,
        p_query: '',
        p_category_id: null,
        p_limit: 1000,
        p_offset: 0,
      }),
      fetchCategories(),
    ]);

    if (itemsRes.error) throw itemsRes.error;

    const item = (itemsRes.data ?? []).find((i: any) => (i.id ?? i.item_id) === id);
    if (!item) return null;

    const emojiMap = new Map(cats.map(c => [c.slug, c.emoji]));
    const emojiById = new Map(cats.map(c => [c.id, c.emoji]));
    const price = Number(item.price);
    const originalPrice = Number(item.mrp || item.price);

    return {
      id: item.id ?? item.item_id,
      name: item.name,
      emoji: emojiMap.get(item.category) ?? emojiById.get(item.category_id) ?? '📦',
      price,
      originalPrice: originalPrice > price ? originalPrice : undefined,
      badge: originalPrice > price ? 'On Sale' : undefined,
      unit: 'pc',
      category: item.category as Category,
      stock: Number(item.stock ?? item.qty_on_hand ?? 0),
      description: item.description ?? '',
      image_url: item.image_url,
      created_at: item.created_at,
    };
  } catch (error) {
    console.error('Error in fetchProductById:', error);
    return null;
  }
}

export interface FetchProductsResult {
  products: Product[];
  hasMore: boolean;
}

export async function fetchProducts(
  q?: string,
  categoryId?: string,
  categoryIds?: string[],
  page: number = 0,
  limit: number = 60
): Promise<FetchProductsResult> {
  try {
    const [itemsRes, cats] = await Promise.all([
      supabase.rpc('search_items_pos', {
        p_store_id: STORE_ID,
        p_query: q ?? '',
        p_category_id: categoryId && !categoryIds?.length ? categoryId : null,
        p_limit: limit + 1, // Fetch one extra to determine hasMore
        p_offset: page * limit,
      }),
      fetchCategories()
    ]);

    if (itemsRes.error) throw itemsRes.error;

    let items = (itemsRes.data ?? []) as any[];
    const hasMore = items.length > limit;
    if (hasMore) items = items.slice(0, limit); // Remove the extra item

    const emojiMap = new Map(cats.map(c => [c.slug, c.emoji]));
    const emojiById = new Map(cats.map(c => [c.id, c.emoji]));

    // Client-side category filter (only needed for multi-category groups)
    if (categoryIds && categoryIds.length > 0) {
      items = items.filter((item: any) =>
        categoryIds.includes(item.category_id)
      );
    }

    const products = items.map((item: any) => {
      const price = Number(item.price);
      const originalPrice = Number(item.mrp || item.price);
      return {
        id: item.id ?? item.item_id,
        name: item.name,
        emoji: emojiMap.get(item.category) ?? emojiById.get(item.category_id) ?? '📦',
        price,
        originalPrice: originalPrice > price ? originalPrice : undefined,
        badge: originalPrice > price ? 'On Sale' : undefined,
        unit: 'pc',
        category: item.category as Category,
        stock: Number(item.stock ?? item.qty_on_hand ?? 0),
        description: item.description ?? '',
        image_url: item.image_url,
        created_at: item.created_at,
      };
    });

    return { products, hasMore };
  } catch (error) {
    console.error('Error in fetchProducts:', error);
    return { products: [], hasMore: false };
  }
}

/** Admin-web compatible deterministic emoji fallback from category name */
function getCategoryEmoji(name: string, dbEmoji?: string | null): string {
  if (dbEmoji && dbEmoji.trim() && dbEmoji !== '📦') return dbEmoji;
  const words = name.toLowerCase().trim().split(/\s+/);
  const iconMap: Record<string, string> = {
    fruit: '🍎', apple: '🍎', veg: '🥦', vegetable: '🥦', produce: '🥦',
    bakery: '🥐', bread: '🥐', cake: '🎂', baking: '🧁',
    dairy: '🥛', milk: '🥛', cheese: '🧀', egg: '🥚', eggs: '🥚',
    drink: '🥤', beverage: '🥤', juice: '🧃', water: '💧', beverages: '🥤',
    clean: '🧹', cleaning: '🧼', household: '🏠',
    pharma: '💊', medicine: '💊', health: '❤️', personal: '🧴', care: '🧴',
    pet: '🐶', animal: '🐱', pest: '🐀',
    toy: '🧸', game: '🎮', baby: '👶',
    snack: '🍿', chip: '🍪', biscuit: '🍪', cookies: '🍪', chocolates: '🍫', candies: '🍬', ice: '🍦', cream: '🍦',
    packaged: '🥡', food: '🍽️',
    rice: '🍚', grain: '🌾', flour: '🌾',
    oil: '🛢️', spice: '🌶️', masala: '🌶️', condiment: '🥫', cooking: '🍳',
    meat: '🍗', chicken: '🐔', fish: '🐟', beef: '🥩',
    frozen: '🧊',
    electronics: '🔌', mobile: '📱',
    tea: '☕', coffee: '☕', cereal: '🥣', breakfast: '🍳',
  };
  for (const word of words) {
    if (iconMap[word]) return iconMap[word];
  }
  return '📦';
}

export async function fetchCategories(): Promise<{ id: string; slug: Category; name: string; emoji: string }[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, slug, category, emoji')
      .eq('active', true)
      .order('display_order');

    if (error) throw error;

    return (data ?? []).map((c: any) => ({
      id: c.id,
      slug: (c.slug ?? c.category) as Category,
      name: c.category,
      emoji: getCategoryEmoji(c.category, c.emoji),
    }));
  } catch (error) {
    console.error('Error in fetchCategories:', error);
    return [];
  }
}


