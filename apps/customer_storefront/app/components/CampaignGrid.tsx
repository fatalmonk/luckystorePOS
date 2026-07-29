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
      kicker: 'Everyday essentials',
      title: 'The neighborhood aisle',
      description: 'Pantry favorites and daily essentials from a Chittagong original.',
      image: responsiveHeroBanner('promo_welcome_v2', ''),
      imagePosition: 'object-[60%_54%]',
    },
    {
      href: '/search?q=buldak',
      label: 'Shop Buldak ramen deals',
      kicker: 'Hot & spicy',
      title: 'Buldak, turned up',
      description: 'A fiery favorite with a deal worth discovering.',
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
      kicker: 'Everyday staples',
      title: 'Start with the staples',
      description: 'Milk, eggs, and dairy for the everyday kitchen.',
      image: responsiveHeroBanner('promo_dairy', ''),
      imagePosition: 'object-[54%_52%]',
    },
    {
      href: '/category/tea-&-coffee',
      label: 'Shop tea and coffee',
      kicker: 'Tea & coffee',
      title: 'Make room for a pause',
      description: 'Tea and coffee selections from the online shelf.',
      image: responsiveHeroBanner('promo_tea_coffee', ''),
      imagePosition: 'object-[50%_48%]',
    },
  ];

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
      className="campaign-hero rounded-[28px]"
    >
      <span className="campaign-spine" aria-hidden="true">Everyday</span>
      <div className="relative z-10 grid gap-9 px-5 py-7 sm:px-8 sm:py-10 lg:grid-cols-[minmax(280px,0.76fr)_minmax(0,1.5fr)] lg:items-center lg:gap-12 lg:px-12 lg:py-12">
        <div className="campaign-copy max-w-xl">
          <p className="campaign-kicker">Chittagong · Since 1947</p>
          <h2
            id="campaign-hero-title"
            className="campaign-headline campaign-display mt-3 text-balance text-[2.35rem] font-black leading-[0.96] tracking-[-0.04em] sm:text-5xl lg:text-[3.65rem]"
          >
            Your neighborhood grocer, one scroll away.
          </h2>
          <p className="campaign-on-image-muted mt-4 max-w-lg text-sm leading-6 sm:text-base sm:leading-7">
            Turn the aisle, discover what&apos;s fresh, and get everyday essentials delivered
            across Chittagong.
          </p>

          <div className="campaign-status-row mt-5 flex flex-wrap gap-2" aria-label="Store service status">
            <span className="campaign-status-badge">
              <span aria-hidden="true">⚡</span>
              15-min express
            </span>
            <span className="campaign-status-badge">
              <span aria-hidden="true">🛡️</span>
              Verified inventory
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
            <Link
              href="#how-it-works"
              className={`campaign-secondary-action inline-flex min-h-11 items-center justify-center rounded-full border px-5 py-2.5 text-sm font-bold transition-colors ${campaignFocusRing}`}
            >
              How delivery works
            </Link>
          </div>
        </div>

        <div className="campaign-rail min-w-0">
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="campaign-kicker">The current shelf</p>
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
                        sizes="(max-width: 639px) 82vw, (max-width: 1023px) 56vw, 36vw"
                        alt=""
                        className={`h-full w-full object-contain p-[10%] transition-transform duration-700 ease-out group-hover:scale-[1.025] sm:p-[12%] ${campaign.imagePosition}`}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        fetchPriority={index === 0 ? 'high' : 'auto'}
                      />
                    </picture>
                    <div className="campaign-card-content relative z-10 m-4 mt-auto w-[calc(100%-2rem)] rounded-[18px] p-4 sm:m-5 sm:w-[calc(100%-2.5rem)] sm:p-5">
                      <p className="campaign-kicker">{campaign.kicker}</p>
                      <h3 className="campaign-on-image mt-1 text-xl font-black tracking-[-0.02em] sm:text-2xl">
                        {campaign.title}
                      </h3>
                      <p className="campaign-on-image-muted mt-1.5 hidden max-w-sm text-xs leading-5 sm:block sm:text-sm sm:leading-6">
                        {campaign.description}
                      </p>
                      <span className="campaign-card-action mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold">
                        Explore
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
