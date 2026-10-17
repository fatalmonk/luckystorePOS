'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Sparkle, Clock, ShieldCheck, Tag, ArrowRight, ShoppingBag } from '@phosphor-icons/react';
import type { WeeklyDealProduct, WeeklyDealsDegradedReason } from '../../../lib/deals';
import { GridProductCard } from '../../../components/GridProductCard';
import { DealCountdown } from '../../../components/DealCountdown';
import { trackViewItemList } from '../../../lib/analytics';

export interface DealOfTheWeekClientProps {
  products: WeeklyDealProduct[];
  activeEdition: boolean;
  editionPeriod?: string;
  campaignKey?: string;
  endsAt?: string;
  degradedReason?: WeeklyDealsDegradedReason;
  error?: string;
}

export function DealOfTheWeekClient({
  products,
  activeEdition,
  editionPeriod,
  campaignKey,
  endsAt,
  degradedReason,
  error,
}: DealOfTheWeekClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Track item list view on mount
  useEffect(() => {
    if (products.length > 0) {
      trackViewItemList(products, 'deal_of_the_week', 'Deal of the Week');
    }
  }, [products]);

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
        <Link href="/" className="hover:text-warm-fg transition-colors">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-semibold text-warm-fg">Deal of the Week</span>
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

        <div className="relative z-10 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#F0C444]/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#F0C444]">
            <Sparkle size={14} weight="fill" />
            <span>Lucky Store · {activeEdition ? 'Weekly Value Edition' : 'Verified Store Deals'}</span>
          </div>

          <h1
            id="deals-hero-title"
            className="text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl"
          >
            Deal of the <span className="text-[#F0C444]">Week</span>
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-zinc-300 sm:text-base">
            {activeEdition
              ? 'A curated shortlist of editor-verified weekly promotions. Enjoy an extra 5% discount automatically applied at online checkout on top of our existing low prices.'
              : 'Discover current unranked store offers across Lucky Store essentials. Every deal is validated against live inventory and real reference prices.'}
          </p>

          {/* Campaign details & countdown */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {activeEdition && editionPeriod && (
              <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold backdrop-blur-sm sm:text-sm">
                <Tag size={16} className="text-[#F0C444]" />
                <span>{editionPeriod}</span>
              </div>
            )}

            <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold backdrop-blur-sm sm:text-sm">
              <ShieldCheck size={16} className="text-[#27834a]" />
              <span>{products.length} {products.length === 1 ? 'deal available' : 'deals available'}</span>
            </div>

            {/* Countdown timer if campaign is live */}
            {activeEdition && endsAt && (
              <div className="mt-2 flex w-full flex-col gap-1 sm:mt-0 sm:w-auto">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Clock size={14} />
                  <span>Offer ends in:</span>
                </div>
                <DealCountdown initialEndTime={endsAt} className="text-white" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Error state banner if catalog lookup degraded */}
      {error && (
        <div className="mb-6 rounded-2xl border border-warm-border bg-warm-surface p-4 text-sm text-warm-fg">
          <p className="font-semibold text-warm-danger">Notice:</p>
          <p className="mt-1 text-xs text-warm-muted">
            Some product updates may be delayed while our catalogue synchronizes. Current prices and stock are confirmed in your cart.
          </p>
        </div>
      )}

      {/* Category Filter Pills (if multiple categories present) */}
      {categories.length > 1 && (
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" role="group" aria-label="Filter deals by category">
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
            All Deals ({products.length})
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
                {cat} ({count})
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
                priority={index < 4}
                listId="deal_of_the_week"
                listName="Deal of the Week"
                index={index}
              />
              {/* Optional Promotional Checkout Indicator */}
              {activeEdition && product.promotionalPrice !== undefined && product.promotionalPrice < product.price && (
                <div className="mt-1.5 flex items-center justify-between rounded-lg bg-[#FFF7D8] px-2.5 py-1 text-[11px] font-bold text-[#4F3B00]">
                  <span>Online checkout:</span>
                  <span className="font-mono text-xs">৳{product.promotionalPrice}</span>
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
          <h2 className="text-xl font-bold text-warm-fg">No deals found in this category</h2>
          <p className="mt-2 text-sm text-warm-muted">
            All current weekly offers in this category have been claimed or are being restocked. Check other categories or browse our full catalogue.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="rounded-full bg-[#0B0B0D] px-5 py-2.5 text-xs font-bold text-white transition-transform hover:scale-105"
              >
                View all deals
              </button>
            )}
            <Link
              href="/category?theme=deals"
              className="inline-flex items-center gap-1.5 rounded-full border border-warm-border bg-warm-surface px-5 py-2.5 text-xs font-bold text-warm-fg hover:border-warm-muted"
            >
              <span>Browse deals category</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Editorial Transparency & Safety Notes */}
      <section className="mt-12 rounded-2xl border border-warm-border bg-warm-surface p-6 sm:p-8">
        <h2 className="text-base font-bold text-warm-fg sm:text-lg">How Lucky Store Weekly Deals Work</h2>
        <div className="mt-3 grid gap-4 text-xs leading-relaxed text-warm-muted sm:grid-cols-3 sm:text-sm">
          <div>
            <strong className="block text-warm-fg">Real Stock Verification</strong>
            Picks only display when real, sellable inventory is available in our Chattogram store. Committed or reserved stock is strictly excluded.
          </div>
          <div>
            <strong className="block text-warm-fg">Verified Price Baselines</strong>
            Discounts compare the current store selling price against the verified manufacturer Maximum Retail Price (MRP). No inflated baselines.
          </div>
          <div>
            <strong className="block text-warm-fg">Checkout Synchronization</strong>
            All promotional pricing is validated idempotently during checkout. Final promotional pricing and availability are confirmed at checkout before order placement.
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-warm-border pt-4 text-xs font-semibold text-warm-muted">
          <span>Lucky Store · Serving Chattogram Since 1947</span>
          <span aria-hidden="true">·</span>
          <Link href="/best/editorial" className="text-warm-fg underline hover:text-[#8a6500]">
            Editorial & Pricing Policy
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/best" className="text-warm-fg underline hover:text-[#8a6500]">
            Buying Guides
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/delivery" className="text-warm-fg underline hover:text-[#8a6500]">
            Delivery Coverage
          </Link>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl bg-[#0B0B0D] p-6 text-white sm:flex-row sm:p-8">
        <div>
          <h3 className="text-lg font-bold sm:text-xl">Looking for everyday essentials?</h3>
          <p className="mt-1 text-xs text-zinc-300 sm:text-sm">
            Explore hundreds of fresh grocery, bakery, and household products delivered across Chattogram.
          </p>
        </div>
        <Link
          href="/category"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#F0C444] px-6 py-3 text-xs font-black text-[#0B0B0D] transition-transform hover:scale-105 active:scale-95"
        >
          <span>Shop All Products</span>
          <ArrowRight size={16} weight="bold" />
        </Link>
      </div>
    </div>
  );
}
