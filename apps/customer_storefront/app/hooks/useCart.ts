'use client';

import { useState, useEffect, useCallback } from 'react';
import { CartItem, Product } from '../lib/types';

const CART_KEY = 'lucky-cart';

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) {
        setCart(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load cart:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save cart to localStorage when it changes
  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart:', e);
    }
  }, [cart, isLoaded]);

  const addToCart = useCallback((product: Product) => {
    if (product.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        // Check stock limit
        if (existing.qty >= product.stock) return prev;
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.qty + delta;
            return newQty <= 0 ? null : { ...item, qty: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const displayCart = mounted ? cart : [];
  const displayTotalItems = mounted ? cart.reduce((sum, item) => sum + item.qty, 0) : 0;
  const displaySubtotal = mounted ? cart.reduce((sum, item) => sum + item.price * item.qty, 0) : 0;
  const displayDeliveryFee = displaySubtotal >= 500 ? 0 : (mounted ? 40 : 0);
  const displayDiscount = displaySubtotal >= 500 ? 40 : 0;
  const displayTotal = displaySubtotal + displayDeliveryFee - displayDiscount;

  return {
    cart: displayCart,
    isLoaded,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    totalItems: displayTotalItems,
    subtotal: displaySubtotal,
    deliveryFee: displayDeliveryFee,
    discount: displayDiscount,
    total: displayTotal,
  };
}
