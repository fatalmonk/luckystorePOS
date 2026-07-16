'use client'; // cart count badge, bounce animation, and cart sheet trigger

import { useState, useEffect, useRef } from 'react';
import { ShoppingCart } from '@phosphor-icons/react';
import { useCartContext } from './CartProvider';
import { useCartSheet } from '../hooks/useCartSheet';
import { formatBdt } from '../lib/formatPrice';

export function HeaderCartButton() {
  const { totalItems, total, isLoaded } = useCartContext();
  const { open } = useCartSheet();
  const [bouncing, setBouncing] = useState(false);
  const prevCount = useRef(totalItems);

  useEffect(() => {
    if (isLoaded && totalItems > prevCount.current) {
      setBouncing(true);
      const t = setTimeout(() => setBouncing(false), 500);
      prevCount.current = totalItems;
      return () => clearTimeout(t);
    }
    prevCount.current = totalItems;
  }, [totalItems, isLoaded]);

  return (
    <button
      type="button"
      onClick={open}
      className="relative bg-warm-accent hover:bg-warm-accent-hover text-warm-fg font-extrabold text-xs px-3 py-2.5 rounded-full shadow-sm active:scale-95 transition-all flex items-center gap-2 min-h-[38px]"
      aria-label="Cart"
    >
      <ShoppingCart weight="bold" size={18} aria-hidden="true" />
      <span className="hidden sm:inline font-extrabold tracking-tight">{isLoaded ? formatBdt(total) : 'Cart'}</span>
      {isLoaded && totalItems > 0 && (
        <span
          className={`bg-warm-fg text-white text-[10px] font-mono px-1.5 py-0.5 rounded-full ${bouncing ? 'cart-bounce' : ''}`}
          aria-label={`${totalItems} items in cart`}
        >
          {totalItems}
        </span>
      )}
      {!isLoaded && (
        <span
          className="w-4 h-4 bg-warm-fg/10 rounded-full animate-pulse"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
