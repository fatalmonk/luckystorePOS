'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ProductCard } from './ProductCard';
import { useCartActions } from '../hooks/useCartActions';
import { CATEGORY_GROUPS, getParentGroup } from '../lib/types';
import type { Product } from '../lib/types';

const CartFlyAnimation = dynamic(
  () => import('./CartFlyAnimation').then((m) => ({ default: m.CartFlyAnimation })),
  { ssr: false }
);

interface FeaturedProductsProps {
  products: Product[];
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  const { cart, flyItems, handleAddToCart, handleUpdateQty, handleFlyComplete, handleClick } = useCartActions();

  // Find top 3 category groups with the most in-stock products
  const topGroups = useMemo(() => {
    const inStock = products.filter((p) => p.stock > 0);
    const counts = CATEGORY_GROUPS.map((group) => {
      const count = inStock.filter((p) => {
        if (group.subCategories.includes(p.category)) return true;
        const parent = getParentGroup(p.category);
        return parent?.slug === group.slug;
      }).length;
      return { group, count };
    });

    return counts
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((c) => c.group);
  }, [products]);

  const [activeTab, setActiveTab] = useState<string>('all');

  // Filter products by tab
  const displayedProducts = useMemo(() => {
    const inStock = products.filter((p) => p.stock > 0);
    if (activeTab === 'all') {
      return inStock.slice(0, 10);
    }
    const selectedGroup = topGroups.find((g) => g.slug === activeTab);
    if (!selectedGroup) return inStock.slice(0, 10);

    return inStock
      .filter((p) => {
        if (selectedGroup.subCategories.includes(p.category)) return true;
        const parent = getParentGroup(p.category);
        return parent?.slug === selectedGroup.slug;
      })
      .slice(0, 10);
  }, [products, activeTab, topGroups]);

  const getQtyInCart = (productId: string) => {
    const item = cart.find((c) => c.id === productId);
    return item?.qty || 0;
  };

  return (
    <section className="bg-warm-surface rounded-[24px] p-4 sm:p-6 border border-warm-border/60 shadow-warm-sm space-y-4">
      {/* Header & Category Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-warm-border/40">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-warm-fg flex items-center gap-2">
            <span>🌟</span> Featured Products
          </h2>
          <p className="text-xs text-warm-muted mt-0.5">Top-rated items & daily grocery essentials</p>
        </div>

        {/* Tabs navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-warm-fg text-warm-accent shadow-sm'
                : 'bg-warm-bg text-warm-fg hover:bg-warm-border/40'
            }`}
          >
            All
          </button>
          {topGroups.map((group) => (
            <button
              key={group.slug}
              type="button"
              onClick={() => setActiveTab(group.slug)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                activeTab === group.slug
                  ? 'bg-warm-fg text-warm-accent shadow-sm'
                  : 'bg-warm-bg text-warm-fg hover:bg-warm-border/40'
              }`}
            >
              <span>{group.emoji}</span>
              <span>{group.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {displayedProducts.map((product, index) => {
          let addBtnRef: HTMLButtonElement | null = null;
          return (
            <div key={product.id}>
              <ProductCard
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
                priority={index === 0}
                onAdd={() => handleAddToCart(product, addBtnRef)}
                onUpdateQty={(delta) => handleUpdateQty(product.id, delta)}
                onClick={() => handleClick(product.id)}
                onAddRef={(el) => {
                  addBtnRef = el;
                }}
              />
            </div>
          );
        })}
      </div>

      <CartFlyAnimation items={flyItems} onComplete={handleFlyComplete} />
    </section>
  );
}
