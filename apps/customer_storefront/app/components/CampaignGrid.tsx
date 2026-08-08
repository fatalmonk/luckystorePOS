'use client';

import React from 'react';
import Link from 'next/link';
import { ThemedProductRail } from './ThemedProductRail';
import { MarketPanel } from './ui/MarketSurface';
import type { Product } from '../lib/types';

const campaignFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-campaign-surface)]';

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${direction === 'left' ? 'rotate-180' : ''}`}
      fill="none"
    >
      <path
        d="M5 12h14m-5-5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
      className="campaign-hero relative w-full overflow-hidden rounded-3xl border border-warm-accent/20 bg-gradient-to-br from-warm-accent-muted/40 via-warm-surface to-warm-accent-muted/20 p-5 shadow-sm sm:p-8 lg:p-10"
    >
      <span className="campaign-spine" aria-hidden="true">Everyday</span>
      <div className="relative z-10 mx-auto grid w-full gap-5 lg:grid-cols-[minmax(280px,0.76fr)_minmax(0,1.5fr)] lg:items-center lg:gap-10">
        <div className="campaign-copy max-w-xl">
          <p className="campaign-kicker">Lucky Store · Chittagong</p>
          <h2
            id="campaign-hero-title"
            className="campaign-headline campaign-display mt-2 text-balance text-[1.55rem] font-black leading-[1.05] tracking-[-0.04em] sm:text-[2.5rem] lg:text-5xl"
          >
            Daily groceries from a store Chittagong knows.
          </h2>
          <p className="campaign-on-image-muted mt-3 max-w-lg text-sm leading-6 sm:mt-4 sm:text-base sm:leading-7">
            Pantry staples, snacks, dairy, and household essentials packed by Lucky Store.
          </p>

          <div className="campaign-status-row mt-3 flex flex-wrap gap-2 sm:mt-5" aria-label="Store service status">
            <span className="campaign-status-badge">
              <svg className="h-3.5 w-3.5" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              Stocked daily
            </span>
          </div>
          <Link href="/category" className={`mt-4 inline-flex min-h-11 items-center rounded-warm-md bg-warm-accent px-5 text-sm font-extrabold text-warm-accent-text transition-colors hover:bg-warm-accent-hover ${campaignFocusRing}`}>
            Shop groceries
          </Link>
        </div>

        <div className="campaign-rail min-w-0">
          <ThemedProductRail
            id="campaign-organic-goods"
            products={isOrganic ? organicMatches : products}
            title={isOrganic ? 'Healthy Living' : 'Pantry Staples'}
            subtitle={isOrganic ? 'Pure, organic food & wholesome natural groceries.' : 'Rice, grains, spices, oil & everyday cooking essentials.'}
            theme="pantry"
            ctaLabel={isOrganic ? 'Shop organic goods' : 'Shop pantry staples'}
            ctaHref={isOrganic ? '/category?search=organic' : '/category/cooking-essentials'}
          />
        </div>
      </div>
    </MarketPanel>
  );
}
