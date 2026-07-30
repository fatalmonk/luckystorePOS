'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CartSheet } from '../CartSheet';

interface CartSheetContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const CartSheetContext = createContext<CartSheetContextType | undefined>(undefined);

export function CartSheetProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

  return (
    <CartSheetContext.Provider value={value}>
      {children}
      <CartSheet open={isOpen} onClose={close} />
    </CartSheetContext.Provider>
  );
}

export function useCartSheet() {
  const context = useContext(CartSheetContext);
  if (context === undefined) {
    throw new Error('useCartSheet must be used within a CartSheetProvider');
  }
  return context;
}
