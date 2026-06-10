import { supabase } from './supabase';
import type { Product, Category } from './types';

const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

export async function fetchProducts(q?: string, categoryId?: string): Promise<Product[]> {
  const { data, error } = await supabase.rpc('search_items_pos', {
    p_store_id: STORE_ID,
    p_query: q ?? '',
    p_category_id: categoryId ?? null,
    p_limit: 100,
    p_offset: 0,
  });

  if (error) throw error;

  let items = data ?? [];

  // Client-side category filter (search_items_pos returns all items for store)
  if (categoryId) {
    items = items.filter((item: any) => item.category_id === categoryId || item.category === categoryId);
  }

  return items.map((item: any) => ({
    id: item.id ?? item.item_id,
    name: item.name,
    emoji: CATEGORY_EMOJIS[item.category as Category] ?? '📦',
    price: Number(item.price),
    unit: 'pc',
    category: item.category as Category,
    stock: Number(item.stock ?? item.qty_on_hand ?? 0),
    description: item.description ?? '',
    image_url: item.image_url,
  }));
}

export async function fetchCategories(): Promise<{ id: string; slug: Category; name: string; emoji: string }[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, category, emoji')
    .eq('store_id', STORE_ID)
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
};
