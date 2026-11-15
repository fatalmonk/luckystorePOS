import { createWishlistItem, deleteWishlistItem, fetchWishlistItems } from './wishlist';

const LOCAL_KEY = 'lucky_wishlist_ids';

export function getLocalWishlist(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LOCAL_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveLocalWishlist(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error('Failed to save local wishlist cache', e);
  }
}

export async function syncWishlistWithServer(): Promise<string[]> {
  try {
    const serverIds = await fetchWishlistItems();
    saveLocalWishlist(serverIds);
    return serverIds;
  } catch (e) {
    console.error('Failed to fetch wishlist from server', e);
    return getLocalWishlist();
  }
}

export async function toggleWishlistItemServer(
  productId: string,
  productName: string,
  isWishlisted: boolean
): Promise<void> {
  if (isWishlisted) {
    await createWishlistItem(productId, productName);
  } else {
    await deleteWishlistItem(productId);
  }
}
