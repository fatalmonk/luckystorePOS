'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getLocalWishlist,
  getOrCreateFingerprint,
  saveLocalWishlist,
  toggleWishlistItemServer,
} from '../lib/wishlistHelpers';
import { useToast } from '../components/Toast';

const WISHLIST_EVENT = 'lucky-store:wishlist-change';
const pendingProductIds = new Set<string>();

interface WishlistChangeDetail {
  productId: string;
  isWishlisted: boolean;
  isPending?: boolean;
}

function notifyWishlistChange(detail: WishlistChangeDetail) {
  window.dispatchEvent(new CustomEvent<WishlistChangeDetail>(WISHLIST_EVENT, { detail }));
}

function writeWishlist(productId: string, isWishlisted: boolean): void {
  const list = getLocalWishlist();
  const next = isWishlisted
    ? Array.from(new Set([...list, productId]))
    : list.filter((id) => id !== productId);
  saveLocalWishlist(next);
}

export function useProductWishlist(productId: string, productName: string) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setIsWishlisted(getLocalWishlist().includes(productId));
    setIsPending(pendingProductIds.has(productId));

    const handleWishlistChange = (event: Event) => {
      const detail = (event as CustomEvent<WishlistChangeDetail>).detail;
      if (detail?.productId === productId) {
        setIsWishlisted(detail.isWishlisted);
        if (typeof detail.isPending === 'boolean') {
          setIsPending(detail.isPending);
        }
      }
    };

    window.addEventListener(WISHLIST_EVENT, handleWishlistChange);
    return () => window.removeEventListener(WISHLIST_EVENT, handleWishlistChange);
  }, [productId]);

  const toggle = useCallback(async () => {
    const fingerprint = getOrCreateFingerprint();
    if (!fingerprint || pendingProductIds.has(productId)) return;

    const nextState = !getLocalWishlist().includes(productId);
    pendingProductIds.add(productId);
    setIsPending(true);
    setIsWishlisted(nextState);
    writeWishlist(productId, nextState);
    notifyWishlistChange({ productId, isWishlisted: nextState, isPending: true });

    try {
      await toggleWishlistItemServer(productId, productName, fingerprint, nextState);
      showToast(nextState ? `Saved ${productName} to wishlist` : `Removed ${productName} from wishlist`);
    } catch (error) {
      console.error(error);
      const rollbackState = !nextState;
      setIsWishlisted(rollbackState);
      writeWishlist(productId, rollbackState);
      notifyWishlistChange({ productId, isWishlisted: rollbackState, isPending: false });
      showToast(`Couldn't sync wishlist - saved locally`);
    } finally {
      pendingProductIds.delete(productId);
      setIsPending(false);
      notifyWishlistChange({
        productId,
        isWishlisted: getLocalWishlist().includes(productId),
        isPending: false,
      });
    }
  }, [productId, productName, showToast]);

  return {
    isWishlisted,
    isPending,
    toggle,
  };
}
