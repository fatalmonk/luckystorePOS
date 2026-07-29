'use client';

import Link from 'next/link';
import React, { type CSSProperties, type KeyboardEvent, useMemo, useRef } from 'react';
import { selectCategoryCarousel } from '../lib/categoryCarousel';
import type { Product } from '../lib/types';
import { MarketPanel } from './ui/MarketSurface';

export function CategorySingleCarousel({ products }: { products: Product[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const categories = useMemo(() => selectCategoryCarousel(products), [products]);

  if (categories.length === 0) return null;

  const moveRail = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * 0.72, 260),
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };

  const handleRailKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    moveRail(event.key === 'ArrowLeft' ? -1 : 1);
  };

  return (
    <MarketPanel
      tone="night"
      aria-labelledby="category-single-carousel-title"
      className="category-single-carousel px-5 py-8 sm:px-7 sm:py-10 lg:px-10 lg:py-12"
    >
      <div className="flex items-end justify-between gap-5">
        <div className="max-w-2xl">
          <p className="campaign-kicker">Continue by aisle</p>
          <h2
            id="category-single-carousel-title"
            className="mt-2 text-balance text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl"
          >
            Pick a shelf. Keep the momentum.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
            Live catalog counts keep the next move useful without turning the homepage into a product wall.
          </p>
        </div>
        <div className="hidden shrink-0 gap-2 sm:flex">
          <button type="button" aria-label="Previous categories" onClick={() => moveRail(-1)} className="cyber-rail-control">←</button>
          <button type="button" aria-label="Next categories" onClick={() => moveRail(1)} className="cyber-rail-control">→</button>
        </div>
      </div>

      <div
        ref={railRef}
        role="region"
        aria-label="Shop by category"
        tabIndex={0}
        onKeyDown={handleRailKeyDown}
        className="category-card-reel scrollbar-hide mt-7"
      >
        {categories.map((category, index) => (
          <Link
            key={category.slug}
            href={category.href}
            className="category-cyber-card group"
            style={{ '--category-index': index } as CSSProperties}
          >
            <span className="category-cyber-icon" aria-hidden="true">{category.emoji}</span>
            <span className="category-cyber-pill">Shop aisle</span>
            <span className="mt-auto block">
              <span className="block text-lg font-black tracking-[-0.025em] text-white">
                {category.label}
              </span>
              <span className="mt-1 flex items-center justify-between gap-3 font-mono text-xs uppercase tracking-[0.08em] text-white/55">
                <span>{category.itemCount} {category.itemCount === 1 ? 'item' : 'items'}</span>
                <span className="text-[var(--color-accent)] transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
              </span>
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex justify-between sm:hidden">
        <button type="button" aria-label="Previous categories" onClick={() => moveRail(-1)} className="cyber-rail-control">←</button>
        <button type="button" aria-label="Next categories" onClick={() => moveRail(1)} className="cyber-rail-control">→</button>
      </div>
    </MarketPanel>
  );
}
