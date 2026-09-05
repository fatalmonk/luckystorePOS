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

export function HeaderCartButton({ compact = false, iconSize }: HeaderCartButtonProps) {
  const { totalItems, total, isLoaded } = useCartContext();
  const { open } = useCartSheet();

  const iconPx = iconSize ?? 20;
  const hasItems = isLoaded && totalItems > 0;

  return (
    <button
      type="button"
      onClick={open}
      className={`relative flex items-center justify-center rounded-full transition-[background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent ${hasItems ? 'text-warm-accent-text' : 'text-warm-fg'} ${
        compact
          ? `min-h-11 min-w-11 before:absolute before:h-10 before:w-10 before:rounded-full before:transition-[background-color,box-shadow] ${hasItems ? 'before:bg-warm-accent hover:before:bg-warm-accent-hover' : 'before:border before:border-warm-border before:bg-warm-surface hover:before:bg-warm-image-well'}`
          : `${
              isLoaded && totalItems > 0
                ? 'h-11 gap-1.5 bg-warm-accent px-3 text-xs font-extrabold shadow-sm hover:bg-warm-accent-hover hover:shadow-warm-md'
                : 'h-11 w-11 border border-warm-border bg-warm-surface hover:bg-warm-image-well'
            }`
      }`}
      aria-label={`Cart ${isLoaded && totalItems > 0 ? `(${totalItems} items, ${formatBdt(total)})` : '(empty)'}`}
    >
      <ShoppingCartSimple className={compact ? 'relative z-10' : undefined} weight="bold" size={iconPx} aria-hidden="true" />
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
