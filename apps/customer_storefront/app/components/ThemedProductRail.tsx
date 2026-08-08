'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { CompactProductCard } from './CompactProductCard';
import type { Product } from '../lib/types';
import { getCategoryGroup } from '../lib/types';
import { getCategoryIcon } from './icons/CategoryIcons';

export interface ThemedProductRailProps {
  products: Product[];
  title: string;
  subtitle: string;
  ctaLabel?: string;
  ctaHref?: string;
  theme: 'morning' | 'pantry' | 'household' | 'deals';
  id: string;
}

type ThemeKey = ThemedProductRailProps['theme'];

interface ThemeStyle {
  bg: string;
  darkBg: string;
  accent: string;
  iconSlug: string;
  groups: readonly string[];
}

const THEME_STYLES: Record<ThemeKey, ThemeStyle> = {
  morning: {
    bg: 'bg-gradient-to-br from-[#FFFBF0] to-[#FDFBF7]',
    darkBg: 'dark:bg-gradient-to-br dark:from-[#241e1a] dark:to-[#0B0B0D]',
    accent: '#f0c444',
    iconSlug: 'breakfast',
    groups: ['dairy & eggs', 'breakfast', 'tea & coffee', 'biscuits & cookies', 'cereals', 'chocolates & candies'],
  },
  pantry: {
    bg: 'bg-gradient-to-br from-[#FFFBF0] to-[#FDFBF7]',
    darkBg: 'dark:bg-gradient-to-br dark:from-[#241e1a] dark:to-[#0B0B0D]',
    accent: '#f0c444',
    iconSlug: 'rice-and-grain',
    groups: ['rice & grain', 'cooking essentials', 'spices', 'oil & ghee'],
  },
  household: {
    bg: 'bg-gradient-to-br from-[#FFFBF0] to-[#FDFBF7]',
    darkBg: 'dark:bg-gradient-to-br dark:from-[#241e1a] dark:to-[#0B0B0D]',
    accent: '#f0c444',
    iconSlug: 'cleaning-supplies',
    groups: ['cleaning supplies', 'personal care', 'air freshner', 'pest control'],
  },
  deals: {
    bg: 'bg-gradient-to-br from-[#FFF0E8] to-[#FDFBF7]',
    darkBg: 'dark:bg-gradient-to-br dark:from-[#2a1f1a] dark:to-[#0B0B0D]',
    accent: '#e76f51',
    iconSlug: 'snacks',
    groups: [],
  },
};

