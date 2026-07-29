'use client';

import { ShoppingCart } from '@phosphor-icons/react';
import { useCartSheet } from '../hooks/useCartSheet';
import { formatBdt } from '../lib/formatPrice';
import { useCartContext } from './CartProvider';

export function HeaderCartButton() {
  const { totalItems, total, isLoaded } = useCartContext();
  const { open } = useCartSheet();

  return (
    <button
      type="button"
      onClick={open}
      className="relative flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full bg-warm-accent px-3 py-2.5 text-xs font-extrabold text-warm-accent-text shadow-sm transition-[background-color,box-shadow] hover:bg-warm-accent-hover hover:shadow-warm-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
      aria-label={`Cart ${isLoaded && totalItems > 0 ? `(${totalItems} items, ${formatBdt(total)})` : '(empty)'}`}
    >
      <ShoppingCart weight="bold" size={18} aria-hidden="true" />
      {isLoaded && totalItems > 0 && (
        <span className="font-extrabold tracking-tight">{formatBdt(total)}</span>
      )}
      {isLoaded && totalItems > 0 && (
        <span
          className="rounded-full bg-warm-fg px-1.5 py-0.5 font-mono text-xs text-white"
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
