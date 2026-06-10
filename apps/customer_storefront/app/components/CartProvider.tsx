'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useCart } from '../hooks/useCart';

const CartContext = createContext<ReturnType<typeof useCart> | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const cart = useCart();
  return <CartContext.Provider value={cart}>{children}</CartContext.Provider>;
}

export function useCartContext() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCartContext must be used within CartProvider');
  }
  return context;
}
