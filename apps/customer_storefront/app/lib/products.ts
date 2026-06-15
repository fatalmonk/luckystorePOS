import { supabase } from './supabase';
import type { Product, Category } from './types';

const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

export async function fetchProducts(q?: string, categoryId?: string, categoryIds?: string[]): Promise<Product[]> {
  const [itemsRes, cats] = await Promise.all([
    supabase.rpc('search_items_pos', {
      p_store_id: STORE_ID,
      p_query: q ?? '',
      p_category_id: categoryId ?? null,
      p_limit: 200,
      p_offset: 0,
    }),
    fetchCategories()
  ]);

  if (itemsRes.error) throw itemsRes.error;

  let items = itemsRes.data ?? [];
  const emojiMap = new Map(cats.map(c => [c.slug, c.emoji]));
  const emojiById = new Map(cats.map(c => [c.id, c.emoji]));

  // Client-side category filter
  if (categoryId) {
    items = items.filter((item: any) => item.category_id === categoryId || item.category === categoryId);
  }

  // Multi-category filter (for group pages)
  if (categoryIds && categoryIds.length > 0) {
    items = items.filter((item: any) =>
      categoryIds.includes(item.category_id) || categoryIds.includes(item.category)
    );
  }

  return items.map((item: any) => {
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
    };
  });
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
}


