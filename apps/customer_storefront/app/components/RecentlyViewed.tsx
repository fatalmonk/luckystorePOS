'use client';

import { useMemo } from 'react';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { ProductCard } from './ProductCard';
import { useCartActions } from '../hooks/useCartActions';
import type { Product } from '../lib/types';

interface RecentlyViewedProps {
  products: Product[];
  currentProductId?: string;
}

export function RecentlyViewed({ products, currentProductId }: RecentlyViewedProps) {
  const { recentlyViewedIds, isLoaded, clearViewed } = useRecentlyViewed();
  const { cart, handleAddToCart, handleUpdateQty } = useCartActions();

  // Filter products by recently viewed IDs, excluding current item if provided
  const viewedProducts = useMemo(() => {
    if (!isLoaded || recentlyViewedIds.length === 0) return [];
    
    const matched: Product[] = [];
    for (const id of recentlyViewedIds) {
      if (id === currentProductId) continue;
      const found = products.find((p) => p.id === id);
      if (found) matched.push(found);
    }
    return matched.slice(0, 6);
  }, [recentlyViewedIds, products, currentProductId, isLoaded]);

  if (!isLoaded || viewedProducts.length === 0) return null;

  const getQtyInCart = (productId: string) => {
    const item = cart.find((c) => c.id === productId);
    return item?.qty || 0;
  };

  return (
    <section className="bg-warm-surface border border-warm-border rounded-[24px] p-4 sm:p-6 shadow-warm-sm space-y-4 my-6">
      <div className="flex items-center justify-between pb-3 border-b border-warm-border">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-warm-fg flex items-center gap-2">
            <span>👁️</span> Recently Viewed
          </h2>
          <p className="text-xs text-warm-muted mt-0.5">Items you looked at earlier</p>
        </div>
        <button
          onClick={clearViewed}
          className="text-xs font-semibold text-warm-muted hover:text-red-500 transition-colors"
        >
          Clear History
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {viewedProducts.map((product) => (
          <ProductCard
            key={product.id}
            id={product.id}
            emoji={product.emoji}
            name={product.name}
            price={product.price}
            originalPrice={product.originalPrice}
            badge={product.badge}
            unit={product.unit}
            stock={product.stock}
            category={product.category}
            image_url={product.image_url}
            qtyInCart={getQtyInCart(product.id)}
            onAdd={() => handleAddToCart(product)}
            onUpdateQty={(delta) => handleUpdateQty(product.id, delta)}
          />
        ))}
      </div>
    </section>
  );
}
