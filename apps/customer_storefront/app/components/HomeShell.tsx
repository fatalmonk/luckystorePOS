'use client';

import { Header } from './updated/Header';
import { FlashSaleStrip } from './FlashSaleStrip';
import { HeroBanner } from './updated/HeroBanner';
import { PromoGrid } from './updated/PromoGrid';
import { ThemedShortcuts } from './ThemedShortcuts';
import { HomeSectionsClient } from './HomeSectionsClient';
import { BottomNav } from './BottomNav';
import { TruckIcon, CashIcon, ReturnIcon } from './icons';
import type { Product, Category } from '../lib/types';

interface HomeShellProps {
  products: Product[];
  categories: { id: string; slug: Category; name: string; emoji: string }[];
}

export function HomeShell({ products, categories }: HomeShellProps) {
  const MAX_SECTION_ITEMS = 20;

  const popular = products.slice(0, MAX_SECTION_ITEMS);
  const deals = products.filter((p) => (p.originalPrice ?? 0) > p.price).slice(0, MAX_SECTION_ITEMS);
  const bestSellers = products.filter((p) => p.stock > 20).slice(0, MAX_SECTION_ITEMS);

  const sections = [
    { title: 'Popular Now', href: '/category?sort=popular', products: popular },
    ...(deals.length > 0 ? [{ title: 'Hot Deals', href: '/category?theme=deals', products: deals }] : []),
    ...(bestSellers.length > 0 ? [{ title: 'Best Sellers', href: '/category?theme=bestsellers', products: bestSellers }] : []),
  ];

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16">
        <div className="p-4 sm:p-6 space-y-6">
          <HeroBanner
            slides={[
              {
                image: '/images/promo_welcome.webp',
                title: 'Welcome to Lucky Store',
                subtitle: 'Chittagong\'s trusted grocery since 1947',
                badge: 'Since 1947',
                ctaText: 'Start Shopping',
                ctaHref: '/category',
              },
              {
                image: '/images/promo_snacks.webp',
                title: 'Snacks & Treats',
                subtitle: 'Chips, chocolates, biscuits & more',
                badge: 'Popular',
                ctaText: 'Browse Snacks',
                ctaHref: '/category/snacks',
              },
              {
                image: '/images/promo_cooking.webp',
                title: 'Cooking Essentials',
                subtitle: 'Oils, spices, rice & everything for your kitchen',
                badge: 'Daily Needs',
                ctaText: 'Shop Cooking',
                ctaHref: '/category/cooking-needs',
              },
              {
                image: '/images/promo_electronics.webp',
                title: 'Electronics',
                subtitle: 'Gadgets & accessories for your home',
                badge: 'Tech',
                ctaText: 'Explore',
                ctaHref: '/category/electronics',
              },
              {
                image: '/images/promo_savings_banner.webp',
                title: 'Big Savings',
                subtitle: 'Up to 50% off on your favorites',
                badge: 'Hot Deals',
                ctaText: 'Grab Deals',
                ctaHref: '/category?theme=deals',
              },
            ]}
          />
          {/* Urgency strip is data-driven and hides when no endTime is configured. */}
          <FlashSaleStrip />
          <ThemedShortcuts />
          <PromoGrid />
          <HomeSectionsClient sections={sections} />

          {/* Bento Trust Section (Service Promises) */}
          <section className="space-y-5 pt-2">
            <h2 className="text-lg font-extrabold tracking-tight text-warm-fg">Why Chittagong Trusts Lucky Store</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Large Card: Free Same-Day Delivery */}
              <div className="sm:col-span-2 bg-warm-surface rounded-[20px] p-5 border border-warm-border/60 shadow-warm-sm flex items-start gap-4 hover:shadow-warm-md transition-shadow duration-300 cursor-pointer group">
                <div className="w-11 h-11 rounded-full bg-warm-accent-muted flex items-center justify-center shrink-0 text-warm-accent group-hover:scale-110 transition-transform duration-300">
                  <TruckIcon size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-warm-fg">Free Same-Day Delivery</h3>
                  <p className="text-xs text-warm-muted leading-relaxed">On orders ৳500+. Dispatched immediately from our hub.</p>
                </div>
              </div>

              {/* Small Card: Since 1947 */}
              <div className="bg-warm-surface rounded-[20px] p-5 border border-warm-border/60 shadow-warm-sm flex flex-col items-center justify-center text-center gap-2.5 hover:shadow-warm-md transition-shadow duration-300 cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-warm-accent-muted flex items-center justify-center text-warm-accent group-hover:scale-110 transition-transform duration-300">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
                  </svg>
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-warm-fg">Since 1947</h3>
                  <p className="text-[10px] text-warm-muted leading-tight">Trusted for generations</p>
                </div>
              </div>

              {/* Row 2: Smaller support cards and a wide CTA */}
              <div className="bg-warm-surface rounded-[20px] p-5 border border-warm-border/60 shadow-warm-sm flex items-center gap-4 hover:shadow-warm-md transition-shadow duration-300 cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-warm-accent-muted flex items-center justify-center shrink-0 text-warm-accent group-hover:scale-110 transition-transform duration-300">
                  <CashIcon size={18} />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-warm-fg">Cash on Delivery</h3>
                  <p className="text-[10px] text-warm-muted leading-tight">Pay on arrival</p>
                </div>
              </div>

              <div className="bg-warm-surface rounded-[20px] p-5 border border-warm-border/60 shadow-warm-sm flex items-center gap-4 hover:shadow-warm-md transition-shadow duration-300 cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-warm-accent-muted flex items-center justify-center shrink-0 text-warm-accent group-hover:scale-110 transition-transform duration-300">
                  <ReturnIcon size={18} />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-warm-fg">Fresh Guarantee</h3>
                  <p className="text-[10px] text-warm-muted leading-tight">7-day easy returns</p>
                </div>
              </div>

              {/* Wide CTA Banner */}
              <div className="bg-gradient-to-br from-warm-accent to-[#e8b840] rounded-[20px] p-5 shadow-warm-sm flex flex-col items-center justify-center text-center gap-2 hover:shadow-warm-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group">
                <span className="text-sm font-black text-warm-fg uppercase tracking-wider group-hover:tracking-widest transition-all duration-300">Shop Now →</span>
              </div>
            </div>
          </section>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
