'use client';

import React from 'react';
import Image from 'next/image';
import { MarketPanel } from './ui/MarketSurface';
import { HeroDiscoveryRail } from './ui/HeroFloatingCard';
import type { Product } from '../lib/types';
import type { Locale } from '../lib/i18n/config';
import { getDictionary } from '../lib/i18n/dictionaries';

interface CampaignGridProps {
  products: Product[];
  locale?: Locale;
}

export function CampaignGrid({ products, locale = 'en' }: CampaignGridProps) {
  const dict = getDictionary(locale);
  const organicMatches = products.filter(
    (p) =>
      p.name.toLowerCase().includes('organic') ||
      p.description?.toLowerCase().includes('organic') ||
      p.category?.toLowerCase().includes('organic'),
  );
  const isOrganic = organicMatches.length >= 4;

  return (
    <MarketPanel
      aria-labelledby="campaign-hero-title"
      tone="paper"
      className="campaign-hero relative w-full overflow-hidden rounded-warm-panel border border-warm-border p-4 shadow-warm-panel sm:p-8 lg:p-10"
    >
      <span className="campaign-spine" aria-hidden="true">{dict.campaign.spine}</span>
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-start gap-6">
        <div className="grid w-full grid-cols-[minmax(0,1fr)_6rem] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_10rem] sm:gap-5 md:grid-cols-[minmax(0,1fr)_13rem] md:gap-6 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:gap-10">
          <div className="campaign-copy relative max-w-3xl text-left">
            <h2
              id="campaign-hero-title"
              className="campaign-headline campaign-display max-w-3xl text-balance text-[1.4rem] font-black leading-[1.02] tracking-tight sm:mt-2 sm:text-4xl sm:leading-[1.05] lg:text-5xl"
            >
              {dict.campaign.headline}
            </h2>
            <p className="campaign-on-image-muted mt-2 max-w-2xl text-xs leading-5 sm:mt-4 sm:text-base sm:leading-7">
              <span className="sm:hidden">{dict.campaign.subtitleShort}</span>
              <span className="hidden sm:inline">{dict.campaign.subtitleLong}</span>
            </p>
          </div>


          <div
            role="img"
            aria-label={dict.campaign.basketAlt}
            className="relative ml-auto h-24 w-24 sm:h-40 sm:w-40 md:h-48 md:w-48 lg:mx-0 lg:h-56 lg:w-auto"
          >
            <Image
              src="/images/hero-grocery-basket.webp"
              alt={dict.campaign.basketAlt}
              fill
              priority
              sizes="(max-width: 639px) 96px, (max-width: 767px) 160px, (max-width: 1023px) 192px, 224px"
              className="object-contain object-center"
            />
          </div>
        </div>

        <div className="w-full min-w-0">
          <HeroDiscoveryRail
            products={isOrganic ? organicMatches : products}
            title={isOrganic ? dict.campaign.organicTitle : dict.campaign.discoveryTitle}
            locale={locale}
          />
        </div>
      </div>
    </MarketPanel>
  );
}
