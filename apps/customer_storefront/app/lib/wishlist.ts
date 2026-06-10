import { supabase } from './supabase';

export interface WishlistItem {
  id: string;
  product_id: string;
  customer_fingerprint: string;
  customer_phone?: string;
  product_name: string;
  created_at: string;
}

export async function createWishlistItem(
  productId: string,
  fingerprint: string,
  productName: string,
  phone?: string
): Promise<WishlistItem> {
  if (!productId) throw new Error('productId required');
  if (!fingerprint) throw new Error('fingerprint required');

  const { data, error } = await supabase
    .from('wishlist')
    .insert({ product_id: productId, customer_fingerprint: fingerprint, product_name: productName, customer_phone: phone })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Already on wishlist');
    throw error;
  }
  return data as WishlistItem;
}
