'use client'; // floating cart summary pill + cart sheet

import { useCartContext } from './CartProvider';
import { useCartSheet } from '../hooks/useCartSheet';
import { formatBdt } from '../lib/formatPrice';

export function BottomNavCartPill() {
  const { totalItems, total, isLoaded } = useCartContext();
  const { open } = useCartSheet();

  // During hydration, show a skeleton pill to prevent flash of null
  if (!isLoaded) {
    return (
      <div
        className="fixed bottom-[76px] left-1/2 -translate-x-1/2 z-40
          glass border rounded-full px-5 py-2.5
          flex items-center gap-3
          animate-pulse"
        aria-hidden="true"
      >
        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
        <div className="w-px h-4 bg-warm-border-light" />
        <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (totalItems === 0) return null;

  return (
    <button
      type="button"
      onClick={open}
      className="fixed bottom-[76px] left-1/2 -translate-x-1/2 z-40
        glass border rounded-full px-5 py-2.5
        flex items-center gap-3
        shadow-lg hover:shadow-xl
        transition-all duration-300 ease-out
        animate-[fadeUp_0.3s_ease]
        press-feedback"
      aria-label="View cart summary"
    >
      <span className="text-sm font-bold text-warm-fg">
        {totalItems} {totalItems === 1 ? 'item' : 'items'}
      </span>
      <span className="w-px h-4 bg-warm-border-light" />
      <span className="text-sm font-extrabold text-warm-fg">{formatBdt(total)}</span>
    </button>
  );
}
