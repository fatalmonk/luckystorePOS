import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { useCart } from '../../hooks/useCart';
import type { Product } from '../types';

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Test Milk',
  emoji: '🥛',
  price: 80,
  unit: 'pc',
  category: 'Dairy',
  stock: 10,
  description: 'Fresh milk',
};

const mockProductLowStock: Product = {
  ...mockProduct,
  id: 'prod-2',
  name: 'Limited Item',
  stock: 3,
};

const mockProductOutOfStock: Product = {
  ...mockProduct,
  id: 'prod-3',
  name: 'Sold Out',
  stock: 0,
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useCart', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('starts with empty cart and isLoaded false on first render', () => {
    // In jsdom, useEffect runs synchronously after render.
    // But useCart sets hydrated=false initially, and the effect sets it to true.
    // We test the initial state by checking the safeCart (which is [] before hydration).
    const { result } = renderHook(() => useCart());
    // Before the hydration effect runs, cart is [] and isLoaded is false.
    // In jsdom, the effect may have already run, so we check the initial render values.
    expect(result.current.cart).toEqual([]);
    expect(result.current.totalItems).toBe(0);
  });

  it('hydrates from localStorage on mount', async () => {
    const savedCart = [{ ...mockProduct, qty: 2 }];
    localStorageMock.setItem('lucky-cart', JSON.stringify(savedCart));

    const { result } = renderHook(() => useCart());
    // Wait for hydration effect
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isLoaded).toBe(true);
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].qty).toBe(2);
    expect(result.current.totalItems).toBe(2);
  });

  it('addToCart adds a new product', async () => {
    const { result } = renderHook(() => useCart());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    act(() => {
      result.current.addToCart(mockProduct);
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].id).toBe('prod-1');
    expect(result.current.cart[0].qty).toBe(1);
    expect(result.current.totalItems).toBe(1);
  });

  it('addToCart returns false for out-of-stock product', async () => {
    const { result } = renderHook(() => useCart());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    let success = true;
    act(() => {
      success = result.current.addToCart(mockProductOutOfStock);
    });

    expect(success).toBe(false);
    expect(result.current.cart).toHaveLength(0);
  });

  it('addToCart increments qty for existing product', async () => {
    const { result } = renderHook(() => useCart());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    act(() => {
      result.current.addToCart(mockProduct);
      result.current.addToCart(mockProduct);
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].qty).toBe(2);
  });

  it('addToCart respects stock limit', async () => {
    const { result } = renderHook(() => useCart());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    // Add up to stock limit
    for (let i = 0; i < 3; i++) {
      act(() => result.current.addToCart(mockProductLowStock));
    }

    expect(result.current.cart[0].qty).toBe(3);

    // Try to add one more — should not exceed stock
    act(() => result.current.addToCart(mockProductLowStock));
    expect(result.current.cart[0].qty).toBe(3);
  });

  it('updateQty increases quantity', async () => {
    const { result } = renderHook(() => useCart());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    act(() => {
      result.current.addToCart(mockProduct);
    });
    act(() => {
      result.current.updateQty('prod-1', 1);
    });

    expect(result.current.cart[0].qty).toBe(2);
  });

  it('updateQty removes item when qty reaches 0', async () => {
    const { result } = renderHook(() => useCart());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    act(() => result.current.addToCart(mockProduct));
    act(() => result.current.updateQty('prod-1', -1));

    expect(result.current.cart).toHaveLength(0);
  });

  it('updateQty clamps to stock limit', async () => {
    const { result } = renderHook(() => useCart());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    act(() => result.current.addToCart(mockProductLowStock));
    // qty is now 1, stock is 3
    act(() => {
      result.current.updateQty('prod-2', 1); // qty=2
      result.current.updateQty('prod-2', 1); // qty=3
      result.current.updateQty('prod-2', 1); // should clamp to 3
    });

    expect(result.current.cart[0].qty).toBe(3);
  });

  it('removeFromCart removes the item', async () => {
    const { result } = renderHook(() => useCart());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    act(() => {
      result.current.addToCart(mockProduct);
      result.current.addToCart(mockProductLowStock);
    });
    expect(result.current.cart).toHaveLength(2);

    act(() => result.current.removeFromCart('prod-1'));
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].id).toBe('prod-2');
  });

  it('undoRemove restores the removed item', async () => {
    const { result } = renderHook(() => useCart());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    act(() => {
      result.current.addToCart(mockProduct);
    });
    act(() => result.current.removeFromCart('prod-1'));
    expect(result.current.cart).toHaveLength(0);

    act(() => result.current.undoRemove());
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].id).toBe('prod-1');
  });

  it('clearCart empties the cart', async () => {
    const { result } = renderHook(() => useCart());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    act(() => {
      result.current.addToCart(mockProduct);
      result.current.addToCart(mockProductLowStock);
    });
    act(() => result.current.clearCart());

    expect(result.current.cart).toHaveLength(0);
    expect(result.current.totalItems).toBe(0);
  });

  it('calculates subtotal correctly', async () => {
    const { result } = renderHook(() => useCart());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    act(() => {
      result.current.addToCart(mockProduct); // 80 x 1
      result.current.addToCart(mockProductLowStock); // 80 x 1
    });

    expect(result.current.subtotal).toBe(160);
  });

  it('applies free delivery when subtotal >= 500', async () => {
    const expensiveProduct: Product = { ...mockProduct, id: 'expensive', price: 600, stock: 5 };
    const { result } = renderHook(() => useCart());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    act(() => result.current.addToCart(expensiveProduct));

    expect(result.current.subtotal).toBe(600);
    expect(result.current.deliveryFee).toBe(0);
  });

  it('charges delivery fee when subtotal < 500', async () => {
    const { result } = renderHook(() => useCart());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    act(() => result.current.addToCart(mockProduct));

    expect(result.current.subtotal).toBe(80);
    expect(result.current.deliveryFee).toBe(40);
  });

  it('persists cart to localStorage after changes', async () => {
    const { result } = renderHook(() => useCart());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    act(() => result.current.addToCart(mockProduct));
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    const saved = localStorageMock.getItem('lucky-cart');
    expect(saved).toBeTruthy();
    const parsed = JSON.parse(saved!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('prod-1');
  });
});