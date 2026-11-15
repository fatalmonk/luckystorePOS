'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CartItem, Product } from '../lib/types';
import { trackAddToCart } from '../lib/analytics';
import { getPromotionalPrice, getPromotionSavings, loadActiveStorefrontPromotions, type StorefrontItemPromotion } from '../lib/storefront-promotions';
import { EMERGENCY_CATALOG_SNAPSHOT_IDS } from '../lib/products/emergencyCatalogSnapshotIds';

const CART_KEY = 'lucky-cart';
const FREE_DELIVERY_THRESHOLD = 500;
const FREE_DELIVERY_FEE = 40;
const EMERGENCY_SNAPSHOT_ID_SET = new Set<string>(EMERGENCY_CATALOG_SNAPSHOT_IDS);

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartRef = useRef<CartItem[]>([]);
  const [storageError, setStorageError] = useState(false);
  const [promotions, setPromotions] = useState<StorefrontItemPromotion[]>([]);
  const [pricingNow, setPricingNow] = useState(() => new Date());
  // Single hydration guard — replaces the previous dual isLoaded + mounted pattern
  const [hydrated, setHydrated] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    let savedCart: CartItem[] = [];
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          savedCart = parsed.filter(
            (item): item is CartItem =>
              Boolean(item) &&
              typeof item.id === 'string' &&
              !EMERGENCY_SNAPSHOT_ID_SET.has(item.id) &&
              item.availabilityUnknown !== true,
          );
        }
      }
    } catch (e) {
      console.error('Failed to load cart:', e);
      setStorageError(true);
    }
    const timer = setTimeout(() => {
      if (savedCart.length > 0) {
        cartRef.current = savedCart;
        setCart(savedCart);
      }
      setHydrated(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;
    let refreshInFlight: Promise<void> | null = null;
    const refreshPromotions = () => {
      if (refreshInFlight) return refreshInFlight;

      const itemIds = cart.map((item) => item.id);
      if (itemIds.length === 0) {
        setPromotions([]);
        return Promise.resolve();
      }
      setPricingNow(new Date());
      refreshInFlight = import('../lib/supabase/client')
        .then(({ createClient }) => {
          const client = createClient();
          return client ? loadActiveStorefrontPromotions(client, itemIds) : [];
        })
        .then((active) => {
          if (!cancelled) setPromotions(active);
        })
        .catch(() => {
          if (!cancelled) setPromotions([]);
        })
        .finally(() => {
          refreshInFlight = null;
        });
      return refreshInFlight;
    };

    void refreshPromotions();

    // Pause polling while the tab is hidden to avoid steady-state Supabase reads
    // from background tabs. Resume immediately on visibility restore so prices are
    // fresh when the user returns.
    let intervalId: number | null = null;

    const startInterval = () => {
      if (intervalId !== null) return;
      intervalId = window.setInterval(() => void refreshPromotions(), 30_000);
    };

    const stopInterval = () => {
      if (intervalId === null) return;
      window.clearInterval(intervalId);
      intervalId = null;
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopInterval();
      } else {
        // Refresh immediately on return so stale promotions aren't shown.
        void refreshPromotions();
        startInterval();
      }
    };

    if (!document.hidden) startInterval();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      stopInterval();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [cart, hydrated]);

  // Save cart to localStorage when it changes (only after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart:', e);
      setStorageError(true);
    }
  }, [cart, hydrated]);

  // The WebMCP cart tool and storefront UI use the same atomic quantity update.
  // Change cartRef synchronously so consecutive tool calls see the latest cart.
  const addToCart = useCallback((product: Product, quantity = 1): boolean => {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) return false;
    if (!Number.isFinite(product.stock) || product.stock <= 0) return false;
    const previous = cartRef.current;
    const existing = previous.find((item) => item.id === product.id);
    if ((existing?.qty ?? 0) + quantity > (existing?.stock ?? product.stock)) return false;

    const nextCart: CartItem[] = existing
      ? previous.map((item) =>
        item.id === product.id ? { ...item, qty: item.qty + quantity } : item
      )
      : [...previous, { ...product, qty: quantity }];
    cartRef.current = nextCart;
    setCart(nextCart);
    trackAddToCart({ ...product, price: getPromotionalPrice(product, promotions, pricingNow) }, quantity);
    return true;
  }, [promotions, pricingNow]);

  const updateQty = useCallback((productId: string, delta: number) => {
    const existing = cartRef.current.find((item) => item.id === productId);
    const canIncrease = Boolean(existing && delta > 0 && existing.qty < existing.stock);
    setCart((prev) => {
      const nextCart = prev
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.qty + delta;
            if (newQty <= 0) return null;
            // Clamp to available stock — item carries stock from original Product
            const clampedQty = Math.min(newQty, item.stock);
            return { ...item, qty: clampedQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
      cartRef.current = nextCart;
      return nextCart;
    });
    if (existing && canIncrease) {
      trackAddToCart(
        { ...existing, price: getPromotionalPrice(existing, promotions, pricingNow) },
        Math.min(delta, existing.stock - existing.qty),
      );
    }
  }, [promotions, pricingNow]);

  const [lastRemoved, setLastRemoved] = useState<CartItem | null>(null);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => {
      const removed = prev.find((item) => item.id === productId);
      if (removed) setLastRemoved(removed);
      const nextCart = prev.filter((item) => item.id !== productId);
      cartRef.current = nextCart;
      return nextCart;
    });
  }, []);

  const undoRemove = useCallback(() => {
    setCart((prev) => {
      if (!lastRemoved) return prev;
      const existing = prev.find((item) => item.id === lastRemoved.id);
      let nextCart: CartItem[];
      if (existing) {
        nextCart = prev.map((item) =>
          item.id === lastRemoved.id ? { ...item, qty: item.qty + lastRemoved.qty } : item
        );
      } else {
        nextCart = [...prev, lastRemoved];
      }
      cartRef.current = nextCart;
      return nextCart;
    });
    setLastRemoved(null);
  }, [lastRemoved]);

  const clearCart = useCallback(() => {
    cartRef.current = [];
    setCart([]);
    try {
      localStorage.setItem(CART_KEY, '[]');
    } catch (e) {
      console.error('Failed to save cart:', e);
      setStorageError(true);
    }
  }, []);

  // Remove only purchased quantities, not unrelated items or quantities added
  // while the network request was in flight.
  const removePurchased = useCallback((submitted: Array<{ id: string; qty: number }>) => {
    const purchased = new Map<string, number>();
    for (const item of submitted) {
      if (!Number.isSafeInteger(item.qty) || item.qty <= 0) continue;
      purchased.set(item.id, (purchased.get(item.id) ?? 0) + item.qty);
    }
    const nextCart = cartRef.current.flatMap((item) => {
      const remaining = item.qty - (purchased.get(item.id) ?? 0);
      return remaining > 0 ? [{ ...item, qty: remaining }] : [];
    });
    cartRef.current = nextCart;
    setCart(nextCart);
  }, []);

  // Read current quantities and promotional totals atomically for WebMCP.
  // cartRef is updated synchronously by cart mutations; render-derived totals
  // may not have caught up when tools are invoked back-to-back.
  const getCheckoutSnapshot = useCallback(() => {
    const items = cartRef.current.map((item) => ({ ...item }));
    const subtotal = Math.round(items.reduce(
      (sum, item) => sum + getPromotionalPrice(item, promotions, pricingNow) * item.qty, 0,
    ) * 100) / 100;
    const discount = Math.round(items.reduce(
      (sum, item) => sum + getPromotionSavings(item, promotions, pricingNow) * item.qty, 0,
    ) * 100) / 100;
    const deliveryFee = subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : FREE_DELIVERY_FEE;
    return { items, subtotal, discount, deliveryFee, total: subtotal + deliveryFee };
  }, [promotions, pricingNow]);

  const syncPrices = useCallback((updates: { id: string; name?: string; price: number; mrp?: number }[]) => {
    const prices = new Map(updates.map((update) => [update.id, update]));
    setCart((prev) => {
      const nextCart = prev.map((item) => {
        const update = prices.get(item.id);
        return update ? {
          ...item,
          price: update.price,
          ...(update.mrp !== undefined ? { originalPrice: update.mrp > update.price ? update.mrp : undefined } : {}),
        } : item;
      });
      cartRef.current = nextCart;
      return nextCart;
    });
  }, []);

  // Before hydration, show empty cart to avoid SSR/client mismatch
  const safeCart = hydrated ? cart : [];
  const totalItems = hydrated ? cart.reduce((sum, item) => sum + item.qty, 0) : 0;
  const effectivePrice = useCallback(
    (item: CartItem) => getPromotionalPrice(item, promotions, pricingNow),
    [promotions, pricingNow],
  );
  const subtotal = hydrated ? Math.round(cart.reduce((sum, item) => sum + effectivePrice(item) * item.qty, 0) * 100) / 100 : 0;
  const deliveryFee = subtotal === 0 ? 0 : subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : (hydrated ? FREE_DELIVERY_FEE : 0);
  const discount = hydrated ? Math.round(cart.reduce((sum, item) => sum + getPromotionSavings(item, promotions, pricingNow) * item.qty, 0) * 100) / 100 : 0;
  const total = subtotal + deliveryFee;

  return {
    cart: safeCart,
    isLoaded: hydrated,
    addToCart,
    updateQty,
    removeFromCart,
    undoRemove,
    clearCart,
    removePurchased,
    getCheckoutSnapshot,
    syncPrices,
    effectivePrice,
    totalItems,
    subtotal,
    deliveryFee,
    discount,
    total,
    storageError,
  };
}
