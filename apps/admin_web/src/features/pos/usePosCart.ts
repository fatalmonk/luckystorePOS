import { useState, useCallback, useMemo } from 'react';
import type { CartItem, PosProduct } from '../../lib/api/types';

interface UsePosCartReturn {
  cart: CartItem[];
  itemCount: number;
  subtotal: number;
  discountType: 'amount' | 'percentage';
  discountValue: string;
  cartDiscount: number;
  totalAmount: number;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  addToCart: (product: PosProduct, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  setDiscountType: (type: 'amount' | 'percentage') => void;
  setDiscountValue: (value: string) => void;
  onError: (msg: string) => void;
}

export function usePosCart(onError: (msg: string) => void): UsePosCartReturn {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [discountValue, setDiscountValue] = useState<string>('');

  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);

  const cartDiscount = useMemo(() => {
    const val = parseFloat(discountValue) || 0;
    if (discountType === 'percentage') {
      return (subtotal * val) / 100;
    }
    return val;
  }, [discountValue, discountType, subtotal]);

  const totalAmount = Math.max(0, subtotal - cartDiscount);
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const addToCart = useCallback((product: PosProduct, qty: number = 1) => {
    if (product.stock <= 0) {
      onError(`${product.name} is out of stock`);
      return;
    }

    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.product.id === product.id);
      const currentQty = existingIndex >= 0 ? prev[existingIndex].qty : 0;
      const newQty = currentQty + qty;

      if (newQty > product.stock) {
        onError(`Only ${product.stock} available for ${product.name}`);
        return prev;
      }

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: newQty,
          lineTotal: newQty * updated[existingIndex].unitPrice,
        };
        return updated;
      }

      return [...prev, {
        product,
        qty,
        unitPrice: product.price,
        lineTotal: qty * product.price,
      }];
    });
  }, [onError]);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prev => {
      const item = prev.find(i => i.product.id === productId);
      if (!item) return prev;

      if (qty > item.product.stock) {
        onError(`Only ${item.product.stock} available for ${item.product.name}`);
        return prev;
      }

      return prev.map(cartItem =>
        cartItem.product.id === productId
          ? { ...cartItem, qty, lineTotal: qty * cartItem.unitPrice }
          : cartItem
      );
    });
  }, [removeFromCart, onError]);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscountValue('');
    setDiscountType('amount');
  }, []);

  return {
    cart,
    itemCount,
    subtotal,
    discountType,
    discountValue,
    cartDiscount,
    totalAmount,
    setCart,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    setDiscountType,
    setDiscountValue,
    onError,
  };
}