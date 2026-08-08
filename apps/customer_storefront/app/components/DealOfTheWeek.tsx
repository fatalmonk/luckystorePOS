'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useCartActions } from '../hooks/useCartActions';
import { getDealOfTheWeekProducts, getDiscountPercentage } from '../lib/deals';
import { toProductSlug } from '../lib/products/slugify';
import type { Product } from '../lib/types';
import { DealCountdown } from './DealCountdown';
import { ProductCard } from './ProductCard';
import { MarketPanel } from './ui/MarketSurface';
import { ProductImage } from './product/ProductImage';

const CartFlyAnimation = dynamic(
  () => import('./CartFlyAnimation').then((m) => ({ default: m.CartFlyAnimation })),
  { ssr: false }
);

interface DealOfTheWeekProps {
  products: Product[];
}

export function DealOfTheWeek({ products }: DealOfTheWeekProps) {
  const selection = useMemo(() => getDealOfTheWeekProducts(products, 8), [products]);
  const supportingProducts = useMemo(() => selection?.supportingProducts ?? [], [selection]);
  const discountedProductCount = useMemo(
    () => products.filter((product) => product.originalPrice && product.originalPrice > product.price).length,
    [products],
  );
  const { cart, flyItems, handleAddToCart, handleUpdateQty, handleFlyComplete } = useCartActions();
  const dealRailRef = useRef<HTMLDivElement>(null);
  const addBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const scrollRafId = useRef<number | null>(null);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollControls = useCallback(() => {
    const rail = dealRailRef.current;
    if (!rail) return;

    const maximumScroll = Math.max(rail.scrollWidth - rail.clientWidth, 0);
    setCanScrollPrevious(rail.scrollLeft > 2);
    setCanScrollNext(rail.scrollLeft < maximumScroll - 2);
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRafId.current !== null) return;
    scrollRafId.current = window.requestAnimationFrame(() => {
      updateScrollControls();
      scrollRafId.current = null;
    });
  }, [updateScrollControls]);

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
      if (scrollRafId.current !== null) {
        window.cancelAnimationFrame(scrollRafId.current);
        scrollRafId.current = null;
      }
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
            href={`/product/${toProductSlug(leadProduct.name, leadProduct.id)}`}
            aria-label={`View ${leadProduct.name}`}
            className="deal-product-visual relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-[18px] border p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2 focus-visible:ring-offset-warm-bg sm:min-h-[340px]"
          >
            <span className="deal-discount absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-xs font-black shadow-md">
              {leadDiscount}% OFF
            </span>
            <div className="relative h-[260px] w-full sm:h-[320px]">
              <ProductImage
                src={leadProduct.image_url}
                alt={leadProduct.name}
                category={leadProduct.category}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 520px"
                imageClassName="object-contain"
                priority
                iconSize={64}
              />
            </div>
          </Link>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-warm-muted">
              {leadProduct.category}
            </span>
            <h3 className="text-lg font-black text-warm-fg sm:text-xl">
              <Link
                href={`/product/${toProductSlug(leadProduct.name, leadProduct.id)}`}
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
                  See all {discountedProductCount} deals →
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
              onScroll={handleScroll}
              className="deal-product-reel scrollbar-hide"
            >
              {supportingProducts.map((product) => (
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
                    onAdd={() => handleAddToCart(product, addBtnRefs.current[product.id] ?? null)}
                    onUpdateQty={(delta) => handleUpdateQty(product.id, delta)}
                    onAddRef={(el) => {
                      addBtnRefs.current[product.id] = el;
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <CartFlyAnimation items={flyItems} onComplete={handleFlyComplete} />
    </MarketPanel>
  );
}
