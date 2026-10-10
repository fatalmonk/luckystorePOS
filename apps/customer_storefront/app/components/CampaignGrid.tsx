'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Gift, MapPin, ShieldCheck, Truck } from 'lucide-react';
import { MarketPanel } from './ui/MarketSurface';
import { HeroDiscoveryRail } from './ui/HeroFloatingCard';
import { HomeCategoryBanners } from './HomePromoBanners';
import type { Product } from '../lib/types';
import type { Locale } from '../lib/i18n/config';
import { getDictionary } from '../lib/i18n/dictionaries';
import { withLocale } from '../lib/i18n/config';
import { DELIVERY_POLICY } from '../lib/deliveryData';

interface CampaignGridProps {
  products: Product[];
  locale?: Locale;
}

export function CampaignGrid({ products, locale = 'en' }: CampaignGridProps) {
  const dict = getDictionary(locale);
  const bn = locale === 'bn';
  const organicMatches = products.filter(
    (p) => p.name.toLowerCase().includes('organic') ||
      p.description?.toLowerCase().includes('organic') ||
      p.category?.toLowerCase().includes('organic'),
  );
  const isOrganic = organicMatches.length >= 4;
  const radius = DELIVERY_POLICY.radiusKm.toLocaleString(bn ? 'bn-BD' : 'en');
  const threshold = DELIVERY_POLICY.freeDeliveryThresholdBdt.toLocaleString(bn ? 'bn-BD' : 'en');
  const reassurance = [
    { icon: Truck, text: bn ? `চকবাজার থেকে ${radius} কিমির মধ্যে` : `Within ${radius} km of Chawkbazar` },
    { icon: Gift, text: bn ? `৳${threshold}+ অর্ডারে ফ্রি ডেলিভারি` : `Free delivery on ৳${threshold}+` },
    { icon: ShieldCheck, text: bn ? 'পণ্য দেখে পেমেন্ট' : 'Pay after inspection' },
  ];

  return (
    <MarketPanel aria-labelledby="campaign-hero-title" tone="paper" className="campaign-hero relative w-full border-0 bg-transparent shadow-none">
      <div className="flex w-full flex-col gap-6">
        <div className="campaign-feature relative isolate overflow-hidden rounded-2xl bg-[#ffedb4] text-[#0b2517]">
          <div role="img" aria-label={dict.campaign.basketAlt} className="absolute inset-0 -z-20 hidden sm:block">
            <Image
              src="/images/hero-reference.webp"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
          </div>
          <div className="absolute inset-0 -z-10 hidden bg-[linear-gradient(90deg,#ffedb4_0%,#ffedb4_44%,rgba(255,237,180,0.85)_53%,rgba(255,237,180,0)_72%)] sm:block lg:bg-[linear-gradient(90deg,#ffedb4_0%,rgba(255,237,180,0.9)_38%,rgba(255,237,180,0)_58%)]" aria-hidden="true" />

          <div className="relative px-5 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-9 lg:px-10 lg:pt-10">
            <div className="campaign-copy sm:max-w-[56%] lg:max-w-[52%]">
              <p className="mb-5 flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.2em]">
                <span>{dict.campaign.spine}</span>
                <span aria-hidden="true">·</span>
                Lucky Store
              </p>
              <h1 id="campaign-hero-title" className="campaign-display text-[#0b2517] text-balance text-[2rem] font-black leading-[1.03] tracking-tight sm:text-[2.5rem] lg:text-[3.25rem]">
                {dict.campaign.headline}
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-6 sm:text-base sm:leading-7">
                <span className="sm:hidden">{dict.campaign.subtitleShort}</span>
                <span className="hidden sm:inline">{dict.campaign.subtitleLong}</span>
              </p>
            </div>

            <div className="relative mt-6 flex flex-wrap items-center gap-3 sm:mt-7">
              <Link
                href={withLocale('/category', locale)}
                data-cro="hero-primary-cta"
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#003d24] px-6 text-sm font-extrabold text-white transition-colors hover:bg-[#075333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003d24] focus-visible:ring-offset-2"
              >
                {dict.campaign.primaryCta}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link
                href={withLocale('/delivery', locale)}
                data-cro="hero-delivery-eligibility"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white/95 px-5 text-sm font-semibold text-[#0b2517] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003d24]"
              >
                <MapPin size={17} aria-hidden="true" />
                {dict.campaign.deliveryCta}
              </Link>
            </div>

            <div className="relative -mx-5 mt-6 h-44 sm:hidden" aria-hidden="true">
              <Image src="/images/hero-reference.webp" alt="" fill sizes="100vw" className="object-cover object-right" />
            </div>

            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium sm:mt-9 sm:text-sm">
              {reassurance.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2 rounded-full bg-[#fff2c9]/75 py-1 pr-3">
                  <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <HeroDiscoveryRail
          products={isOrganic ? organicMatches : products}
          title={isOrganic ? dict.campaign.organicTitle : dict.campaign.discoveryTitle}
          locale={locale}
        >
          <HomeCategoryBanners locale={locale} />
        </HeroDiscoveryRail>
      </div>
    </MarketPanel>
  );
}
