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
  return (
    <MarketPanel
      aria-labelledby="campaign-hero-title"
      tone="night"
      className="campaign-hero relative left-1/2 w-screen max-w-none -translate-x-1/2 rounded-none border-x-0 lg:w-[calc(100vw-72px)]"
    >
      <span className="campaign-spine" aria-hidden="true">Everyday</span>
      <div className="relative z-10 mx-auto grid w-full max-w-[1600px] gap-5 px-4 py-6 sm:gap-9 sm:px-8 sm:py-12 lg:grid-cols-[minmax(280px,0.76fr)_minmax(0,1.5fr)] lg:items-center lg:gap-12 lg:px-12 lg:py-16 xl:px-16">
        <div className="campaign-copy max-w-xl">
          <p className="campaign-kicker">Chittagong · Since 1947</p>
          <h2
            id="campaign-hero-title"
            className="campaign-headline campaign-display mt-2 text-balance text-[1.55rem] font-black leading-[1.05] tracking-[-0.04em] sm:text-[2.5rem] lg:text-5xl"
          >
            Groceries you know, delivered across Chittagong.
          </h2>
          <p className="campaign-on-image-muted mt-3 max-w-lg text-sm leading-6 sm:mt-4 sm:text-base sm:leading-7">
            Shop pantry staples, snacks, dairy, household essentials, and more from
            Lucky Store—serving Chittagong since 1947.
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

          <div className="campaign-actions mt-5 flex flex-wrap gap-3 sm:mt-7">
            <Link
              href="/category"
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-warm-accent px-5 py-2.5 text-sm font-extrabold text-warm-accent-text transition-colors hover:bg-warm-accent-hover ${campaignFocusRing}`}
            >
              Browse groceries
              <ArrowIcon direction="right" />
            </Link>
          </div>
        </div>

        <div className="campaign-rail min-w-0">
          <ThemedProductRail
            id="campaign-tea-coffee"
            products={products}
            title="Tea & Coffee"
            subtitle="Your everyday cup—tea, coffee, and familiar favorites."
            theme="morning"
            ctaLabel="Shop tea & coffee"
            ctaHref="/category/tea-&-coffee"
          />
        </div>
      </div>
    </MarketPanel>
  );
}
