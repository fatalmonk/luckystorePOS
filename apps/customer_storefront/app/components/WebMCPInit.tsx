'use client';

import { useEffect, useRef } from 'react';
import { useCartContext } from './CartProvider';
import { bindWebMCPCartBridge, initWebMCP } from '../lib/webmcp';

/**
 * Client component that initializes WebMCP on mount.
 * Renders nothing — just handles the browser-side lifecycle.
 */
export function WebMCPInit() {
  const cart = useCartContext();
  // The registered browser tools live across React renders, but cart state does not.
  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    const controller = new AbortController();
    const unbind = bindWebMCPCartBridge({
      isReady: () => cartRef.current.isLoaded,
      snapshot: () => cartRef.current.getCheckoutSnapshot(),
      add: (product, quantity) => cartRef.current.addToCart(product, quantity),
      clear: () => cartRef.current.clearCart(),
      removePurchased: (items) => cartRef.current.removePurchased(items),
    });
    void initWebMCP(controller.signal);
    return () => {
      controller.abort();
      unbind();
    };
  }, []);

  return null;
}
