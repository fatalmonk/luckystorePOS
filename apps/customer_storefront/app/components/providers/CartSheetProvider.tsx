'use client'; // global cart sheet dialog controller

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CartSheet } from '../CartSheet';

interface CartSheetContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const CartSheetContext = createContext<CartSheetContextValue | undefined>(undefined);

export function CartSheetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <CartSheetContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
      <CartSheet open={isOpen} onClose={close} />
    </CartSheetContext.Provider>
  );
}

export function useCartSheet() {
  const context = useContext(CartSheetContext);
  if (!context) {
    throw new Error('useCartSheet must be used within CartSheetProvider');
  }
  return context;
}
