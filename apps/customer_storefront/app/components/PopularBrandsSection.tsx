'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react';
import { POPULAR_BRANDS } from '../lib/brandsData';
import { withLocale, type Locale } from '../lib/i18n/config';
import { getDictionary } from '../lib/i18n/dictionaries';

export interface PopularBrandsSectionProps {
  locale?: Locale;
}

export function PopularBrandsSection({ locale = 'en' }: PopularBrandsSectionProps) {
  const dict = getDictionary(locale);
  const isBn = locale === 'bn';
  const displayedBrands = POPULAR_BRANDS.slice(0, 12);
  const allBrandsHref = withLocale('/brand', locale);
  const resolvedSeeAll = dict.reels.seeAll;

  return (
    <section aria-labelledby="popular-brands-title" className="py-1">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2
            id="popular-brands-title"
            className="text-balance text-lg font-black leading-tight tracking-tight text-warm-fg sm:text-xl"
          >
            {dict.reels.brandsTitle}
          </h2>
          <p className="mt-0.5 text-xs text-warm-muted sm:text-sm truncate">
            {dict.reels.brandsSubtitle}
          </p>
        </div>
        <Link
          href={allBrandsHref}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-warm-border bg-warm-surface text-warm-muted transition-colors hover:bg-warm-bg hover:text-warm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
          aria-label={`${resolvedSeeAll} — ${dict.reels.brandsTitle}`}
        >
          <CaretRight size={18} weight="bold" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {displayedBrands.map((b) => {
          const brandHref = withLocale(`/brand/${b.slug}`, locale);
          const primaryName = isBn ? b.bengaliName : b.name;
          const secondaryName = isBn ? b.name : b.bengaliName;
          const badgeText = isBn ? b.badgeBn : b.badgeEn;

          return (
            <Link
              key={b.slug}
              href={brandHref}
              className="group relative flex flex-col justify-between rounded-warm-card border border-warm-border bg-warm-surface p-3 sm:p-3.5 transition-all hover:border-warm-accent hover:shadow-warm-sm hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            >
              <div>
                <div className="relative mb-2.5 flex h-14 w-full items-center justify-center overflow-hidden rounded-warm-control border border-warm-border/60 bg-warm-image-well transition-colors group-hover:border-warm-accent/50">
                  {b.logoUrl ? (
                    <Image
                      src={b.logoUrl}
                      alt={`${primaryName} logo`}
                      fill
                      sizes="(max-width: 640px) 140px, (max-width: 1024px) 180px, 160px"
                      className="object-contain p-2.5 transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-xs font-black uppercase tracking-wider text-warm-muted">
                      {primaryName.slice(0, 2)}
                    </span>
                  )}
                </div>
                <span className="inline-block rounded-full bg-warm-image-well px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider text-warm-muted group-hover:text-warm-fg transition-colors truncate max-w-full">
                  {badgeText}
                </span>
                <h3 className="mt-1.5 text-sm sm:text-base font-black text-warm-fg group-hover:text-warm-accent transition-colors">
                  {primaryName}
                </h3>
                <p className="text-xs font-semibold text-warm-muted truncate">
                  {secondaryName}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-warm-border/50 flex items-center justify-between text-xs font-extrabold text-warm-muted group-hover:text-warm-fg transition-colors">
                <span>{isBn ? 'পণ্য দেখুন' : 'Explore'}</span>
                <span className="text-warm-accent font-black transition-transform group-hover:translate-x-1" aria-hidden="true">
                  →
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-3 text-center sm:text-right">
        <Link
          href={allBrandsHref}
          className="inline-flex items-center gap-1.5 text-xs font-black text-warm-fg hover:text-warm-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent rounded-sm py-1 px-1.5"
        >
          <span>{isBn ? `সকল ${POPULAR_BRANDS.length}টি ব্র্যান্ড দেখুন` : `View all ${POPULAR_BRANDS.length} authentic brands`}</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
