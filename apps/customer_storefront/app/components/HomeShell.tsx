import Link from 'next/link';
import { Header } from './updated/Header';
import { Footer } from './updated/Footer';
import { CampaignGrid } from './CampaignGrid';
import { DealOfTheWeek } from './DealOfTheWeek';
import { BottomNav } from './BottomNav';
import { FaqJsonLd } from './seo/FaqJsonLd';
import { CartStorageNotice } from './CartStorageNotice';
import { CategoryQuickGrid } from './CategoryQuickGrid';
import { ProductGridSection } from './ProductGridSection';
import { HeritageParallax } from './parallax/HeritageParallax';
import { PartnerLogoMarquee } from './PartnerLogoMarquee';
import type { Product, Category } from '../lib/types';

export interface CategoryItem {
  id: string;
  slug: Category;
  name: string;
  emoji: string;
}

export interface HomeShellProps {
  inStock: Product[];
  categories?: CategoryItem[];
  dealsProducts: Product[];
  morningProducts: Product[];
  pantryProducts: Product[];
  featuredProducts: Product[];
  campaignProducts: Product[];
  freshProducts?: Product[];
  personalCareProducts?: Product[];
  nestleProducts?: Product[];
  snacksProducts?: Product[];
}

export function HomeShell({
  inStock,
  categories = [],
  dealsProducts,
  morningProducts,
  pantryProducts,
  featuredProducts,
  campaignProducts,
  freshProducts = [],
  personalCareProducts = [],
  nestleProducts = [],
  snacksProducts = [],
}: HomeShellProps) {
  if (inStock.length === 0) {
    return (
      <>
        <Header />
        <main className="flex-1 overflow-x-hidden pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">
          <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-20">
            <h1 className="text-2xl font-black">Lucky Store is stocking up</h1>
            <p className="mt-2 text-sm text-warm-muted">Please check back soon.</p>
            <Link href="/category" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-warm-accent px-5 py-2 text-sm font-extrabold text-warm-accent-text">
              Browse categories →
            </Link>
          </div>
        </main>
        <Footer />
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <h1 className="sr-only">Lucky Store 1947 — Online Grocery Delivery in Chittagong</h1>
      <FaqJsonLd />
      <Header />
      <CartStorageNotice />
      <main className="flex-1 overflow-x-hidden pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pb-20 sm:pt-7 lg:pb-24">
          <div className="space-y-4 sm:space-y-5">
            <CampaignGrid products={campaignProducts} />

            <section aria-label="Why shop with Lucky Store" className="home-trust-strip">
              <dl className="grid grid-cols-3 divide-x divide-warm-border">
                <div className="home-trust-fact">
                  <dt>Local delivery</dt>
                  <dd>Across Chittagong</dd>
                </div>
                <div className="home-trust-fact">
                  <dt>Since 1947</dt>
                  <dd>A store Chittagong knows</dd>
                </div>
                <div className="home-trust-fact">
                  <dt>Pay on delivery</dt>
                  <dd>Cash accepted at your door</dd>
                </div>
              </dl>
            </section>

            <CategoryQuickGrid categories={categories} />

            <ProductGridSection
              id="popular-right-now"
              title="Popular Right Now"
              subtitle="Frequently picked groceries and everyday repeat buys."
              products={featuredProducts.slice(0, 15)}
              ctaHref="/category"
            />
            <ProductGridSection
              id="daily-essentials"
              title="Daily Essentials"
              subtitle="Rice, grains, spices, oil & everyday cooking essentials."
              products={pantryProducts.slice(0, 15)}
              ctaHref="/category/cooking-essentials"
            />

            <div className="py-2 sm:py-4">
              <DealOfTheWeek products={inStock} />
            </div>

            <ProductGridSection
              id="snacks-drinks"
              title="Snacks & Drinks"
              subtitle="Chips, biscuits, ice creams, beverages & quick bites."
              products={snacksProducts.slice(0, 15)}
              ctaHref="/category/snacks"
            />
            <ProductGridSection
              id="home-personal-care"
              title="Home & Personal Care"
              subtitle="Household and personal replenishment for the week."
              products={personalCareProducts.slice(0, 15)}
              ctaHref="/category/personal-care"
            />
          </div>

          <HeritageParallax />
        </div>
      </main>
      <PartnerLogoMarquee />
      <Footer />
      <BottomNav />
    </>
  );
}
