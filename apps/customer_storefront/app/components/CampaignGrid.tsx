'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MapPin } from '@phosphor-icons/react';
import { MarketPanel } from './ui/MarketSurface';
import { HeroDiscoveryRail } from './ui/HeroFloatingCard';
import type { Product } from '../lib/types';
import type { Locale } from '../lib/i18n/config';
import { getDictionary } from '../lib/i18n/dictionaries';
import { withLocale } from '../lib/i18n/config';

interface CampaignGridProps {
  products: Product[];
  locale?: Locale;
}

/** Renders the localized campaign hero, delivery details, and discovery rail for the supplied products. */
export function CampaignGrid({ products, locale = 'en' }: CampaignGridProps) {
  const dict = getDictionary(locale);
  const organicMatches = products.filter(
    (p) => p.name.toLowerCase().includes('organic') ||
      p.description?.toLowerCase().includes('organic') ||
      p.category?.toLowerCase().includes('organic'),
  );
  const isOrganic = organicMatches.length >= 4;

  return (
    <MarketPanel aria-labelledby="campaign-hero-title" tone="paper" className="campaign-hero relative w-full border-0 bg-transparent shadow-none">
      <div className="flex w-full flex-col gap-4 sm:gap-6">
        <div className="campaign-feature text-[#153d29] relative isolate min-h-[17rem] overflow-hidden rounded-2xl bg-[#ffedb4] sm:min-h-[20rem] lg:min-h-[24rem] xl:min-h-[26rem]">
          <div role="img" aria-label={dict.campaign.basketAlt} className="absolute inset-0 -z-20">
            <Image
              src="/images/hero-reference.webp"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-[82%_center] sm:object-center"
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
              <h1 id="campaign-hero-title" className="campaign-display font-serif text-balance text-[clamp(2rem,4.5vw,3.75rem)] font-semibold leading-[1.12] tracking-tight text-[#153d29] [&:lang(bn)]:tracking-normal">
                {dict.campaign.headline}
              </h1>
              <p className="mt-3 max-w-[46ch] text-pretty text-sm leading-relaxed text-[#283d30] lg:text-base">
                <span className="sm:hidden">{dict.campaign.subtitleShort}</span>
                <span className="hidden sm:inline">{dict.campaign.subtitleLong}</span>
              </p>
            </div>

            <div className="relative mt-5 flex items-center gap-2 sm:mt-7 sm:gap-3">
              <Link
                href={withLocale('/category', locale)}
                data-cro="hero-primary-cta"
                className="store-press inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#003d24] px-3 text-xs font-bold text-white hover:bg-[#075333] sm:px-5 sm:text-sm"
              >
                {dict.campaign.primaryCta}
                <ArrowRight className="hidden sm:block" size={18} aria-hidden="true" />
              </Link>
              <Link
                href={withLocale('/delivery', locale)}
                data-cro="hero-delivery-eligibility"
                className="store-press inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#315039]/40 bg-[#fff7df] px-3 text-xs font-semibold text-[#153d29] sm:px-5 sm:text-sm"
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
        />
      </div>
    </MarketPanel>
  );
}
