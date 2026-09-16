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
        <main id="main-content" className="flex-1 overflow-x-hidden pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">
          <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-20">
            <h1 className="text-balance text-2xl font-black">Lucky Store is stocking up</h1>
            <p className="mt-2 text-sm text-warm-muted">Please check back soon.</p>
            <Link href="/category" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-warm-accent px-5 py-2 text-sm font-extrabold text-warm-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent">
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
      <h1 className="sr-only">Lucky Store — Online Grocery &amp; Daily Bazaar in Chattogram (Est. 1947)</h1>
      <FaqJsonLd />
      <Header />
      <CartStorageNotice />
      <main id="main-content" className="flex-1 overflow-x-hidden pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-4 sm:px-6 sm:pb-20 sm:pt-7 lg:pb-24">
          <div className="space-y-4 sm:space-y-5">
            <CampaignGrid products={campaignProducts} />

            <section aria-label="Why shop with Lucky Store" className="home-trust-strip">
              <dl className="grid grid-cols-3 divide-x divide-warm-border">
                <div className="flex">
                  <Link
                    href="/delivery"
                    className="home-trust-fact w-full transition-colors hover:bg-warm-image-well/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                  >
                    <dt className="transition-colors hover:text-warm-accent">Free Delivery ৳500+</dt>
                    <dd>Within 1 km of Chawkbazar</dd>
                  </Link>
                </div>
                <div className="flex">
                  <div className="home-trust-fact w-full">
                    <dt>Established 1947</dt>
                    <dd>75+ years of trusted service</dd>
                  </div>
                </div>
                <div className="flex">
                  <Link
                    href="/delivery#payment-heading"
                    className="home-trust-fact w-full transition-colors hover:bg-warm-image-well/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                  >
                    <dt className="transition-colors hover:text-warm-accent">Cash on Delivery</dt>
                    <dd>Doorstep check &amp; bKash</dd>
                  </Link>
                </div>
              </dl>
            </section>

            <CategoryQuickGrid categories={categories} />

            <nav aria-label="Popular Bazaar Categories" className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold text-warm-muted scrollbar-hide">
              <span className="shrink-0 font-bold text-warm-fg">Popular Bazaar:</span>
              <Link
                href="/category/rice-and-grain"
                className="shrink-0 rounded-full border border-warm-border bg-warm-surface px-3 py-1 text-warm-fg hover:border-warm-accent hover:text-warm-accent-text hover:bg-warm-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              >
                Miniket &amp; Chinigura Rice
              </Link>
              <Link
                href="/category/oil-and-ghee"
                className="shrink-0 rounded-full border border-warm-border bg-warm-surface px-3 py-1 text-warm-fg hover:border-warm-accent hover:text-warm-accent-text hover:bg-warm-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              >
                Edible Oils &amp; Mustard Oil
              </Link>
              <Link
                href="/category/cooking-essentials"
                className="shrink-0 rounded-full border border-warm-border bg-warm-surface px-3 py-1 text-warm-fg hover:border-warm-accent hover:text-warm-accent-text hover:bg-warm-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              >
                Daily Bazaar &amp; Pantry
              </Link>
              <Link
                href="/category/tea-and-coffee"
                className="shrink-0 rounded-full border border-warm-border bg-warm-surface px-3 py-1 text-warm-fg hover:border-warm-accent hover:text-warm-accent-text hover:bg-warm-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              >
                Ispahani Tea &amp; Coffee
              </Link>
            </nav>

            <ProductGridSection
              id="popular-right-now"
              title="Popular Right Now"
              subtitle="Neighbourhood favourites filling Chittagong baskets this morning."
              products={featuredProducts.slice(0, 15)}
              ctaHref="/category"
            />
            <ProductGridSection
              id="daily-essentials"
              title="Daily Bazaar &amp; Pantry Staples"
              subtitle="Everyday lentils, flour, spices, salt &amp; sugar for tonight’s pot."
              products={pantryProducts.slice(0, 15)}
              ctaHref="/category/cooking-essentials"
            />

            <div className="py-2 sm:py-4">
              <DealOfTheWeek products={inStock} />
            </div>

            <ProductGridSection
              id="snacks-drinks"
              title="Snacks & Drinks"
              subtitle="Crisp teatime biscuits, afternoon cold sips, and sweet bites."
              products={snacksProducts.slice(0, 15)}
              ctaHref="/category/snacks"
            />
            <ProductGridSection
              id="home-personal-care"
              title="Home & Personal Care"
              subtitle="Gentle soaps, clean living essentials, and daily comforts for the home."
              products={personalCareProducts.slice(0, 15)}
              ctaHref="/category/personal-care"
            />
          </div>

          <HeritageParallax />
        </div>
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
