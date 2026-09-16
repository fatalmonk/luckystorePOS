'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react';
import { GridProductCard } from './GridProductCard';
import type { Product } from '../lib/types';
import { trackViewItemList } from '../lib/analytics';

import type { Locale } from '../lib/i18n/config';

export interface ProductGridSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  products: Product[];
  ctaLabel?: string;
  ctaHref?: string;
  locale?: Locale;
}

export function ProductGridSection({
  id,
  title,
  subtitle,
  products,
  ctaLabel,
  ctaHref = '/category',
  locale = 'en',
}: ProductGridSectionProps) {
  const resolvedCtaLabel = ctaLabel ?? (locale === 'bn' ? 'সব দেখুন' : 'See all');

  useEffect(() => {
    trackViewItemList(products, id, title);
  }, [id, products, title]);

  if (products.length === 0) return null;

  return (
    <section aria-labelledby={`grid-section-title-${id}`} className="py-1">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2
            id={`grid-section-title-${id}`}
            className="text-balance text-lg font-black leading-tight tracking-tight text-warm-fg sm:text-xl"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-warm-muted sm:text-sm truncate">{subtitle}</p>
          )}
        </div>
        <Link
          href={ctaHref}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-warm-border bg-warm-surface text-warm-muted transition-colors hover:bg-warm-bg hover:text-warm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
          aria-label={`${resolvedCtaLabel} — ${title}`}
        >
          <CaretRight size={18} weight="bold" aria-hidden="true" />
        </Link>
      </div>

      <div
        id={`grid-reel-${id}`}
        role="region"
        aria-label={`${title} products`}
        className="grid-reel scrollbar-hide"
      >
        {products.map((product, index) => (
          <div key={product.id} className="grid-slide">
            <GridProductCard
              product={product}
              priority={index === 0}
              listId={id}
              listName={title}
              index={index}
              locale={locale}
            />
          </div>
        ))}
      </div>

    </section>
  );
}
