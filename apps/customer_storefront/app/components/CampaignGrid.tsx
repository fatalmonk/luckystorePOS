'use client';

import React, { useState } from 'react';
import { preload } from 'react-dom';
import { buildOptimizedImageUrl } from '../lib/image-loader';
import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { MapPin } from '@phosphor-icons/react/dist/csr/MapPin';
import { MarketPanel } from './ui/MarketSurface';
import { HeroDiscoveryRail } from './ui/HeroFloatingCard';
import type { Product } from '../lib/types';
import type { Locale } from '../lib/i18n/config';
import { getDictionary } from '../lib/i18n/dictionaries';
import { withLocale } from '../lib/i18n/config';

const CAMPAIGN_HERO_PATH = '/images/hero-reference.webp';
const CAMPAIGN_HERO_SIZES = '(max-width: 1280px) 100vw, 1280px';
const CAMPAIGN_HERO_WIDTHS = [480, 640, 828, 1080, 1280, 1600];
const RESIZE_CAMPAIGN_HERO = process.env.NEXT_PUBLIC_IMAGE_RESIZE === '1';
const CAMPAIGN_HERO_SRC = RESIZE_CAMPAIGN_HERO
  ? buildOptimizedImageUrl(CAMPAIGN_HERO_PATH, 1280, 75, { resize: true })
  : CAMPAIGN_HERO_PATH;
const CAMPAIGN_HERO_SRC_SET = RESIZE_CAMPAIGN_HERO
  ? CAMPAIGN_HERO_WIDTHS
    .map((width) => `${buildOptimizedImageUrl(CAMPAIGN_HERO_PATH, width, 75, { resize: true })} ${width}w`)
    .join(', ')
  : undefined;

interface CampaignGridProps {
  products: Product[];
  locale?: Locale;
}

