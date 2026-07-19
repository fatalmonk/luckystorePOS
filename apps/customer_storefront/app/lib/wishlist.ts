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

  const res = await fetch('/api/wishlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, fingerprint, productName, phone }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || `Wishlist save failed (${res.status})`);
  }
  return body.item as WishlistItem;
}

export async function deleteWishlistItem(
  productId: string,
  fingerprint: string
): Promise<void> {
  if (!productId) throw new Error('productId required');
  if (!fingerprint) throw new Error('fingerprint required');

  const res = await fetch(`/api/wishlist?productId=${encodeURIComponent(productId)}&fingerprint=${encodeURIComponent(fingerprint)}`, {
    method: 'DELETE',
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || `Wishlist delete failed (${res.status})`);
  }
}

export async function fetchWishlistItems(
  fingerprint: string
): Promise<string[]> {
  if (!fingerprint) return [];

  const res = await fetch(`/api/wishlist?fingerprint=${encodeURIComponent(fingerprint)}`);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || `Wishlist fetch failed (${res.status})`);
  }
  return (body.productIds ?? []) as string[];
}
