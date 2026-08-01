'use client';

import React from 'react';
import { ShoppingCartSimple } from '@phosphor-icons/react';
import { useCartSheet } from '../hooks/useCartSheet';
import { formatBdt } from '../lib/formatPrice';
import { useCartContext } from './CartProvider';

interface HeaderCartButtonProps {
  compact?: boolean;
}

export function HeaderCartButton({ compact = false }: HeaderCartButtonProps) {
  const { totalItems, total, isLoaded } = useCartContext();
  const { open } = useCartSheet();

  return (
    <button
      type="button"
      onClick={open}
      className={`relative flex items-center justify-center rounded-full bg-warm-accent text-warm-accent-text shadow-sm transition-[background-color,box-shadow] hover:bg-warm-accent-hover hover:shadow-warm-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent ${
        compact
          ? 'min-h-11 min-w-11'
          : 'min-h-11 min-w-11 gap-1.5 px-3 py-2.5 text-xs font-extrabold'
      }`}
      aria-label={`Cart ${isLoaded && totalItems > 0 ? `(${totalItems} items, ${formatBdt(total)})` : '(empty)'}`}
    >
      <ShoppingCartSimple weight="bold" size={22} aria-hidden="true" />
      {!compact && isLoaded && totalItems > 0 && (
        <span className="font-extrabold tracking-tight">{formatBdt(total)}</span>
      )}
      {!compact && isLoaded && totalItems > 0 && (
        <span
          className="rounded-full bg-warm-fg px-1.5 py-0.5 font-mono text-xs text-white"
          aria-label={`${totalItems} items in cart`}
        >
          {totalItems}
        </span>
      )}
      {!compact && !isLoaded && (
        <span
          className="w-4 h-4 bg-warm-fg/10 rounded-full animate-pulse"
          aria-hidden="true"
        />
      )}
      {compact && isLoaded && totalItems > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warm-fg px-1 text-[10px] font-bold text-white">
          {totalItems}
        </span>
      )}
    </button>
  );
}
