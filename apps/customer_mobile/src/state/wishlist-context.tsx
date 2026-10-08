import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { CatalogProduct } from '../services/catalog';
import { getItem, setItem, WISHLIST_ITEMS_KEY } from '../services/storage';

export interface WishlistContextState {
  wishlist: CatalogProduct[];
  wishlistIds: Set<string>;
  toggleWishlist: (product: CatalogProduct) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextState | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<CatalogProduct[]>([]);
  const isHydratedRef = useRef(false);
  const hasUserMutatedRef = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await getItem(WISHLIST_ITEMS_KEY);
        if (active && raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setWishlist((current) => {
              if (!hasUserMutatedRef.current) {
                return parsed;
              }
              const map = new Map<string, CatalogProduct>();
              for (const item of parsed) {
                map.set(item.id, item);
              }
              for (const item of current) {
                map.set(item.id, item);
              }
              return Array.from(map.values());
            });
          }
        }
      } catch {
        // Fallback
      } finally {
        if (active) {
          isHydratedRef.current = true;
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    void setItem(WISHLIST_ITEMS_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  const wishlistIds = useMemo(() => new Set(wishlist.map((i) => i.id)), [wishlist]);

  const toggleWishlist = useCallback((product: CatalogProduct) => {
    hasUserMutatedRef.current = true;
    setWishlist((current) => {
      const exists = current.some((i) => i.id === product.id);
      if (exists) {
        return current.filter((i) => i.id !== product.id);
      }
      return [...current, product];
    });
  }, []);

  const isInWishlist = useCallback(
    (productId: string) => wishlistIds.has(productId),
    [wishlistIds]
  );

  const clearWishlist = useCallback(() => {
    hasUserMutatedRef.current = true;
    setWishlist([]);
  }, []);

  const value = useMemo(
    () => ({
      wishlist,
      wishlistIds,
      toggleWishlist,
      isInWishlist,
      clearWishlist,
    }),
    [wishlist, wishlistIds, toggleWishlist, isInWishlist, clearWishlist]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
}
