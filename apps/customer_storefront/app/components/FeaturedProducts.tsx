'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ProductCard } from './ProductCard';
import { ProductGridSkeleton } from './ui/ProductCardSkeleton';
import { ProductErrorBoundary } from './ProductErrorBoundary';
import { useCartActions } from '../hooks/useCartActions';
import { CATEGORY_GROUPS, getParentGroup } from '../lib/types';
import type { Product } from '../lib/types';
import { MarketPanel } from './ui/MarketSurface';

const CartFlyAnimation = dynamic(
  () => import('./CartFlyAnimation').then((m) => ({ default: m.CartFlyAnimation })),
  { ssr: false }
);

interface FeaturedProductsProps {
  products: Product[];
  isLoading?: boolean;
}

const HOME_FEATURED_LIMIT = 6;

export function FeaturedProducts({ products, isLoading = false }: FeaturedProductsProps) {
  const { cart, flyItems, handleAddToCart, handleUpdateQty, handleFlyComplete } = useCartActions();

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
      return inStock.slice(0, HOME_FEATURED_LIMIT);
    }
    const selectedGroup = topGroups.find((g) => g.slug === activeTab);
    if (!selectedGroup) return inStock.slice(0, HOME_FEATURED_LIMIT);

    return inStock
      .filter((p) => {
        if (selectedGroup.subCategories.includes(p.category)) return true;
        const parent = getParentGroup(p.category);
        return parent?.slug === selectedGroup.slug;
      })
      .slice(0, HOME_FEATURED_LIMIT);
  }, [products, activeTab, topGroups]);

  const getQtyInCart = (productId: string) => {
    const item = cart.find((c) => c.id === productId);
    return item?.qty || 0;
  };

  return (
    <MarketPanel
      aria-labelledby="featured-products-title"
      tone="night"
      className="merchandising-panel space-y-5 p-5 sm:p-7"
    >
      <div className="merchandising-divider flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="campaign-kicker">Ready to add</p>
          <h2 id="featured-products-title" className="campaign-on-image mt-1 text-xl font-black tracking-[-0.02em] sm:text-2xl">
            Featured groceries
          </h2>
          <p className="campaign-on-image-muted mt-1 text-xs leading-5 sm:text-sm">
            In-stock picks from across Lucky Store.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Featured product categories"
          className="scrollbar-hide flex items-center gap-2 overflow-x-auto py-1"
        >
          <button
            type="button"
            role="tab"
            id="featured-tab-all"
            aria-selected={activeTab === 'all'}
            aria-controls="featured-product-panel"
            onClick={() => setActiveTab('all')}
            className={`merchandising-tab min-h-11 whitespace-nowrap rounded-full px-4 py-2 text-xs font-extrabold ${
              activeTab === 'all'
                ? 'merchandising-tab-active'
                : ''
            }`}
          >
            All
          </button>
          {topGroups.map((group) => (
            <button
              key={group.slug}
              type="button"
              role="tab"
              id={`featured-tab-${group.slug}`}
              aria-selected={activeTab === group.slug}
              aria-controls="featured-product-panel"
              onClick={() => setActiveTab(group.slug)}
              className={`merchandising-tab flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-extrabold ${
                activeTab === group.slug
                  ? 'merchandising-tab-active'
                  : ''
              }`}
            >
              <span aria-hidden="true">{group.emoji}</span>
              <span>{group.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        id="featured-product-panel"
        role="tabpanel"
        aria-labelledby={`featured-tab-${activeTab}`}
      >
        <ProductErrorBoundary fallbackMessage="Failed to load featured products">
          {isLoading ? (
            <ProductGridSkeleton count={HOME_FEATURED_LIMIT} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
              {displayedProducts.map((product, index) => {
                let addBtnRef: HTMLButtonElement | null = null;
                return (
                  <div key={product.id} className="flex h-full flex-col">
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
                      onAddRef={(el) => {
                        addBtnRef = el;
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </ProductErrorBoundary>
      </div>

      <div className="flex justify-end border-t border-[var(--color-campaign-border)] pt-4">
        <Link
          href="/category"
          className="campaign-card-action inline-flex min-h-11 items-center text-sm font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
        >
          See all groceries →
        </Link>
      </div>

      <CartFlyAnimation items={flyItems} onComplete={handleFlyComplete} />
    </MarketPanel>
  );
}
