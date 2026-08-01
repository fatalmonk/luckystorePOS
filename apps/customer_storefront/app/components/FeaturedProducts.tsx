'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
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
  const productRailRef = useRef<HTMLDivElement>(null);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

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
      .filter((c) => c.count > 0 && c.group.slug !== 'electronics')
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((c) => c.group);
  }, [products]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Filter products by tab
  const displayedProducts = useMemo(() => {
    const inStock = products.filter((p) => p.stock > 0);
    if (!activeCategory) {
      return inStock.slice(0, HOME_FEATURED_LIMIT);
    }
    const selectedGroup = topGroups.find((g) => g.slug === activeCategory);
    if (!selectedGroup) return inStock.slice(0, HOME_FEATURED_LIMIT);

    return inStock
      .filter((p) => {
        if (selectedGroup.subCategories.includes(p.category)) return true;
        const parent = getParentGroup(p.category);
        return parent?.slug === selectedGroup.slug;
      })
      .slice(0, HOME_FEATURED_LIMIT);
  }, [products, activeCategory, topGroups]);

  const getQtyInCart = (productId: string) => {
    const item = cart.find((c) => c.id === productId);
    return item?.qty || 0;
  };

  const updateScrollControls = useCallback(() => {
    const rail = productRailRef.current;
    if (!rail) return;

    const maximumScroll = Math.max(rail.scrollWidth - rail.clientWidth, 0);
    setCanScrollPrevious(rail.scrollLeft > 2);
    setCanScrollNext(rail.scrollLeft < maximumScroll - 2);
  }, []);

  useEffect(() => {
    const rail = productRailRef.current;
    if (!rail) return;

    rail.scrollLeft = 0;
    const frame = window.requestAnimationFrame(updateScrollControls);
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateScrollControls);
    resizeObserver?.observe(rail);
    window.addEventListener('resize', updateScrollControls);
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateScrollControls);
    };
  }, [displayedProducts, updateScrollControls]);

  const scrollProducts = (direction: -1 | 1) => {
    const rail = productRailRef.current;
    if (!rail) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * 0.78, 280),
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  const handleProductRailKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    scrollProducts(event.key === 'ArrowLeft' ? -1 : 1);
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

        <div className="flex min-w-0 items-center gap-3">
          <div
            role="group"
            aria-label="Featured product categories"
            className="scrollbar-hide flex min-w-0 items-center gap-2 overflow-x-auto py-1"
          >
            {topGroups.map((group) => (
              <button
                key={group.slug}
                type="button"
                aria-pressed={activeCategory === group.slug}
                aria-controls="featured-product-panel"
                onClick={() => setActiveCategory((current) => current === group.slug ? null : group.slug)}
                className={`merchandising-tab flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-extrabold ${
                  activeCategory === group.slug
                    ? 'merchandising-tab-active'
                    : ''
                }`}
              >
                <span aria-hidden="true">{group.emoji}</span>
                <span>{group.label}</span>
              </button>
            ))}
          </div>

          <div className="flex shrink-0 gap-2" role="group" aria-label="Featured grocery carousel controls">
            <button
              type="button"
              aria-label="Previous featured groceries"
              onClick={() => scrollProducts(-1)}
              disabled={!canScrollPrevious}
              className="merchandising-rail-control"
            >
              <CaretLeft aria-hidden="true" size={18} weight="bold" />
            </button>
            <button
              type="button"
              aria-label="Next featured groceries"
              onClick={() => scrollProducts(1)}
              disabled={!canScrollNext}
              className="merchandising-rail-control"
            >
              <CaretRight aria-hidden="true" size={18} weight="bold" />
            </button>
          </div>
        </div>
      </div>

      <div
        id="featured-product-panel"
      >
        <ProductErrorBoundary fallbackMessage="Failed to load featured products">
          {isLoading ? (
            <ProductGridSkeleton count={HOME_FEATURED_LIMIT} />
          ) : (
            <div
              ref={productRailRef}
              role="region"
              aria-label="Featured groceries carousel"
              tabIndex={0}
              onKeyDown={handleProductRailKeyDown}
              onScroll={updateScrollControls}
              className="featured-product-reel scrollbar-hide"
            >
              {displayedProducts.map((product, index) => {
                let addBtnRef: HTMLButtonElement | null = null;
                return (
                  <div key={product.id} className="featured-product-slide flex h-full flex-col">
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

      <style>{`
        .featured-product-reel {
          display: flex;
          gap: 0.75rem;
          overflow-x: auto;
          overscroll-behavior-inline: contain;
          padding: 0.25rem 0.125rem 0.75rem;
          scroll-padding-inline: 0.125rem;
          scroll-snap-type: inline mandatory;
        }

        .featured-product-reel:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 4px;
        }

        .featured-product-slide {
          flex: 0 0 min(78vw, 17rem);
          scroll-snap-align: start;
        }

        .merchandising-rail-control {
          display: grid;
          width: 2.75rem;
          height: 2.75rem;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid var(--color-campaign-border);
          border-radius: 9999px;
          color: var(--color-campaign-on-image);
          background: var(--color-campaign-control);
          transition: border-color 180ms ease, background-color 180ms ease, opacity 180ms ease;
        }

        .merchandising-rail-control:hover:not(:disabled) {
          border-color: var(--color-accent);
          background: var(--color-campaign-control-hover);
        }

        .merchandising-rail-control:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }

        .merchandising-rail-control:disabled {
          cursor: default;
          opacity: 0.35;
        }

        @media (min-width: 640px) {
          .featured-product-reel {
            gap: 1rem;
          }

          .featured-product-slide {
            flex-basis: calc((100% - 2rem) / 3);
          }
        }

        @media (min-width: 1024px) {
          .featured-product-slide {
            flex-basis: calc((100% - 3rem) / 4);
          }
        }

        @media (min-width: 1280px) {
          .featured-product-slide {
            flex-basis: calc((100% - 4rem) / 5);
          }
        }
      `}</style>
    </MarketPanel>
  );
}
