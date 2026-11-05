'use client';

import { useCallback, useState } from 'react';
import { useToast } from '../components/Toast';
import { useCartContext } from '../components/CartProvider';
import { usePathname } from 'next/navigation';
import { getDictionary } from '../lib/i18n/dictionaries';
import { getLocaleFromPathname } from '../lib/i18n/config';
import type { Product } from '../lib/types';

export function useProductCart(product: Product) {
  const { showToast } = useToast();
  const { cart, addToCart, updateQty } = useCartContext();
  const copy = getDictionary(getLocaleFromPathname(usePathname())).toast;
  const [announcement, setAnnouncement] = useState('');
  const quantity = cart.find((item) => item.id === product.id)?.qty || 0;
  const canAdd = !product.availabilityUnknown && product.stock > 0 && quantity < product.stock;

  const add = useCallback((button?: HTMLButtonElement | null) => {
    if (!canAdd) return;
    const added = addToCart(product);
    if (!added) return;

    setAnnouncement(copy.addedToCart.replace('{name}', product.name));
    showToast(copy.addedToCart.replace('{name}', product.name), undefined, undefined, true);

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
  }, [addToCart, canAdd, copy.addedToCart, product, showToast]);

  const increment = useCallback(() => {
    if (!canAdd) return;
    updateQty(product.id, 1);
    setAnnouncement(copy.addedAnotherToCart.replace('{name}', product.name));
  }, [canAdd, copy.addedAnotherToCart, product.id, product.name, updateQty]);

  const decrement = useCallback(() => {
    if (quantity <= 0) return;
    updateQty(product.id, -1);
    setAnnouncement(copy.removedOneFromCart.replace('{name}', product.name));
  }, [copy.removedOneFromCart, product.id, product.name, quantity, updateQty]);

  return {
    quantity,
    canAdd,
    add,
    increment,
    decrement,
    announcement,
  };
}
