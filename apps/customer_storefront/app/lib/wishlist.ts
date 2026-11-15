export interface WishlistItem {
  id: string;
  product_id: string;
  customer_phone?: string;
  product_name: string;
  created_at: string;
}

const WISHLIST_OWNER_LOCK = 'lucky-store-wishlist-owner';
let pendingOwnerOperation: Promise<unknown> = Promise.resolve();

async function withOwnerLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return await navigator.locks.request(WISHLIST_OWNER_LOCK, operation);
  }

  const queued = pendingOwnerOperation.then(operation, operation);
  pendingOwnerOperation = queued.then(() => undefined, () => undefined);
  return queued;
}

async function requestWishlistItems(): Promise<string[]> {
  const res = await fetch('/api/wishlist?initialize=1');
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || `Wishlist fetch failed (${res.status})`);
  }
  return (body.productIds ?? []) as string[];
}

export async function createWishlistItem(
  productId: string,
  productName: string,
  phone?: string
): Promise<WishlistItem> {
  if (!productId) throw new Error('productId required');
  if (!productName) throw new Error('productName required');

  return withOwnerLock(async () => {
    await requestWishlistItems();
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, productName, phone }),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || `Wishlist save failed (${res.status})`);
    }
    return body.item as WishlistItem;
  });
}

export async function deleteWishlistItem(
  productId: string
): Promise<void> {
  if (!productId) throw new Error('productId required');

  return withOwnerLock(async () => {
    await requestWishlistItems();
    const res = await fetch(`/api/wishlist?productId=${encodeURIComponent(productId)}`, {
      method: 'DELETE',
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || `Wishlist delete failed (${res.status})`);
    }
  });
}

export async function fetchWishlistItems(): Promise<string[]> {
  return withOwnerLock(requestWishlistItems);
}
