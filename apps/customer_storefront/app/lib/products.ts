import { supabase } from './supabase';
import type { Product, Category } from './types';

const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

export async function fetchProducts(q?: string, categoryId?: string, categoryIds?: string[]): Promise<Product[]> {
  const { data, error } = await supabase.rpc('search_items_pos', {
    p_store_id: STORE_ID,
    p_query: q ?? '',
    p_category_id: categoryId ?? null,
    p_limit: 200,
    p_offset: 0,
  });

  if (error) throw error;

  let items = data ?? [];

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
      emoji: CATEGORY_EMOJIS[item.category as Category] ?? '📦',
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
    emoji: c.emoji ?? '📦',
  }));
}

const CATEGORY_EMOJIS: Record<string, string> = {
  dairy: '🥛',
  grocery: '🍚',
  beverages: '🧃',
  snacks: '🍪',
  household: '🧼',
  produce: '🥬',
  bakery: '🍞',
  frozen: '🧊',
  chips: '🥔',
  'biscuits-cookies': '🍘',
  'chocolates-candies': '🍫',
  'ice-cream': '🍦',
  'tea-coffee': '☕',
  cereals: '🥣',
  oil: '🫒',
  'rice-grain': '🌾',
  condiments: '🥫',
  spices: '🌶️',
  eggs: '🥚',
  'personal-care': '🧴',
  'cleaning-supply': '🧽',
  'air-freshener': '🌸',
  'baby-care': '🍼',
  electronics: '🔌',
  'baking-needs': '🧁',
};
