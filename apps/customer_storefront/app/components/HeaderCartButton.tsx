'use client'; // cart count badge, bounce animation, and cart sheet trigger

import { useState, useEffect, useRef } from 'react';
import { useCartContext } from './CartProvider';
import { CartSheet } from './CartSheet';

export function HeaderCartButton() {
  const { totalItems } = useCartContext();
  const [mounted, setMounted] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const prevCount = useRef(totalItems);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && totalItems > prevCount.current) {
      setBouncing(true);
      const t = setTimeout(() => setBouncing(false), 500);
      prevCount.current = totalItems;
      return () => clearTimeout(t);
    }
    prevCount.current = totalItems;
  }, [totalItems, mounted]);

  return (
    <>
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="relative flex items-center justify-center min-h-[44px] min-w-[44px] gap-2 px-3 py-2 rounded-lg hover:bg-yellow-400 transition-colors"
        aria-label="Cart"
      >
        <span className="text-xl" aria-hidden="true">🛒</span>
        <span className="hidden lg:block text-sm font-medium">Cart</span>
        {mounted && totalItems > 0 && (
          <span
            className={`absolute -top-1 right-1 min-w-[20px] h-5 bg-[#1c1917] text-[#ffe302] text-xs font-bold rounded-full grid place-items-center px-1 ${bouncing ? 'cart-bounce' : ''}`}
            aria-label={`${totalItems} items in cart`}
          >
            {totalItems}
          </span>
        )}
      </button>
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
