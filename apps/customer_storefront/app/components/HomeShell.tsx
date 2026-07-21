import Link from 'next/link';
import { Header } from './updated/Header';
import { FlashSaleStrip } from './FlashSaleStrip';
import { HeroBanner } from './updated/HeroBanner';
import { PromoGrid } from './updated/PromoGrid';
import { ThemedShortcuts } from './ThemedShortcuts';
import { HomeSectionsClient } from './HomeSectionsClient';
import { BottomNav } from './BottomNav';
import { TruckIcon, CashIcon, ReturnIcon } from './icons';
import { WhatsAppFloat } from './WhatsAppFloat';
import type { Product, Category } from '../lib/types';
import { responsiveHeroBanner } from '../lib/imageUrl';

interface HomeShellProps {
  products: Product[];
  categories?: { id: string; slug: Category; name: string; emoji: string }[];
}

export function HomeShell({ products }: HomeShellProps) {
  const MAX_SECTION_ITEMS = 8;

  const inStock = products.filter((p) => p.stock > 0);
  const deals = inStock.filter((p) => (p.originalPrice ?? 0) > p.price).slice(0, MAX_SECTION_ITEMS);
  const bestSellers = inStock.filter((p) => p.stock > 20).slice(0, MAX_SECTION_ITEMS);

  const sections = [
    ...(deals.length > 0 ? [{ title: 'Hot Deals', href: '/category?theme=deals', products: deals, theme: 'deals' as const }] : []),
    ...(bestSellers.length > 0 ? [{ title: 'Best Sellers', href: '/category?theme=bestsellers', products: bestSellers, theme: 'bestsellers' as const }] : []),
  ];

  return (
    <>
      <h1 className="sr-only">Lucky Store 1947 — Authentic Grocery & Daily Essentials</h1>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16">
        <div className="p-4 sm:p-6 space-y-6">
          <HeroBanner
            slides={[
              {
                image: responsiveHeroBanner('promo_welcome_v2', 'Welcome to Lucky Store'),
                title: 'Welcome to Lucky Store',
                subtitle: 'Fresh groceries delivered daily. Chittagong\'s trusted store since 1947.',
                badge: 'Since 1947',
                ctaText: 'Start Shopping',
                ctaHref: '/category',
                objectPosition: '50% 64%',
              },
              {
                image: responsiveHeroBanner('promo_ice_cream', 'Monsoon Ice Cream Deals'),
                title: 'Monsoon Ice Cream Deals',
                subtitle: 'Up to 55% off ice creams',
                badge: 'Sweet Deals',
                hideText: true,
                hideOverlay: true,
                ctaHref: '/category/ice-cream',
                objectPosition: 'left center',
              },
              {
                image: responsiveHeroBanner('promo_savings_banner', 'Big savings on your favorite products'),
                title: 'Big Savings Week',
                subtitle: 'Up to 50% off daily essentials for a limited time',
                badge: 'Hot Deals',
                ctaText: 'Shop Deals',
                ctaHref: '/category?theme=deals',
                objectPosition: '50% 60%',
              },
              {
                image: responsiveHeroBanner('promo_cooking', 'Cooking essentials'),
                title: 'Cooking Essentials',
                subtitle: 'Oils, spices, rice & everything for your kitchen',
                badge: 'Daily Needs',
                ctaText: 'Shop Cooking',
                ctaHref: '/category/cooking-essentials',
                objectPosition: '50% 60%',
              },
            ]}
          />
          {/* Trust micro-bar — immediately visible after hero */}
          <div className="grid grid-cols-3 gap-2 rounded-[18px] bg-warm-surface border border-warm-border/50 p-3 shadow-warm-sm">
            <div className="flex flex-col items-center justify-center text-center gap-1">
              <span className="text-lg">🛵</span>
              <span className="text-[10px] font-bold text-warm-fg leading-tight">Free Delivery</span>
              <span className="text-[9px] text-warm-muted">৳500+</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center gap-1">
              <span className="text-lg">📅</span>
              <span className="text-[10px] font-bold text-warm-fg leading-tight">Since 1947</span>
              <span className="text-[9px] text-warm-muted">Trusted</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center gap-1">
              <span className="text-lg">💰</span>
              <span className="text-[10px] font-bold text-warm-fg leading-tight">Cash on Delivery</span>
              <span className="text-[9px] text-warm-muted">Pay on arrival</span>
            </div>
          </div>
          {/* Urgency strip is data-driven and hides when no endTime is configured. */}
          <FlashSaleStrip />
          <ThemedShortcuts />
          <PromoGrid />
          <HomeSectionsClient sections={sections} />

          {/* Bento Trust Section (Service Promises) */}
          <section className="space-y-5 pt-2" aria-label="Service Promises">
            <h2 className="text-lg font-extrabold tracking-tight text-warm-fg">Why Chittagong Trusts Lucky Store</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Large Card: Free Same-Day Delivery */}
              <div className="sm:col-span-2 bg-warm-surface rounded-[20px] p-5 border border-warm-border/60 shadow-warm-sm flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-warm-accent-muted flex items-center justify-center shrink-0 text-warm-accent">
                  <TruckIcon size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-warm-fg">Free Same-Day Delivery</h3>
                  <p className="text-xs text-warm-muted leading-relaxed">On orders ৳500+. Dispatched immediately from our hub.</p>
                </div>
              </div>

              {/* Small Card: Since 1947 */}
              <div className="bg-warm-surface rounded-[20px] p-5 border border-warm-border/60 shadow-warm-sm flex flex-col items-center justify-center text-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-warm-accent-muted flex items-center justify-center text-warm-accent">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
              <div className="bg-warm-surface rounded-[20px] p-5 border border-warm-border/60 shadow-warm-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-warm-accent-muted flex items-center justify-center shrink-0 text-warm-accent">
                  <CashIcon size={18} />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-warm-fg">Cash on Delivery</h3>
                  <p className="text-[10px] text-warm-muted leading-tight">Pay on arrival</p>
                </div>
              </div>

              <div className="bg-warm-surface rounded-[20px] p-5 border border-warm-border/60 shadow-warm-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-warm-accent-muted flex items-center justify-center shrink-0 text-warm-accent">
                  <ReturnIcon size={18} />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-warm-fg">Fresh Guarantee</h3>
                  <p className="text-[10px] text-warm-muted leading-tight">7-day easy returns</p>
                </div>
              </div>

              {/* Wide CTA Banner */}
              <Link
                href="/category"
                className="bg-gradient-to-br from-warm-accent to-[#e8b840] rounded-[20px] p-5 shadow-warm-sm flex flex-col items-center justify-center text-center gap-2 hover:shadow-warm-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 group"
              >
                <span className="text-sm font-black text-warm-fg uppercase tracking-wider group-hover:tracking-widest transition-all duration-300">Shop Now →</span>
              </Link>
            </div>
          </section>
        </div>
      </main>
      <BottomNav />
      <WhatsAppFloat />
    </>
  );
}

