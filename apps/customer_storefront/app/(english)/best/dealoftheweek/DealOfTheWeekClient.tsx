'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Sparkle, ShieldCheck, Tag, ArrowRight, ShoppingBag } from '@phosphor-icons/react';
import type { WeeklyDealProduct, WeeklyDealsDegradedReason } from '../../../lib/deals';
import { GridProductCard } from '../../../components/GridProductCard';
import { DealCountdown } from '../../../components/DealCountdown';
import { trackViewItemList } from '../../../lib/analytics';
import { toBengaliNumerals, withLocale, type Locale } from '../../../lib/i18n/config';

export interface DealOfTheWeekClientProps {
  products: WeeklyDealProduct[];
  activeEdition: boolean;
  editionPeriod?: string;
  campaignKey?: string;
  endsAt?: string;
  degradedReason?: WeeklyDealsDegradedReason;
  error?: string;
  locale?: Locale;
}

export function DealOfTheWeekClient({
  products,
  activeEdition,
  editionPeriod,
  campaignKey,
  endsAt,
  degradedReason,
  error,
  locale = 'en',
}: DealOfTheWeekClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const isBn = locale === 'bn';
  const number = (value: number) => (isBn ? toBengaliNumerals(value) : String(value));

  // Track item list view on mount
  useEffect(() => {
    if (products.length > 0) {
      trackViewItemList(products, 'deal_of_the_week', isBn ? 'সপ্তাহের সেরা অফার' : 'Deal of the Week');
    }
  }, [isBn, products]);

  // Extract unique categories for filtering
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const p of products) {
      if (p.category) cats.add(p.category);
    }
    return Array.from(cats).sort();
  }, [products]);

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-warm-muted sm:text-sm">
        <Link href={withLocale('/', locale)} className="hover:text-warm-fg transition-colors">
          {isBn ? 'হোম' : 'Home'}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-semibold text-warm-fg">{isBn ? 'সপ্তাহের সেরা অফার' : 'Deal of the Week'}</span>
      </nav>

      {/* Hero Section */}
      <section
        aria-labelledby="deals-hero-title"
        className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B0B0D] via-[#141418] to-[#252015] p-6 text-white shadow-xl sm:p-8 md:p-10"
      >
        {/* Ambient Decorative Saffron Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#F0C444]/15 blur-3xl sm:h-96 sm:w-96"
        />

        <div className="relative z-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-10">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#F0C444]/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#F0C444]">
              <Sparkle size={14} weight="fill" />
              <span>Lucky Store · {isBn ? (activeEdition ? 'সাপ্তাহিক সাশ্রয়ী অফার' : 'যাচাইকৃত স্টোর অফার') : (activeEdition ? 'Weekly Value Edition' : 'Verified Store Deals')}</span>
            </div>

            <h1
              id="deals-hero-title"
              className="text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl"
            >
              {isBn ? <>সপ্তাহের <span className="text-[#F0C444]">সেরা অফার</span></> : <>Deal of the <span className="text-[#F0C444]">Week</span></>}
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-zinc-300 sm:text-base">
              {activeEdition
                ? (isBn ? 'সম্পাদকীয়ভাবে যাচাইকৃত সাপ্তাহিক অফারের বাছাই। অনলাইন চেকআউটে স্বয়ংক্রিয়ভাবে অতিরিক্ত ৫% ছাড় প্রযোজ্য হবে।' : 'A curated shortlist of editor-verified weekly promotions. Enjoy an extra 5% discount automatically applied at online checkout on top of our existing low prices.')
                : (isBn ? 'লাকি স্টোরের নিত্যপ্রয়োজনীয় পণ্যের বর্তমান অফার দেখুন। প্রতিটি অফার লাইভ ইনভেন্টরি ও প্রকৃত রেফারেন্স মূল্যের সঙ্গে যাচাই করা হয়।' : 'Discover current unranked store offers across Lucky Store essentials. Every deal is validated against live inventory and real reference prices.')}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {activeEdition && editionPeriod && (
                <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold backdrop-blur-sm sm:text-sm">
                  <Tag size={16} className="text-[#F0C444]" />
                  <span>{editionPeriod}</span>
                </div>
              )}

              <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold backdrop-blur-sm sm:text-sm">
                <ShieldCheck size={16} className="text-[#27834a]" />
                <span>{number(products.length)} {isBn ? 'টি অফার' : products.length === 1 ? 'deal available' : 'deals available'}</span>
              </div>
            </div>
          </div>

          {activeEdition && endsAt && (
            <DealCountdown initialEndTime={endsAt} locale={locale} className="text-white md:justify-self-end" />
          )}
        </div>
      </section>

      {/* Error state banner if catalog lookup degraded */}
      {error && (
        <div className="mb-6 rounded-2xl border border-warm-border bg-warm-surface p-4 text-sm text-warm-fg">
          <p className="font-semibold text-warm-danger">{isBn ? 'বিজ্ঞপ্তি:' : 'Notice:'}</p>
          <p className="mt-1 text-xs text-warm-muted">
            {isBn ? 'ক্যাটালগ আপডেটের কারণে কিছু তথ্য আসতে দেরি হতে পারে। কার্টে বর্তমান মূল্য ও স্টক নিশ্চিত করুন।' : 'Some product updates may be delayed while our catalogue synchronizes. Current prices and stock are confirmed in your cart.'}
          </p>
        </div>
      )}

      {/* Category Filter Pills (if multiple categories present) */}
      {categories.length > 1 && (
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" role="group" aria-label={isBn ? 'বিভাগ অনুযায়ী অফার বাছাই' : 'Filter deals by category'}>
          <button
            type="button"
            aria-pressed={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all sm:text-sm ${
              selectedCategory === 'all'
                ? 'bg-[#0B0B0D] text-white shadow-sm ring-2 ring-[#F0C444]'
                : 'border border-warm-border bg-warm-surface text-warm-fg hover:border-warm-muted'
            }`}
          >
            {isBn ? 'সব অফার' : 'All Deals'} ({number(products.length)})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold capitalize transition-all sm:text-sm ${
                  isSelected
                    ? 'bg-[#0B0B0D] text-white shadow-sm ring-2 ring-[#F0C444]'
                    : 'border border-warm-border bg-warm-surface text-warm-fg hover:border-warm-muted'
                }`}
              >
                {cat} ({number(count)})
              </button>
            );
          })}
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:gap-5">
          {filteredProducts.map((product, index) => (
            <div key={product.id} className="flex flex-col">
              <GridProductCard
                product={product}
                locale={locale}
                priority={index < 4}
                listId="deal_of_the_week"
                listName={isBn ? 'সপ্তাহের সেরা অফার' : 'Deal of the Week'}
                index={index}
              />
              {/* Optional Promotional Checkout Indicator */}
              {activeEdition && product.promotionalPrice !== undefined && product.promotionalPrice < product.price && (
                <div className="mt-1.5 flex items-center justify-between rounded-lg bg-[#FFF7D8] px-2.5 py-1 text-[11px] font-bold text-[#4F3B00]">
                  <span>{isBn ? 'অনলাইন চেকআউট:' : 'Online checkout:'}</span>
                  <span className="font-mono text-xs">৳{number(product.promotionalPrice)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-3xl border border-dashed border-warm-border bg-warm-surface p-10 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#FFF5CF] text-[#735400]">
            <ShoppingBag size={28} weight="bold" />
          </div>
          <h2 className="text-xl font-bold text-warm-fg">{isBn ? 'এই বিভাগে কোনো অফার পাওয়া যায়নি' : 'No deals found in this category'}</h2>
          <p className="mt-2 text-sm text-warm-muted">
            {isBn ? 'এই বিভাগের সাপ্তাহিক অফারগুলো শেষ হয়ে গেছে বা পুনরায় স্টক করা হচ্ছে। অন্য বিভাগ দেখুন অথবা সম্পূর্ণ ক্যাটালগ ঘুরে দেখুন।' : 'All current weekly offers in this category have been claimed or are being restocked. Check other categories or browse our full catalogue.'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="rounded-full bg-[#0B0B0D] px-5 py-2.5 text-xs font-bold text-white transition-transform hover:scale-105"
              >
                {isBn ? 'সব অফার দেখুন' : 'View all deals'}
              </button>
            )}
            <Link
              href={withLocale('/category?theme=deals', locale)}
              className="inline-flex items-center gap-1.5 rounded-full border border-warm-border bg-warm-surface px-5 py-2.5 text-xs font-bold text-warm-fg hover:border-warm-muted"
            >
              <span>{isBn ? 'অফারের বিভাগ দেখুন' : 'Browse deals category'}</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Editorial Transparency & Safety Notes */}
      <section className="mt-12 rounded-2xl border border-warm-border bg-warm-surface p-6 sm:p-8">
        <h2 className="text-base font-bold text-warm-fg sm:text-lg">{isBn ? 'লাকি স্টোরের সাপ্তাহিক অফার যেভাবে কাজ করে' : 'How Lucky Store Weekly Deals Work'}</h2>
        <div className="mt-3 grid gap-4 text-xs leading-relaxed text-warm-muted sm:grid-cols-3 sm:text-sm">
          <div>
            <strong className="block text-warm-fg">{isBn ? 'প্রকৃত স্টক যাচাই' : 'Real Stock Verification'}</strong>
            {isBn ? 'চট্টগ্রাম স্টোরে বিক্রয়যোগ্য স্টক থাকলেই অফার দেখানো হয়। সংরক্ষিত বা প্রতিশ্রুত স্টক বাদ থাকে।' : 'Picks only display when real, sellable inventory is available in our Chattogram store. Committed or reserved stock is strictly excluded.'}
          </div>
          <div>
            <strong className="block text-warm-fg">{isBn ? 'যাচাইকৃত মূল্যের ভিত্তি' : 'Verified Price Baselines'}</strong>
            {isBn ? 'ছাড় বর্তমান বিক্রয়মূল্যের সঙ্গে প্রস্তুতকারকের যাচাইকৃত সর্বোচ্চ খুচরা মূল্য (MRP) তুলনা করে নির্ধারিত হয়।' : 'Discounts compare the current store selling price against the verified manufacturer Maximum Retail Price (MRP). No inflated baselines.'}
          </div>
          <div>
            <strong className="block text-warm-fg">{isBn ? 'চেকআউটে মূল্য নিশ্চিতকরণ' : 'Checkout Synchronization'}</strong>
            {isBn ? 'অর্ডার দেওয়ার আগে চেকআউটে প্রচারমূলক মূল্য ও পণ্যের প্রাপ্যতা পুনরায় যাচাই করা হয়।' : 'All promotional pricing is validated idempotently during checkout. Final promotional pricing and availability are confirmed at checkout before order placement.'}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-warm-border pt-4 text-xs font-semibold text-warm-muted">
          <span>{isBn ? 'লাকি স্টোর · ১৯৪৭ সাল থেকে চট্টগ্রামে' : 'Lucky Store · Serving Chattogram Since 1947'}</span>
          <span aria-hidden="true">·</span>
          <Link href="/best/editorial" className="text-warm-fg underline hover:text-[#8a6500]">
            {isBn ? 'সম্পাদকীয় ও মূল্যনীতি' : 'Editorial & Pricing Policy'}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/best" className="text-warm-fg underline hover:text-[#8a6500]">
            {isBn ? 'কেনাকাটার নির্দেশিকা' : 'Buying Guides'}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href={withLocale('/delivery', locale)} className="text-warm-fg underline hover:text-[#8a6500]">
            {isBn ? 'ডেলিভারি এলাকা' : 'Delivery Coverage'}
          </Link>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl bg-[#0B0B0D] p-6 text-white sm:flex-row sm:p-8">
        <div>
          <h3 className="text-lg font-bold sm:text-xl">{isBn ? 'নিত্যপ্রয়োজনীয় পণ্য খুঁজছেন?' : 'Looking for everyday essentials?'}</h3>
          <p className="mt-1 text-xs text-zinc-300 sm:text-sm">
            {isBn ? 'মুদি, বেকারি ও গৃহস্থালি পণ্য দেখুন। চকবাজার স্টোরের ১ কিমির মধ্যে স্থানীয় ডেলিভারি পাওয়া যায়।' : 'Explore groceries, bakery, and household essentials. Local delivery is available within 1 km of our Chawkbazar store.'}
          </p>
        </div>
        <Link
          href={withLocale('/category', locale)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#F0C444] px-6 py-3 text-xs font-black text-[#0B0B0D] transition-transform hover:scale-105 active:scale-95"
        >
          <span>{isBn ? 'সব পণ্য দেখুন' : 'Shop All Products'}</span>
          <ArrowRight size={16} weight="bold" />
        </Link>
      </div>
    </div>
  );
}
