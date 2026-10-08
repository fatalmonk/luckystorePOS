import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { CatalogProduct } from '../services/catalog';

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

  const wishlistIds = useMemo(() => new Set(wishlist.map((i) => i.id)), [wishlist]);

  const toggleWishlist = useCallback((product: CatalogProduct) => {
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
