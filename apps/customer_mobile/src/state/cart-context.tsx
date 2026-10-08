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

import { CART_ITEMS_KEY, getSecureItem, setSecureItem } from '../services/storage';
import { calculateCartTotals, FREE_DELIVERY_THRESHOLD } from './cart-calc';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  unit: string;
  qty: number;
  imageUrl?: string;
  emoji?: string;
  stock?: number;
}

export interface CartContextState {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  freeDeliveryThreshold: number;
  amountToFreeDelivery: number;
  add: (productId: string, itemDetails?: Partial<CartItem>, quantity?: number) => void;
  updateQty: (productId: string, delta: number) => void;
  removeItem: (productId: string) => void;
  syncPrices: (updatedItems: { id: string; price: number; name?: string }[]) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextState | null>(null);

export {
  calculateCartTotals,
  FREE_DELIVERY_THRESHOLD,
  STANDARD_DELIVERY_FEE,
} from './cart-calc';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const isHydratedRef = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await getSecureItem(CART_ITEMS_KEY);
        if (active && raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setItems(parsed);
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
    void setSecureItem(CART_ITEMS_KEY, JSON.stringify(items));
  }, [items]);

  const add = useCallback((productId: string, itemDetails?: Partial<CartItem>, quantity = 1) => {
    setItems((current) => {
      const existingIndex = current.findIndex((item) => item.id === productId);
      const availableStock = typeof itemDetails?.stock === 'number' ? itemDetails.stock : 99;

      if (availableStock <= 0) {
        return current;
      }

      if (existingIndex > -1) {
        const next = [...current];
        const existing = next[existingIndex];
        const maxStock = typeof itemDetails?.stock === 'number'
          ? itemDetails.stock
          : (typeof existing.stock === 'number' && existing.stock > 0 ? existing.stock : availableStock);
        if (maxStock <= 0) {
          return current;
        }
        const newQty = Math.min(maxStock, existing.qty + quantity);
        next[existingIndex] = { ...existing, qty: newQty, stock: maxStock };
        return next;
      }

      const initialQty = Math.min(availableStock, Math.max(1, quantity));
      if (initialQty <= 0) {
        return current;
      }

      const newItem: CartItem = {
        id: productId,
        name: itemDetails?.name || 'Product',
        price: itemDetails?.price || 0,
        originalPrice: itemDetails?.originalPrice,
        unit: itemDetails?.unit || 'pc',
        qty: initialQty,
        imageUrl: itemDetails?.imageUrl,
        emoji: itemDetails?.emoji || '🛒',
        stock: availableStock,
      };
      return [...current, newItem];
    });
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setItems((current) => {
      return current
        .map((item) => {
          if (item.id !== productId) return item;
          if (typeof item.stock === 'number' && item.stock <= 0) return null;
          const newQty = item.qty + delta;
          if (newQty <= 0) return null;
          const maxStock = typeof item.stock === 'number' && item.stock > 0 ? item.stock : 99;
          return { ...item, qty: Math.min(maxStock, newQty) };
        })
        .filter((item): item is CartItem => item !== null);
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.id !== productId));
  }, []);

  const syncPrices = useCallback((updatedItems: { id: string; price: number; name?: string }[]) => {
    const priceMap = new Map(updatedItems.map((i) => [i.id, i]));
    setItems((current) =>
      current.map((item) => {
        const match = priceMap.get(item.id);
        if (!match) return item;
        return {
          ...item,
          price: match.price,
          name: match.name || item.name,
        };
      })
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const { totalItems, subtotal, deliveryFee, total, amountToFreeDelivery } = useMemo(
    () => calculateCartTotals(items),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      totalItems,
      subtotal,
      deliveryFee,
      total,
      freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
      amountToFreeDelivery,
      add,
      updateQty,
      removeItem,
      syncPrices,
      clearCart,
    }),
    [
      items,
      totalItems,
      subtotal,
      deliveryFee,
      total,
      amountToFreeDelivery,
      add,
      updateQty,
      removeItem,
      syncPrices,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used within CartProvider');
  return value;
}
