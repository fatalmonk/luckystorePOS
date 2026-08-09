'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CartItem, Product } from '../lib/types';

const CART_KEY = 'lucky-cart';
const FREE_DELIVERY_THRESHOLD = 500;
const FREE_DELIVERY_FEE = 40;

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartRef = useRef<CartItem[]>([]);
  const [storageError, setStorageError] = useState(false);
  // Single hydration guard — replaces the previous dual isLoaded + mounted pattern
  const [hydrated, setHydrated] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    let savedCart: CartItem[] = [];
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) {
        savedCart = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load cart:', e);
      setStorageError(true);
    }
    const timer = setTimeout(() => {
      if (savedCart.length > 0) {
        cartRef.current = savedCart;
        setCart(savedCart);
      }
      setHydrated(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Save cart to localStorage when it changes (only after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart:', e);
      setStorageError(true);
    }
  }, [cart, hydrated]);

  const addToCart = useCallback((product: Product): boolean => {
    if (product.stock <= 0) return false;

    const existing = cartRef.current.find((item) => item.id === product.id);
    if (existing && existing.qty >= product.stock) return false;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      let nextCart: CartItem[];
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        nextCart = prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        nextCart = [...prev, { ...product, qty: 1 }];
      }
      cartRef.current = nextCart;
      return nextCart;
    });
    return true;
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart((prev) => {
      const nextCart = prev
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
      cartRef.current = nextCart;
      return nextCart;
    });
  }, []);

  const [lastRemoved, setLastRemoved] = useState<CartItem | null>(null);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => {
      const removed = prev.find((item) => item.id === productId);
      if (removed) setLastRemoved(removed);
      const nextCart = prev.filter((item) => item.id !== productId);
      cartRef.current = nextCart;
      return nextCart;
    });
  }, []);

  const undoRemove = useCallback(() => {
    setCart((prev) => {
      if (!lastRemoved) return prev;
      const existing = prev.find((item) => item.id === lastRemoved.id);
      let nextCart: CartItem[];
      if (existing) {
        nextCart = prev.map((item) =>
          item.id === lastRemoved.id ? { ...item, qty: item.qty + lastRemoved.qty } : item
        );
      } else {
        nextCart = [...prev, lastRemoved];
      }
      cartRef.current = nextCart;
      return nextCart;
    });
    setLastRemoved(null);
  }, [lastRemoved]);

  const clearCart = useCallback(() => {
    cartRef.current = [];
    setCart([]);
  }, []);

  // Before hydration, show empty cart to avoid SSR/client mismatch
  const safeCart = hydrated ? cart : [];
  const totalItems = hydrated ? cart.reduce((sum, item) => sum + item.qty, 0) : 0;
  const subtotal = hydrated ? cart.reduce((sum, item) => sum + item.price * item.qty, 0) : 0;
  const deliveryFee = subtotal === 0 ? 0 : subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : (hydrated ? FREE_DELIVERY_FEE : 0);
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
    storageError,
  };
}
