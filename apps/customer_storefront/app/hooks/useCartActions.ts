'use client'; // reusable cart callbacks + fly-animation trigger

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../components/Toast';
import { useCartContext } from '../components/CartProvider';
import type { Product } from '../lib/types';

interface FlyItem {
  id: string;
  emoji: string;
  startX: number;
  startY: number;
}

export function useCartActions() {
  const router = useRouter();
  const { showToast } = useToast();
  const { cart, addToCart, updateQty } = useCartContext();
  const [flyItems, setFlyItems] = useState<FlyItem[]>([]);

  const handleAddToCart = useCallback((product: Product, buttonEl?: HTMLButtonElement | null) => {
    addToCart(product);
    showToast(`Added ${product.name}`);
    if (buttonEl) {
      const rect = buttonEl.getBoundingClientRect();
      setFlyItems((prev) => [
        ...prev,
        {
          id: `${product.id}-${Date.now()}`,
          emoji: product.emoji,
          startX: rect.left + rect.width / 2,
          startY: rect.top + rect.height / 2,
        },
      ]);
    }
  }, [addToCart, showToast]);

  const handleFlyComplete = useCallback((id: string) => {
    setFlyItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleClick = useCallback((id: string) => {
    router.push(`/product/${id}`);
  }, [router]);

  const handleUpdateQty = useCallback((id: string, delta: number) => {
    updateQty(id, delta);
  }, [updateQty]);

  return {
    cart,
    flyItems,
    handleAddToCart,
    handleUpdateQty,
    handleFlyComplete,
    handleClick,
  };
}
