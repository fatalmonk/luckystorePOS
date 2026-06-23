'use client';

import { useState, useEffect, useCallback } from 'react';
import { CartItem, Product } from '../lib/types';

const CART_KEY = 'lucky-cart';
const FREE_DELIVERY_THRESHOLD = 500;
const FREE_DELIVERY_FEE = 40;

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  // Single hydration guard — replaces the previous dual isLoaded + mounted pattern
  const [hydrated, setHydrated] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) {
        setCart(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load cart:', e);
    }
    setHydrated(true);
  }, []);

  // Save cart to localStorage when it changes (only after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart:', e);
    }
  }, [cart, hydrated]);

  const addToCart = useCallback((product: Product): boolean => {
    if (product.stock <= 0) return false;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev; // at max, no-op but signal success
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
    return true;
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.qty + delta;
            if (newQty <= 0) return null;
            // Clamp to available stock — item carries stock from original Product
            const clampedQty = Math.min(newQty, item.stock);
            return { ...item, qty: clampedQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  }, []);

  const [lastRemoved, setLastRemoved] = useState<CartItem | null>(null);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => {
      const removed = prev.find((item) => item.id === productId);
      if (removed) setLastRemoved(removed);
      return prev.filter((item) => item.id !== productId);
    });
  }, []);

  const undoRemove = useCallback(() => {
    setCart((prev) => {
      if (!lastRemoved) return prev;
      const existing = prev.find((item) => item.id === lastRemoved.id);
      if (existing) {
        return prev.map((item) =>
          item.id === lastRemoved.id ? { ...item, qty: item.qty + lastRemoved.qty } : item
        );
      }
      return [...prev, lastRemoved];
    });
    setLastRemoved(null);
  }, [lastRemoved]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Before hydration, show empty cart to avoid SSR/client mismatch
  const safeCart = hydrated ? cart : [];
  const totalItems = hydrated ? cart.reduce((sum, item) => sum + item.qty, 0) : 0;
  const subtotal = hydrated ? cart.reduce((sum, item) => sum + item.price * item.qty, 0) : 0;
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : (hydrated ? FREE_DELIVERY_FEE : 0);
  const discount = subtotal >= FREE_DELIVERY_THRESHOLD ? FREE_DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee - discount;

  return {
    cart: safeCart,
    isLoaded: hydrated,
    addToCart,
    updateQty,
    removeFromCart,
    undoRemove,
    clearCart,
    totalItems,
    subtotal,
    deliveryFee,
    discount,
    total,
  };
}