/** Renders the localized campaign hero, delivery details, and discovery rail for the supplied products. */
export function CampaignGrid({ products, locale = 'en' }: CampaignGridProps) {
  preload(CAMPAIGN_HERO_SRC, {
    as: 'image',
    imageSrcSet: CAMPAIGN_HERO_SRC_SET,
    imageSizes: CAMPAIGN_HERO_SIZES,
    fetchPriority: 'high',
  });
  const dict = getDictionary(locale);
  const [searchQuery, setSearchQuery] = useState('');
  const organicMatches = products.filter(
    (p) => p.name.toLowerCase().includes('organic') ||
      p.description?.toLowerCase().includes('organic') ||
      p.category?.toLowerCase().includes('organic'),
  );
  const isOrganic = organicMatches.length >= 4;

  return (
    <MarketPanel aria-labelledby="campaign-hero-title" tone="paper" className="campaign-hero relative w-full border-0 bg-transparent shadow-none">
      <div className="flex w-full flex-col gap-4 sm:gap-6">
        <div className="campaign-feature relative isolate min-h-[17rem] overflow-hidden rounded-2xl bg-[var(--color-campaign-surface-feature)] text-[var(--color-campaign-ink)] sm:min-h-[20rem] lg:min-h-[24rem] xl:min-h-[26rem]">
          <div role="img" aria-label={dict.campaign.basketAlt} className="absolute inset-0 -z-20">
            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudflare variants keep the priority hero right-sized at each viewport. */}
            <img
              src={CAMPAIGN_HERO_SRC}
              srcSet={CAMPAIGN_HERO_SRC_SET}
              sizes={CAMPAIGN_HERO_SIZES}
              width={1600}
              height={696}
              alt=""
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-[82%_center] sm:object-center"
            />
          </div>
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,237,180,0.96)_0%,rgba(255,237,180,0.88)_55%,rgba(255,237,180,0.4)_100%)] sm:bg-[linear-gradient(90deg,#ffedb4_0%,#ffedb4_44%,rgba(255,237,180,0.85)_53%,rgba(255,237,180,0)_72%)] lg:bg-[linear-gradient(90deg,rgba(255,237,180,0.9)_0%,rgba(255,237,180,0.96)_12%,#ffedb4_27%,rgba(255,237,180,0.9)_38%,rgba(255,237,180,0)_58%,rgba(255,237,180,0.08)_78%,rgba(255,237,180,0.38)_100%)]" aria-hidden="true" />

          <div className="relative flex min-h-[17rem] flex-col justify-center px-4 py-6 min-[640px]:min-h-[20rem] min-[640px]:px-8 min-[640px]:py-9 lg:min-h-[24rem] lg:px-10 xl:min-h-[26rem]">
            <div className="campaign-copy w-full sm:w-[58%] lg:max-w-[38rem]">
              <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium uppercase tracking-[0.08em] min-[640px]:mb-5 min-[640px]:gap-2 min-[640px]:tracking-[0.16em]">
                {locale === 'bn' ? (
                  <>
                    <span>{dict.campaign.spine}</span>
                    <span aria-hidden="true">·</span>
                    <span>Lucky Store</span>
                  </>
                ) : (
                  <>
                    <span>Your Neighborhood Family Grocer</span>
                    <span aria-hidden="true">·</span>
                    <span>Est. 1947</span>
                  </>
                )}
              </p>
              <h1 id="campaign-hero-title" className="campaign-display font-serif text-balance text-[clamp(2rem,4.5vw,3.75rem)] font-semibold leading-[1.12] tracking-tight text-[var(--color-campaign-ink)] [&:lang(bn)]:tracking-normal">
                {dict.campaign.headline}
              </h1>
              <p className="mt-3 max-w-[46ch] text-pretty text-sm leading-relaxed text-[var(--color-campaign-ink-muted)] lg:text-base">
                <span className="sm:hidden">{dict.campaign.subtitleShort}</span>
                <span className="hidden sm:inline">{dict.campaign.subtitleLong}</span>
              </p>
            </div>

            <form
              action={withLocale('/category', locale)}
              role="search"
              aria-label={dict.campaign.searchLabel}
              className="relative mt-4 w-full max-w-[30rem]"
            >
              <MagnifyingGlass
                size={20}
                weight="bold"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-campaign-ink-muted)]"
                aria-hidden="true"
              />
              <input
                type="search"
                name="q"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label={dict.campaign.searchPlaceholder}
                placeholder={dict.campaign.searchPlaceholder}
                className="h-12 w-full rounded-full border border-[var(--color-campaign-delivery-control-border)] bg-[var(--color-campaign-delivery-control)] pl-12 pr-4 text-sm font-semibold text-[var(--color-campaign-ink)] shadow-warm-card placeholder:text-[var(--color-campaign-ink-muted)] transition-colors hover:border-warm-accent/70 focus-visible:border-warm-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent/40"
              />
            </form>

            <div className="relative mt-5 flex items-center gap-2 sm:mt-7 sm:gap-3">
              <Link
                href={withLocale('/category', locale)}
                data-cro="hero-primary-cta"
                className="store-press inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--color-campaign-action)] px-3 text-xs font-bold text-white transition-[background-color,transform] hover:bg-[var(--color-campaign-action-hover)] motion-safe:active:scale-[0.96] sm:px-5 sm:text-sm"
              >
                {dict.campaign.primaryCta}
                <ArrowRight className="hidden sm:block" size={18} aria-hidden="true" />
              </Link>
              <Link
                href={withLocale('/delivery', locale)}
                data-cro="hero-delivery-eligibility"
                className="store-press inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[var(--color-campaign-delivery-control-border)] bg-[var(--color-campaign-delivery-control)] px-3 text-xs font-semibold text-[var(--color-campaign-ink)] transition-[background-color,transform] motion-safe:active:scale-[0.96] sm:px-5 sm:text-sm"
              >
                <MapPin className="hidden sm:block" size={17} aria-hidden="true" />
                {dict.campaign.deliveryCta}
              </Link>
            </div>
          </div>
        </div>

        <HeroDiscoveryRail
          products={isOrganic ? organicMatches : products}
          title={isOrganic ? dict.campaign.organicTitle : dict.campaign.discoveryTitle}
          locale={locale}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          hideInlineSearch
        />
      </div>
    </MarketPanel>
  );
}
