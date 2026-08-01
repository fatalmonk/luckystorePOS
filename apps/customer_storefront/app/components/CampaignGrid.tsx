'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { responsiveHeroBanner, type ResponsiveImage } from '../lib/imageUrl';
import { MarketPanel } from './ui/MarketSurface';

const campaignFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-campaign-surface)]';

interface Campaign {
  href: string;
  label: string;
  kicker: string;
  title: string;
  description: string;
  actionLabel: string;
  image: ResponsiveImage;
  imagePosition: string;
}

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

export function CampaignGrid() {
  const reelRef = useRef<HTMLDivElement>(null);

  const campaigns: Campaign[] = [
    {
      href: '/category',
      label: 'Explore everyday groceries',
      kicker: 'Everyday groceries',
      title: 'Everything for the everyday shop',
      description: 'Pantry staples, snacks, drinks, and household essentials in one place.',
      actionLabel: 'Shop essentials',
      image: responsiveHeroBanner('promo_welcome_v2', ''),
      imagePosition: 'object-[60%_54%]',
    },
    {
      href: '/search?q=buldak',
      label: 'Shop Buldak ramen deals',
      kicker: 'Hot & spicy',
      title: 'Bring the heat with Buldak',
      description: 'Find fiery ramen favorites and discover the latest Buldak offers.',
      actionLabel: 'Shop Buldak',
      image: responsiveHeroBanner('promo_buldak', '', [
        { fileWidth: 400 },
        { fileWidth: 600 },
        { fileWidth: 800 },
        { fileWidth: 1200, intrinsicWidth: 1024 },
      ]),
      imagePosition: 'object-[50%_58%]',
    },
    {
      href: '/category/dairy-and-eggs',
      label: 'Shop dairy and eggs',
      kicker: 'Milk, eggs & dairy',
      title: 'Stock the fridge',
      description: 'Shop milk, eggs, and dairy essentials for home.',
      actionLabel: 'Shop dairy',
      image: responsiveHeroBanner('promo_dairy', '', [
        { fileWidth: 400 },
        { fileWidth: 600 },
      ]),
      imagePosition: 'object-[54%_52%]',
    },
    {
      href: '/category/tea-&-coffee',
      label: 'Shop tea and coffee',
      kicker: 'Tea & coffee',
      title: 'Find your everyday cup',
      description: 'Browse tea, coffee, and familiar favorites for every break.',
      actionLabel: 'Shop tea & coffee',
      image: responsiveHeroBanner('promo_tea_coffee', ''),
      imagePosition: 'object-[50%_48%]',
    },
  ];
  const heroBackdrop = campaigns[0];

  const scrollReel = (direction: -1 | 1) => {
    const reel = reelRef.current;
    if (!reel) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    reel.scrollBy({
      left: direction * Math.max(reel.clientWidth * 0.72, 280),
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  const handleReelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    scrollReel(event.key === 'ArrowLeft' ? -1 : 1);
  };

  return (
    <MarketPanel
      aria-labelledby="campaign-hero-title"
      tone="night"
      className="campaign-hero relative left-1/2 w-screen max-w-none -translate-x-1/2 rounded-none border-x-0 lg:w-[calc(100vw-72px)]"
    >
      <picture className="campaign-hero-backdrop">
        {heroBackdrop.image.sources?.map((source) => (
          <source key={source.type} srcSet={source.srcSet} type={source.type} />
        ))}
        <img
          src={heroBackdrop.image.src}
          srcSet={heroBackdrop.image.srcSet}
          sizes="100vw"
          alt=""
          className={`h-full w-full object-cover ${heroBackdrop.imagePosition}`}
          loading="eager"
          fetchPriority="high"
        />
      </picture>
      <span className="campaign-spine" aria-hidden="true">Everyday</span>
      <div className="relative z-10 mx-auto grid w-full max-w-[1600px] gap-9 px-5 py-9 sm:px-8 sm:py-12 lg:grid-cols-[minmax(280px,0.76fr)_minmax(0,1.5fr)] lg:items-center lg:gap-12 lg:px-12 lg:py-16 xl:px-16">
        <div className="campaign-copy max-w-xl">
          <p className="campaign-kicker">Chittagong · Since 1947</p>
          <h2
            id="campaign-hero-title"
            className="campaign-headline campaign-display mt-3 text-balance text-[1.9rem] font-black leading-none tracking-[-0.04em] sm:text-[2.5rem] lg:text-5xl"
          >
            Groceries you know, delivered across Chittagong.
          </h2>
          <p className="campaign-on-image-muted mt-4 max-w-lg text-sm leading-6 sm:text-base sm:leading-7">
            Shop pantry staples, snacks, dairy, household essentials, and more from
            Lucky Store—serving Chittagong since 1947.
          </p>

          <div className="campaign-status-row mt-5 flex flex-wrap gap-2" aria-label="Store service status">
            <span className="campaign-status-badge">
              <span aria-hidden="true">🛡️</span>
              Stocked daily
            </span>
          </div>

          <div className="campaign-actions mt-7 flex flex-wrap gap-3">
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
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="campaign-kicker">Featured aisles</p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                aria-label="Previous campaign"
                onClick={() => scrollReel(-1)}
                className={`campaign-reel-control grid h-11 w-11 place-items-center rounded-full border transition-colors ${campaignFocusRing}`}
              >
                <ArrowIcon direction="left" />
              </button>
              <button
                type="button"
                aria-label="Next campaign"
                onClick={() => scrollReel(1)}
                className={`campaign-reel-control grid h-11 w-11 place-items-center rounded-full border transition-colors ${campaignFocusRing}`}
              >
                <ArrowIcon direction="right" />
              </button>
            </div>
          </div>

          <div className="campaign-stage">
            <div
              ref={reelRef}
              role="region"
              aria-label="Featured campaign carousel"
              tabIndex={0}
              onKeyDown={handleReelKeyDown}
              className={`campaign-reel scrollbar-hide ${campaignFocusRing}`}
            >
              {campaigns.map((campaign, index) => (
                <article key={campaign.href} className="campaign-reel-card">
                  <Link
                    href={campaign.href}
                    aria-label={campaign.label}
                    className={`campaign-card-link group relative flex aspect-video w-full overflow-hidden rounded-[22px] ${campaignFocusRing}`}
                  >
                    <picture className="campaign-card-picture absolute inset-0">
                      {campaign.image.sources?.map((source) => (
                        <source key={source.type} srcSet={source.srcSet} type={source.type} />
                      ))}
                      <img
                        src={campaign.image.src}
                        srcSet={campaign.image.srcSet}
                        sizes="(max-width: 639px) 82vw, (max-width: 1023px) 56vw, 42vw"
                        alt=""
                        className={`h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025] ${campaign.imagePosition}`}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        fetchPriority={index === 0 ? 'high' : 'auto'}
                      />
                    </picture>
                    <div className="campaign-card-content relative z-10 m-3 mt-auto max-w-[78%] self-end rounded-[14px] p-3 sm:m-4 sm:max-w-[72%] sm:p-4">
                      <p className="campaign-kicker">{campaign.kicker}</p>
                      <h3 className="campaign-on-image mt-1 text-xl font-black tracking-[-0.02em] sm:text-2xl">
                        {campaign.title}
                      </h3>
                      <p className="campaign-on-image-muted mt-1.5 hidden max-w-sm text-xs leading-5 sm:block sm:text-sm sm:leading-6">
                        {campaign.description}
                      </p>
                      <span className="campaign-card-action mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold">
                        {campaign.actionLabel}
                        <ArrowIcon direction="right" />
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="campaign-reel-status flex min-w-0 flex-1 items-center gap-3" aria-hidden="true">
              <span>1947</span>
              <span className="h-px flex-1 bg-[var(--color-campaign-border)]" />
              <span>Chittagong</span>
            </div>
          </div>
        </div>
      </div>
    </MarketPanel>
  );
}
