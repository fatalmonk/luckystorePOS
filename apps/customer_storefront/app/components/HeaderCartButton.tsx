'use client'; // cart count badge, bounce animation, and cart sheet trigger

import { useState, useEffect, useRef } from 'react';
import { useCartContext } from './CartProvider';
import { CartSheet } from './CartSheet';

export function HeaderCartButton() {
  const { totalItems, isLoaded } = useCartContext();
  const [bouncing, setBouncing] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
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
    <>
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="relative flex items-center justify-center min-h-[44px] min-w-[44px] gap-2 px-2.5 py-2 rounded-xl hover:bg-warm-border-light transition-colors"
        aria-label="Cart"
      >
        <span className="text-lg" aria-hidden="true">🛒</span>
        <span className="hidden lg:block text-sm font-medium">Cart</span>
        {isLoaded && totalItems > 0 && (
          <span
            className={`absolute -top-0.5 right-1 min-w-[18px] h-[18px] bg-warm-danger text-white text-[10px] font-bold rounded-full grid place-items-center px-1 ${bouncing ? 'cart-bounce' : ''}`}
            aria-label={`${totalItems} items in cart`}
          >
            {totalItems}
          </span>
        )}
        {!isLoaded && (
          <span
            className="absolute -top-0.5 right-1 min-w-[18px] h-[18px] bg-gray-200 rounded-full animate-pulse"
            aria-hidden="true"
          />
        )}
      </button>
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
