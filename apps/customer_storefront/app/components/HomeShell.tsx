import { Header } from './updated/Header';
import { ThemedShortcuts } from './ThemedShortcuts';
import { FlashSaleStrip } from './FlashSaleStrip';
import { HeroBanner } from './updated/HeroBanner';
import { PromoGrid } from './updated/PromoGrid';
import { HomeSectionsClient } from './HomeSectionsClient';
import { BottomNav } from './BottomNav';
import { TruckIcon, CashIcon, ReturnIcon, LockIcon } from './icons';
import type { Product } from '../lib/types';

interface HomeShellProps {
  products: Product[];
}

export function HomeShell({ products }: HomeShellProps) {
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
            title="Lucky Store"
            subtitle="Your everyday essentials delivered instantly"
            badge="Super Fast Delivery"
            bgImage="https://images.luckystore1947.com/banners/hero_grocery_banner.webp"
          />
          {/* Urgency strip is data-driven and hides when no endTime is configured. */}
          <FlashSaleStrip />
          <ThemedShortcuts />
          <PromoGrid />
          <HomeSectionsClient sections={sections} />

          {/* Bento Trust Section (Service Promises) */}
          <section className="space-y-6 pt-4">
            <h2 className="text-xl font-extrabold tracking-tight text-charcoal">Why Dhaka Trusts Lucky Store</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1 */}
              <div className="bg-white rounded-[24px] p-6 border border-warm-border/60 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow duration-300">
                <div className="w-12 h-12 rounded-full bg-warm-accent-muted flex items-center justify-center shrink-0 text-warm-accent-dark">
                  <TruckIcon size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-charcoal">Free Same-Day Delivery</h3>
                  <p className="text-xs text-warm-grey leading-relaxed">On orders ৳500+. Dispatched immediately from our hub.</p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-white rounded-[24px] p-6 border border-warm-border/60 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow duration-300">
                <div className="w-12 h-12 rounded-full bg-warm-accent-muted flex items-center justify-center shrink-0 text-warm-accent-dark">
                  <CashIcon size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-charcoal">Cash on Delivery</h3>
                  <p className="text-xs text-warm-grey leading-relaxed">No digital payments required. Inspect goods before paying.</p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-white rounded-[24px] p-6 border border-warm-border/60 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow duration-300">
                <div className="w-12 h-12 rounded-full bg-warm-accent-muted flex items-center justify-center shrink-0 text-warm-accent-dark">
                  <ReturnIcon size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-charcoal">Fresh Guarantee</h3>
                  <p className="text-xs text-warm-grey leading-relaxed">7-day hassle-free return. No questions asked return policy.</p>
                </div>
              </div>

              {/* Card 4 */}
              <div className="bg-white rounded-[24px] p-6 border border-warm-border/60 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow duration-300">
                <div className="w-12 h-12 rounded-full bg-warm-accent-muted flex items-center justify-center shrink-0 text-warm-accent-dark">
                  <LockIcon size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-charcoal">Since 1947</h3>
                  <p className="text-xs text-warm-grey leading-relaxed">Serving families across generations with absolute trust.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      <BottomNav />
    </>
  );
}

