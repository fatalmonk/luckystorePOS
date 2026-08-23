'use client';

import React from 'react';
import Image from 'next/image';
import { MarketPanel } from './ui/MarketSurface';
import { HeroDiscoveryRail } from './ui/HeroFloatingCard';
import type { Product } from '../lib/types';

interface CampaignGridProps {
  products: Product[];
}

export function CampaignGrid({ products }: CampaignGridProps) {
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
      tone="accent"
      className="campaign-hero relative w-full overflow-hidden rounded-warm-panel border border-warm-accent/20 p-4 shadow-warm-panel sm:p-8 lg:p-10"
    >
      <span className="campaign-spine" aria-hidden="true">Everyday</span>
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-start gap-6">
        <div className="grid w-full grid-cols-[minmax(0,1fr)_6rem] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_10rem] sm:gap-5 md:grid-cols-[minmax(0,1fr)_13rem] md:gap-6 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:gap-10">
          <div className="campaign-copy relative max-w-3xl text-left">
            <h2
              id="campaign-hero-title"
              className="campaign-headline campaign-display max-w-3xl text-balance text-[1.4rem] font-black leading-[1.02] tracking-tight sm:mt-2 sm:text-4xl sm:leading-[1.05] lg:text-5xl"
            >
              Daily essentials from a store Chittagong knows.
            </h2>
            <p className="campaign-on-image-muted mt-2 max-w-2xl text-xs leading-5 sm:mt-4 sm:text-base sm:leading-7">
              Pantry staples, snacks, dairy, and household essentials, delivered right to your doorstep.
            </p>
          </div>

          <div
            className="relative ml-auto h-24 w-24 sm:h-40 sm:w-40 md:h-48 md:w-48 lg:mx-0 lg:h-56 lg:w-auto"
            aria-label="A basket of everyday Lucky Store groceries"
          >
            <Image
              src="/images/hero-grocery-basket.webp"
              alt="A yellow basket filled with everyday Lucky Store groceries"
              fill
              priority
              sizes="224px"
              className="object-contain object-center"
            />
          </div>
        </div>

        <div className="w-full min-w-0">
          <HeroDiscoveryRail
            products={isOrganic ? organicMatches : products}
            title={isOrganic ? 'Search organic staples' : 'Quick picks from today'}
          />
        </div>
      </div>
    </MarketPanel>
  );
}
