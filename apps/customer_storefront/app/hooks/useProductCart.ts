'use client';

import { useCallback, useState } from 'react';
import { useToast } from '../components/Toast';
import { useCartContext } from '../components/CartProvider';
import type { Product } from '../lib/types';

export function useProductCart(product: Product) {
  const { showToast } = useToast();
  const { cart, addToCart, updateQty } = useCartContext();
  const [announcement, setAnnouncement] = useState('');
  const quantity = cart.find((item) => item.id === product.id)?.qty || 0;
  const canAdd = product.stock > 0 && quantity < product.stock;

  const add = useCallback((button?: HTMLButtonElement | null) => {
    if (!canAdd) return;
    const added = addToCart(product);
    if (!added) return;

    setAnnouncement(`${product.name} added to cart`);
    showToast(`Added ${product.name}`);

    if (button) {
      const rect = button.getBoundingClientRect();
      window.dispatchEvent(new CustomEvent('lucky-store:cart-fly', {
        detail: {
          id: `${product.id}-${Date.now()}`,
          startX: rect.left + rect.width / 2,
          startY: rect.top + rect.height / 2,
        },
      }));
    }
  }, [addToCart, canAdd, product, showToast]);

  const increment = useCallback(() => {
    if (!canAdd) return;
    updateQty(product.id, 1);
    setAnnouncement(`Added another ${product.name} to cart`);
  }, [canAdd, product.id, product.name, updateQty]);

  const decrement = useCallback(() => {
    if (quantity <= 0) return;
    updateQty(product.id, -1);
    setAnnouncement(`Removed one ${product.name} from cart`);
  }, [product.id, product.name, quantity, updateQty]);

  return {
    quantity,
    canAdd,
    add,
    increment,
    decrement,
    announcement,
  };
}
