'use client';

import React from 'react';
import Link from 'next/link';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { ProductImage } from '../product/ProductImage';
import { formatBdt } from '../../lib/formatPrice';
import { toProductSlug } from '../../lib/products/slugify';
import type { Product } from '../../lib/types';

import { withLocale, type Locale } from '../../lib/i18n/config';
import { getDictionary } from '../../lib/i18n/dictionaries';

export interface HeroDiscoveryRailProps {
  products: Product[];
  title?: string;
  locale?: Locale;
}

export function HeroDiscoveryRail({
  products,
  title,
  locale = 'en',
}: HeroDiscoveryRailProps) {
  const dict = getDictionary(locale);
  const discoveryTitle = title ?? dict.campaign.discoveryTitle;
  const picks = products.filter((product) => product.stock > 0).slice(0, 8);
  const chips = dict.campaign.searchChips;

  return (
    <div className="hero-discovery flex min-w-0 flex-col gap-4">
      <form
        action={withLocale('/category', locale)}
        className="group/search relative"
        role="search"
        aria-label="Search groceries"
      >
        <MagnifyingGlass
          size={20}
          weight="bold"
          className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-warm-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          name="q"
          aria-label={dict.campaign.searchPlaceholder}
          placeholder={dict.campaign.searchPlaceholder}
          className="h-14 w-full rounded-warm-panel border border-warm-image-well-border bg-warm-bg pl-12 pr-4 text-base font-semibold text-warm-fg shadow-warm-card transition-colors placeholder:text-warm-muted hover:border-warm-accent/60 focus-visible:border-warm-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent/40"
        />
      </form>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" aria-label="Suggested grocery searches">
        {chips.map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            className="inline-flex min-h-11 shrink-0 items-center rounded-warm-control border border-warm-image-well-border bg-warm-image-well px-4 text-sm font-extrabold text-warm-fg transition-colors hover:border-warm-accent hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
          >
            {label}
          </Link>
        ))}
      </div>


      {picks.length > 0 ? (
        <section aria-labelledby="hero-discovery-title" className="min-w-0">
          <div className="mb-2 flex items-end justify-between gap-3">
            <h2 id="hero-discovery-title" className="text-sm font-black text-warm-fg">
              {discoveryTitle}
            </h2>
            <Link
              href={withLocale('/category', locale)}
              className="inline-flex min-h-11 items-center text-sm font-extrabold text-warm-fg underline underline-offset-4 transition-colors hover:text-warm-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            >
              {dict.heritage.cta}
            </Link>
          </div>

          <div
            className="hero-product-strip flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-hide"
            aria-label={`${discoveryTitle} products`}
          >
            {picks.map((product, index) => (
              <Link
                key={product.id}
                href={withLocale(`/product/${toProductSlug(product.name, product.id)}`, locale)}
                className="group/product flex min-h-[13.5rem] w-[10.25rem] shrink-0 snap-start flex-col overflow-hidden rounded-warm-card border border-warm-image-well-border bg-warm-bg shadow-warm-card transition-transform motion-safe:hover:-translate-y-0.5 hover:shadow-warm-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              >
                <span className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden border-b border-warm-image-well-border bg-warm-image-well">
                  <ProductImage
                    src={product.image_url}
                    alt={product.name}
                    category={product.category}
                    sizes="164px"
                    imageClassName="product-image-on-well object-contain p-2"
                    priority={index === 0}
                    showLoadingState
                  />
                </span>
                <span className="flex flex-1 flex-col justify-between gap-2 p-3">
                  <span>
                    <span className="line-clamp-2 text-sm font-bold leading-5 text-warm-fg">
                      {product.name}
                    </span>
                    <span className="mt-1 block truncate text-xs text-warm-muted">{product.unit}</span>
                  </span>
                  <span className="font-mono text-base font-black tabular-nums text-warm-fg">
                    {formatBdt(product.price)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
