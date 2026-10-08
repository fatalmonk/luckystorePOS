import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  unit: string;
  qty: number;
  imageUrl?: string;
  emoji?: string;
  stock: number;
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

export const FREE_DELIVERY_THRESHOLD = 500;
export const STANDARD_DELIVERY_FEE = 40;

export function calculateCartTotals(items: { price: number; qty: number }[]) {
  const totalItems = items.reduce((acc, item) => acc + item.qty, 0);
  const subtotal = items.reduce((acc, item) => acc + item.price * item.qty, 0);
  const deliveryFee = items.length === 0 ? 0 : subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
  const total = items.length === 0 ? 0 : subtotal + deliveryFee;
  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  return { totalItems, subtotal, deliveryFee, total, amountToFreeDelivery };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const add = useCallback((productId: string, itemDetails?: Partial<CartItem>, quantity = 1) => {
    setItems((current) => {
      const existingIndex = current.findIndex((item) => item.id === productId);
      if (itemDetails && typeof itemDetails.stock === 'number' && itemDetails.stock <= 0) {
        return current;
      }

      if (existingIndex > -1) {
        const next = [...current];
        const existing = next[existingIndex];
        const maxStock = existing.stock > 0 ? existing.stock : (itemDetails?.stock ?? 99);
        const newQty = Math.min(maxStock, existing.qty + quantity);
        next[existingIndex] = { ...existing, qty: newQty };
        return next;
      }

      const newItem: CartItem = {
        id: productId,
        name: itemDetails?.name || 'Product',
        price: itemDetails?.price || 0,
        originalPrice: itemDetails?.originalPrice,
        unit: itemDetails?.unit || 'pc',
        qty: Math.max(1, quantity),
        imageUrl: itemDetails?.imageUrl,
        emoji: itemDetails?.emoji || '🛒',
        stock: itemDetails?.stock ?? 99,
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