function scoreProduct(product: Product, groups: readonly string[]): number {
  const rawCategory = product.category?.toLowerCase().trim();
  if (!rawCategory || groups.length === 0) return 0;

  const normalizedGroups = groups.map((g) => g.toLowerCase().trim());
  if (normalizedGroups.includes(rawCategory)) return 1;

  // Resolve slug/subcategory to canonical group, then match by normalized slug
  const group = getCategoryGroup(rawCategory);
  if (group) {
    const canon = group.slug.toLowerCase().trim().replace(/[-\s&]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (normalizedGroups.some((g) => canon === g.replace(/[-\s&]+/g, ' ').replace(/\s+/g, ' ').trim())) return 1;
  }

  return 0;
}

export function ThemedProductRail({
  products,
  title,
  subtitle,
  ctaLabel = 'Shop all',
  ctaHref = '/category',
  theme,
  id,
}: ThemedProductRailProps) {
  const themeStyle = THEME_STYLES[theme];

  const picks = useMemo(() => {
    const inStock = products.filter((p) => p.stock > 0);

    if (theme === 'deals') {
      const onSale = inStock.filter((p) => p.originalPrice != null && p.originalPrice > p.price);
      const withBadge = inStock.filter((p) => p.badge);
      const pool = onSale.length >= 4 ? onSale : withBadge.length >= 4 ? withBadge : inStock;
      return pool.slice(0, 8);
    }

    const scored = inStock
      .map((p) => ({ product: p, score: scoreProduct(p, themeStyle.groups) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
      .slice(0, 8)
      .map((s) => s.product);

    return scored.length >= 4 ? scored : inStock.slice(0, 8);
  }, [products, theme, themeStyle.groups]);

  const scrollProgressRef = useRef(0);

  const scroll = (dir: -1 | 1) => {
    const el = document.getElementById(`themed-reel-${id}`);
    if (!el) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.78, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    if (picks.length === 0) return;
    const el = document.getElementById(`themed-reel-${id}`);
    const thumb = document.getElementById(`themed-scroll-thumb-${id}`);
    if (!el || !thumb) return;

    const updateThumb = () => {
      const max = el.scrollWidth - el.clientWidth;
      const ratio = max > 0 ? el.scrollLeft / max : 0;
      const viewportCards = Math.min(picks.length, window.innerWidth >= 1024 ? 4 : window.innerWidth >= 640 ? 3 : Math.floor(el.clientWidth / (el.clientWidth * 0.46)));
      const thumbWidth = Math.max(10, Math.min(100, (100 / picks.length) * viewportCards));
      const travel = 100 - thumbWidth;
      thumb.style.width = `${thumbWidth}%`;
      thumb.style.transform = `translateX(${Math.max(0, Math.min(travel, ratio * travel))}%)`;
      scrollProgressRef.current = ratio;
    };

    updateThumb();
    el.addEventListener('scroll', updateThumb, { passive: true });
    window.addEventListener('resize', updateThumb, { passive: true });
    return () => {
      el.removeEventListener('scroll', updateThumb);
      window.removeEventListener('resize', updateThumb);
    };
  }, [id, picks.length]);

  if (picks.length === 0) return null;

  return (
    <section
      aria-labelledby={`themed-title-${id}`}
      className={`relative overflow-hidden rounded-[24px] ${themeStyle.bg} ${themeStyle.darkBg} p-5 shadow-warm-rest sm:p-7`}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full opacity-30 blur-2xl"
        style={{ background: themeStyle.accent }}
      />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="max-w-[70%]">
          <span className="text-warm-fg" aria-hidden="true">
            {getCategoryIcon(themeStyle.iconSlug, 28)}
          </span>
          <h2
            id={`themed-title-${id}`}
            className="mt-1 text-2xl font-black leading-tight tracking-tight text-warm-fg sm:text-3xl"
          >
            {title}
          </h2>
          <p className="mt-1 text-xs text-warm-muted sm:text-sm">{subtitle}</p>
        </div>

        <div className="hidden shrink-0 gap-2 sm:flex">
          <button
            type="button"
            aria-label="Previous products"
            onClick={() => scroll(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-warm-border bg-warm-surface text-warm-fg transition-colors hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
          >
            <CaretLeft size={18} weight="bold" />
          </button>
          <button
            type="button"
            aria-label="Next products"
            onClick={() => scroll(1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-warm-border bg-warm-surface text-warm-fg transition-colors hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
          >
            <CaretRight size={18} weight="bold" />
          </button>
        </div>
      </div>

      <div
        id={`themed-reel-${id}`}
        role="region"
        aria-label={`${title} products`}
        className="themed-reel scrollbar-hide mt-5"
      >
        {picks.map((product, index) => (
          <div key={product.id} className="themed-slide">
            <CompactProductCard
              product={product}
              index={index}
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="themed-scroll-track h-1 flex-1 overflow-hidden rounded-full bg-warm-border">
          <div
            id={`themed-scroll-thumb-${id}`}
            className="h-full rounded-full bg-warm-accent transition-transform"
            style={{
              width: `${Math.max(10, Math.min(100, (100 / picks.length) * (Math.min(picks.length, 4))))}%`,
            }}
          />
        </div>
        <span className="text-xs font-semibold text-warm-muted" aria-hidden="true">
          {picks.length} items
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:hidden">
          <button
            type="button"
            aria-label="Previous products"
            onClick={() => scroll(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-warm-border bg-warm-surface text-warm-fg transition-colors hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
          >
            <CaretLeft size={18} weight="bold" />
          </button>
          <button
            type="button"
            aria-label="Next products"
            onClick={() => scroll(1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-warm-border bg-warm-surface text-warm-fg transition-colors hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
          >
            <CaretRight size={18} weight="bold" />
          </button>
        </div>

        <Link
          href={ctaHref}
          className="inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-extrabold transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
          style={{ color: theme === 'deals' ? 'var(--color-danger)' : 'var(--color-accent-dark)' }}
        >
          {ctaLabel}
          <CaretRight size={16} weight="bold" className="ml-1" />
        </Link>
      </div>

      <style>{`
        .themed-reel {
          display: flex;
          gap: 0.75rem;
          overflow-x: auto;
          overscroll-behavior-inline: contain;
          padding: 0.25rem 0.125rem 0.75rem;
          scroll-snap-type: inline mandatory;
        }
        .themed-reel:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 4px;
        }
        .themed-slide {
          flex: 0 0 min(46vw, 11rem);
          scroll-snap-align: start;
        }
        @media (min-width: 640px) {
          .themed-slide {
            flex: 0 0 calc((100% - 1.5rem) / 3);
          }
        }
        @media (min-width: 1024px) {
          .themed-slide {
            flex: 0 0 calc((100% - 2.25rem) / 4);
          }
        }
      `}</style>
    </section>
  );
}
