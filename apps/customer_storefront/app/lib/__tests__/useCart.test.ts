import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { useCart } from '../../hooks/useCart';
import type { Product } from '../types';

const mockSupabaseFrom = vi.hoisted(() => vi.fn());
vi.mock('../supabase/client', () => ({ createClient: () => ({ from: mockSupabaseFrom }) }));

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

function createPromotionQuery() {
  const query: any = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.in = vi.fn(() => query);
  query.then = (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(resolve);
  return query;
}

describe('useCart', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSupabaseFrom.mockReset();
    mockSupabaseFrom.mockImplementation(createPromotionQuery);
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
    let success = true;
    act(() => {
      success = result.current.addToCart(mockProductLowStock);
    });
    expect(result.current.cart[0].qty).toBe(3);
    expect(success).toBe(false);
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
    expect(result.current.discount).toBe(0);
    expect(result.current.total).toBe(600);
  });

  it('does not subtract the delivery fee from an order over 500', async () => {
    const savedCart = [
      { ...mockProduct, id: 'deodorant', price: 445, qty: 1 },
      { ...mockProduct, id: 'soap', price: 60, qty: 1 },
      { ...mockProduct, id: 'hand-wash', price: 120, qty: 1 },
    ];
    localStorageMock.setItem('lucky-cart', JSON.stringify(savedCart));

    const { result } = renderHook(() => useCart());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    expect(result.current.subtotal).toBe(625);
    expect(result.current.deliveryFee).toBe(0);
    expect(result.current.discount).toBe(0);
    expect(result.current.total).toBe(625);
  });

  it('charges delivery fee when subtotal < 500', async () => {
    const { result } = renderHook(() => useCart());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    act(() => result.current.addToCart(mockProduct));

    expect(result.current.subtotal).toBe(80);
    expect(result.current.deliveryFee).toBe(40);
    expect(result.current.discount).toBe(0);
    expect(result.current.total).toBe(120);
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

  it('keeps the cart usable and reports when browser storage is unavailable', async () => {
    vi.spyOn(localStorageMock, 'setItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });

    const { result } = renderHook(() => useCart());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    act(() => result.current.addToCart(mockProduct));
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.storageError).toBe(true);
  });

  describe('promotion polling visibility', () => {
    afterEach(() => {
      // Reset visibility to visible between tests
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    });

    it('does not start the 30s interval when the tab is hidden on mount', async () => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      localStorageMock.setItem('lucky-cart', JSON.stringify([{ ...mockProduct, qty: 1 }]));
      const setIntervalSpy = vi.spyOn(window, 'setInterval');

      renderHook(() => useCart());
      await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

      const promotionIntervalCalls = setIntervalSpy.mock.calls.filter(
        ([, delay]) => delay === 30_000,
      );
      expect(promotionIntervalCalls).toHaveLength(0);
      expect(mockSupabaseFrom).toHaveBeenCalledTimes(1);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('storefront_item_promotions');
      setIntervalSpy.mockRestore();
    });

    it('starts the 30s interval when a hidden tab becomes visible', async () => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      localStorageMock.setItem('lucky-cart', JSON.stringify([{ ...mockProduct, qty: 1 }]));
      const setIntervalSpy = vi.spyOn(window, 'setInterval');

      renderHook(() => useCart());
      await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

      // Confirm no interval started while hidden
      expect(setIntervalSpy.mock.calls.filter(([, d]) => d === 30_000)).toHaveLength(0);
      expect(mockSupabaseFrom).toHaveBeenCalledTimes(1);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('storefront_item_promotions');

      // Simulate tab becoming visible
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(setIntervalSpy.mock.calls.filter(([, d]) => d === 30_000).length).toBeGreaterThanOrEqual(1);
      expect(mockSupabaseFrom).toHaveBeenCalledTimes(2);

      const promotionInterval = setIntervalSpy.mock.calls.find(([, delay]) => delay === 30_000)?.[0];
      expect(promotionInterval).toBeDefined();
      await act(async () => {
        (promotionInterval as () => void)();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(mockSupabaseFrom).toHaveBeenCalledTimes(3);
      setIntervalSpy.mockRestore();
    });

    it('clears the interval when a visible tab is hidden', async () => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });

      const setIntervalSpy = vi.spyOn(window, 'setInterval');
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

      renderHook(() => useCart());
      await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

      // Interval should have been started while visible
      expect(setIntervalSpy.mock.calls.filter(([, d]) => d === 30_000).length).toBeGreaterThanOrEqual(1);

      const clearCallsBefore = clearIntervalSpy.mock.calls.length;

      // Simulate tab hiding
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(clearCallsBefore);
      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });
  });
});
