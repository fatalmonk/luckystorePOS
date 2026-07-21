import Link from 'next/link';
import { Header } from './updated/Header';
import { FlashSaleStrip } from './FlashSaleStrip';
import { HeroBanner } from './updated/HeroBanner';
import { PromoGrid } from './updated/PromoGrid';
import { ThemedShortcuts } from './ThemedShortcuts';
import { HomeSectionsClient } from './HomeSectionsClient';
import { BottomNav } from './BottomNav';
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

          {/* How It Works — 3-step flow, visually distinct from micro-bar */}
          <section className="space-y-5 pt-2" aria-label="How It Works">
            <h2 className="text-lg font-extrabold tracking-tight text-warm-fg">How Lucky Store Works</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Step 1 */}
              <div className="bg-warm-surface rounded-[20px] p-5 border border-warm-border/60 shadow-warm-sm flex flex-col items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-warm-accent flex items-center justify-center shrink-0 text-warm-fg font-black text-sm">1</div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-warm-fg">Browse &amp; Add</h3>
                  <p className="text-xs text-warm-muted leading-relaxed">Pick from 500+ groceries, snacks &amp; daily essentials.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-warm-surface rounded-[20px] p-5 border border-warm-border/60 shadow-warm-sm flex flex-col items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-warm-accent flex items-center justify-center shrink-0 text-warm-fg font-black text-sm">2</div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-warm-fg">Quick Checkout</h3>
                  <p className="text-xs text-warm-muted leading-relaxed">Cash on delivery, bKash or card — your choice.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-warm-surface rounded-[20px] p-5 border border-warm-border/60 shadow-warm-sm flex flex-col items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-warm-accent flex items-center justify-center shrink-0 text-warm-fg font-black text-sm">3</div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-warm-fg">Same-Day Delivery</h3>
                  <p className="text-xs text-warm-muted leading-relaxed">We pack &amp; dispatch from our Chittagong hub fast.</p>
                </div>
              </div>
            </div>

            {/* Wide CTA */}
            <Link
              href="/category"
              className="block bg-gradient-to-br from-warm-accent to-[#e8b840] rounded-[20px] p-5 shadow-warm-sm text-center hover:shadow-warm-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 group"
            >
              <span className="text-sm font-black text-warm-fg uppercase tracking-wider group-hover:tracking-widest transition-all duration-300">Start Shopping →</span>
            </Link>
          </section>
        </div>
      </main>
      <BottomNav />
      <WhatsAppFloat />
    </>
  );
}

