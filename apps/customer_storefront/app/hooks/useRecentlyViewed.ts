'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'lucky_recently_viewed_v1';
const MAX_ITEMS = 10;

export function useRecentlyViewed() {
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Read from localStorage on mount (hydration safe)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setRecentlyViewedIds(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to read recently viewed from localStorage', err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Add product ID to recently viewed
  const addViewed = useCallback((productId: string) => {
    if (!productId) return;

    setRecentlyViewedIds((prev) => {
      const filtered = prev.filter((id) => id !== productId);
      const updated = [productId, ...filtered].slice(0, MAX_ITEMS);
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save recently viewed', err);
      }

      return updated;
    });
  }, []);

  // Clear history
  const clearViewed = useCallback(() => {
    setRecentlyViewedIds([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear recently viewed', err);
    }
  }, []);

  return {
    recentlyViewedIds,
    isLoaded,
    addViewed,
    clearViewed,
  };
}
