'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { getDealOfTheWeekProducts, getDiscountBadgePercentage } from '../lib/deals';
import { toProductSlug } from '../lib/products/slugify';
import type { Product } from '../lib/types';
import { DealCountdown } from './DealCountdown';
import { GridProductCard } from './GridProductCard';
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
    () => products.filter((product) => getDiscountBadgePercentage(product) !== null).length,
    [products],
  );
  const dealRailRef = useRef<HTMLDivElement>(null);
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

    let frameId: number | null = null;
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => {
          if (frameId !== null) window.cancelAnimationFrame(frameId);
          frameId = window.requestAnimationFrame(updateScrollControls);
        });

    resizeObserver?.observe(rail);
    window.addEventListener('resize', updateScrollControls, { passive: true });
    frameId = window.requestAnimationFrame(updateScrollControls);

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
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
  const leadDiscount = getDiscountBadgePercentage(leadProduct);

  return (
    <MarketPanel
      aria-labelledby="weekly-deal-title"
      tone="night"
      className="deal-panel space-y-5 p-4 sm:space-y-6 sm:p-5"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h2 id="weekly-deal-title" className="deal-panel-title text-xl font-black tracking-tight sm:text-2xl">
            The Weekly Special
          </h2>
        </div>
        <DealCountdown />
        <p className="deal-panel-copy col-span-1 max-w-2xl text-sm">
          A cherished kitchen staple, handpicked for you at an exceptional price.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <article className={`deal-lead-card flex flex-col justify-between space-y-3 rounded-[18px] p-4 ${supportingProducts.length > 0 ? 'lg:col-span-5' : 'lg:col-span-12 lg:max-w-xl'}`}>
          <Link
            href={`/product/${toProductSlug(leadProduct.name, leadProduct.id)}`}
            aria-label={`${leadDiscount}% off — View ${leadProduct.name}`}
            className="deal-product-visual relative flex min-h-[210px] items-center justify-center overflow-hidden rounded-warm-card border p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2 focus-visible:ring-offset-warm-bg sm:min-h-[270px]"
          >
            <span className="deal-discount absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-xs font-black shadow-md">
              {leadDiscount}% off
            </span>
            <div className="relative h-[190px] w-full sm:h-[250px]">
              <ProductImage
                src={leadProduct.image_url}
                alt={leadProduct.name}
                category={leadProduct.category}
                sizes="(max-width: 640px) calc(100vw - 72px), (max-width: 1024px) calc(100vw - 112px), 500px"
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
            <h3 className="text-base font-black text-warm-fg sm:text-lg">
              <Link
                href={`/product/${toProductSlug(leadProduct.name, leadProduct.id)}`}
                className="hover:text-warm-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2 focus-visible:ring-offset-warm-bg"
              >
                {leadProduct.name}
              </Link>
            </h3>
            <p className="line-clamp-2 text-xs leading-5 text-warm-muted">{leadProduct.description}</p>

            <div className="flex flex-wrap items-baseline gap-2 pt-2">
              <span className="text-xl font-black text-warm-fg">৳{leadProduct.price}</span>
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
          <div className="min-w-0 space-y-3 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="deal-panel-title text-sm font-extrabold">More deals</h3>
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
                  <GridProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <CartFlyAnimation items={[]} onComplete={() => undefined} />
    </MarketPanel>
  );
}
