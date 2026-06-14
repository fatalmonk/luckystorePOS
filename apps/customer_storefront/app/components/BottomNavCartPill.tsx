'use client'; // floating cart summary pill + cart sheet

import { useState } from 'react';
import { useCartContext } from './CartProvider';
import { CartSheet } from './CartSheet';
import { formatBdt } from '../lib/formatPrice';

export function BottomNavCartPill() {
  const { totalItems, total } = useCartContext();
  const [cartOpen, setCartOpen] = useState(false);

  if (totalItems === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="fixed bottom-[76px] left-1/2 -translate-x-1/2 z-40
          glass border rounded-full px-5 py-2.5
          flex items-center gap-3
          shadow-lg hover:shadow-xl
          transition-all duration-300 ease-out
          animate-[fadeUp_0.3s_ease]
          press-feedback"
        aria-label="View cart summary"
      >
        <span className="text-sm font-bold text-[#1c1917]">
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </span>
        <span className="w-px h-4 bg-[#e7e5e4]" />
        <span className="text-sm font-extrabold text-[#FFF34D]">{formatBdt(total)}</span>
      </button>
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
