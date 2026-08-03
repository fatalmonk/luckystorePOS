'use client';

import React from 'react';
import { ShoppingCartSimple } from '@phosphor-icons/react';
import { useCartSheet } from '../hooks/useCartSheet';
import { formatBdt } from '../lib/formatPrice';
import { useCartContext } from './CartProvider';

interface HeaderCartButtonProps {
  compact?: boolean;
  iconSize?: number;
}

export function HeaderCartButton({ compact = false, iconSize = 22 }: HeaderCartButtonProps) {
  const { totalItems, total, isLoaded } = useCartContext();
  const { open } = useCartSheet();

  return (
    <button
      type="button"
      onClick={open}
      className={`relative flex items-center justify-center rounded-full bg-warm-accent text-warm-accent-text shadow-sm transition-[background-color,box-shadow] hover:bg-warm-accent-hover hover:shadow-warm-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent ${
        compact
          ? 'min-h-11 min-w-11'
          : `${
              isLoaded && totalItems > 0
                ? 'min-h-9 gap-1.5 px-2.5 text-xs font-extrabold'
                : 'h-9 w-9'
            } md:min-h-11 md:min-w-11 md:px-3 md:py-2.5`
      }`}
      aria-label={`Cart ${isLoaded && totalItems > 0 ? `(${totalItems} items, ${formatBdt(total)})` : '(empty)'}`}
    >
      <ShoppingCartSimple weight="bold" size={iconSize} aria-hidden="true" />
      {!compact && isLoaded && totalItems > 0 && (
        <span className="font-extrabold tracking-tight">{formatBdt(total)}</span>
      )}
      {!compact && !isLoaded && (
        <span
          className="w-4 h-4 bg-warm-fg/10 rounded-full animate-pulse"
          aria-hidden="true"
        />
      )}
      {compact && isLoaded && totalItems > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warm-fg px-1 text-[10px] font-bold text-warm-surface">
          {totalItems}
        </span>
      )}
    </button>
  );
}
