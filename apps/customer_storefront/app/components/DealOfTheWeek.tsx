'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useCartActions } from '../hooks/useCartActions';
import { getDealOfTheWeekProducts, getDiscountPercentage } from '../lib/deals';
import type { Product } from '../lib/types';
import { DealCountdown } from './DealCountdown';
import { ProductCard } from './ProductCard';
import { MarketPanel } from './ui/MarketSurface';

const CartFlyAnimation = dynamic(
  () => import('./CartFlyAnimation').then((m) => ({ default: m.CartFlyAnimation })),
  { ssr: false }
);

interface DealOfTheWeekProps {
  products: Product[];
}

export function DealOfTheWeek({ products }: DealOfTheWeekProps) {
  const selection = useMemo(() => getDealOfTheWeekProducts(products), [products]);
  const supportingProducts = useMemo(() => selection?.supportingProducts ?? [], [selection]);
  const { cart, flyItems, handleAddToCart, handleUpdateQty, handleFlyComplete } = useCartActions();
  const dealRailRef = useRef<HTMLDivElement>(null);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollControls = useCallback(() => {
    const rail = dealRailRef.current;
    if (!rail) return;

    const maximumScroll = Math.max(rail.scrollWidth - rail.clientWidth, 0);
    setCanScrollPrevious(rail.scrollLeft > 2);
    setCanScrollNext(rail.scrollLeft < maximumScroll - 2);
  }, []);

  useEffect(() => {
    const rail = dealRailRef.current;
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
  }, [supportingProducts, updateScrollControls]);

  const scrollDeals = (direction: -1 | 1) => {
    const rail = dealRailRef.current;
    if (!rail) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * 0.78, 280),
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  const handleDealRailKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    scrollDeals(event.key === 'ArrowLeft' ? -1 : 1);
  };

  if (!selection) {
    return null;
  }

  const { leadProduct } = selection;
  const leadDiscount = getDiscountPercentage(leadProduct);

  const getQtyInCart = (productId: string) => {
    const item = cart.find((c) => c.id === productId);
    return item?.qty || 0;
  };

  return (
    <MarketPanel
      aria-labelledby="weekly-deal-title"
      tone="accent"
      className="deal-panel space-y-7 p-5 sm:p-7"
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="home-section-kicker">Save this week</p>
          <h2 id="weekly-deal-title" className="home-section-title">
            This week&apos;s best deal
          </h2>
          <p className="home-section-description">
            Our biggest featured saving, with more discounted products alongside it.
          </p>
        </div>
        <DealCountdown />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <article className={`deal-lead-card flex flex-col justify-between space-y-4 rounded-[22px] p-5 ${supportingProducts.length > 0 ? 'lg:col-span-5' : 'lg:col-span-12 lg:max-w-xl'}`}>
          <Link
            href={`/product/${encodeURIComponent(leadProduct.id)}`}
            aria-label={`View ${leadProduct.name}`}
            className="deal-product-visual relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-[18px] border p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2 focus-visible:ring-offset-warm-bg sm:min-h-[340px]"
          >
            <span className="deal-discount absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-xs font-black shadow-md">
              {leadDiscount}% OFF
            </span>
            {leadProduct.image_url ? (
              <div className="relative h-[260px] w-full sm:h-[320px]">
                <Image
                  src={leadProduct.image_url}
                  alt={leadProduct.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 520px"
                  className="object-contain"
                />
              </div>
            ) : (
              <span className="text-8xl sm:text-9xl" aria-hidden="true">
                {leadProduct.emoji}
              </span>
            )}
          </Link>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-warm-muted">
              {leadProduct.category}
            </span>
            <h3 className="text-lg font-black text-warm-fg sm:text-xl">
              <Link
                href={`/product/${encodeURIComponent(leadProduct.id)}`}
                className="hover:text-warm-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2 focus-visible:ring-offset-warm-bg"
              >
                {leadProduct.name}
              </Link>
            </h3>
            <p className="line-clamp-2 text-xs leading-5 text-warm-muted">{leadProduct.description}</p>

            <div className="flex flex-wrap items-baseline gap-2 pt-2">
              <span className="text-2xl font-black text-warm-accent">৳{leadProduct.price}</span>
              {leadProduct.originalPrice && (
                <span className="text-sm font-bold text-warm-muted line-through">
                  ৳{leadProduct.originalPrice}
                </span>
              )}
              <span className="text-xs font-medium text-warm-muted">/ {leadProduct.unit}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Link
              href="/category?theme=deals"
              className="home-primary-action inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-4 py-3 text-center text-xs font-black uppercase tracking-wider"
            >
              Shop all deals →
            </Link>
          </div>
        </article>

        {supportingProducts.length > 0 && (
          <div className="min-w-0 space-y-4 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-extrabold text-warm-fg">More deals</h3>
              <div className="flex items-center gap-3">
                <Link
                  href="/category?theme=deals"
                  className="home-text-link inline-flex min-h-11 items-center text-xs font-bold"
                >
                  See all {supportingProducts.length + 1} deals →
                </Link>
                <div className="flex shrink-0 gap-2" role="group" aria-label="Weekly deal carousel controls">
                  <button
                    type="button"
                    aria-label="Previous weekly deals"
                    onClick={() => scrollDeals(-1)}
                    disabled={!canScrollPrevious}
                    className="deal-rail-control"
                  >
                    <CaretLeft aria-hidden="true" size={18} weight="bold" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next weekly deals"
                    onClick={() => scrollDeals(1)}
                    disabled={!canScrollNext}
                    className="deal-rail-control"
                  >
                    <CaretRight aria-hidden="true" size={18} weight="bold" />
                  </button>
                </div>
              </div>
            </div>

            <div
              ref={dealRailRef}
              role="region"
              aria-label="More weekly deals"
              tabIndex={0}
              onKeyDown={handleDealRailKeyDown}
              onScroll={updateScrollControls}
              className="deal-product-reel scrollbar-hide"
            >
              {supportingProducts.map((product) => {
                let addBtnRef: HTMLButtonElement | null = null;
                return (
                  <div key={product.id} className="deal-product-slide text-warm-fg">
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
                      theme="deals"
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
          </div>
        )}
      </div>

      <CartFlyAnimation items={flyItems} onComplete={handleFlyComplete} />

      <style>{`
        .deal-product-reel {
          display: flex;
          gap: 0.75rem;
          overflow-x: auto;
          overscroll-behavior-inline: contain;
          padding: 0.25rem 0.125rem 0.75rem;
          scroll-padding-inline: 0.125rem;
          scroll-snap-type: inline mandatory;
        }

        .deal-product-reel:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 4px;
        }

        .deal-product-slide {
          flex: 0 0 min(76vw, 15rem);
          scroll-snap-align: start;
        }

        .deal-rail-control {
          display: grid;
          width: 2.75rem;
          height: 2.75rem;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid var(--color-border);
          border-radius: 9999px;
          color: var(--color-foreground);
          background: var(--color-surface);
          transition: border-color 180ms ease, background-color 180ms ease, opacity 180ms ease;
        }

        .deal-rail-control:hover:not(:disabled) {
          border-color: var(--color-accent);
          background: var(--color-accent-muted);
        }

        .deal-rail-control:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }

        .deal-rail-control:disabled {
          cursor: default;
          opacity: 0.35;
        }

        @media (min-width: 640px) {
          .deal-product-slide {
            flex-basis: calc((100% - 0.75rem) / 2);
          }
        }

        @media (min-width: 1280px) {
          .deal-product-slide {
            flex-basis: calc((100% - 1.5rem) / 3);
          }
        }
      `}</style>
    </MarketPanel>
  );
}
