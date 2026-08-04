import Link from 'next/link';
import { Header } from './updated/Header';
import { Footer } from './updated/Footer';
import { CampaignGrid } from './CampaignGrid';
import { FeaturedProducts } from './FeaturedProducts';
import { DealOfTheWeek } from './DealOfTheWeek';
import { BottomNav } from './BottomNav';
import { FaqJsonLd } from './seo/FaqJsonLd';
import { CartStorageNotice } from './CartStorageNotice';
import { CategorySingleCarousel } from './CategorySingleCarousel';
import { CategoryQuickGrid } from './CategoryQuickGrid';
import { ThemedProductRail } from './ThemedProductRail';
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
  nestleProducts?: Product[];
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
  nestleProducts = [],
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
            <CategoryQuickGrid categories={categories} />
            <ThemedProductRail
              id="morning-essentials"
              products={morningProducts}
              title="Morning Essentials"
              subtitle="Start your day with fresh dairy, breakfast & more."
              theme="morning"
              ctaLabel="Shop all"
              ctaHref="/category"
            />
            <ProductGridSection
              id="monthly-bazar"
              title="Monthly Bazar Up to 50% Off"
              subtitle="Fresh, grocery & household essentials."
              products={dealsProducts.slice(0, 9)}
              ctaHref="/category?theme=deals"
            />
            <ProductGridSection
              id="fresh-picks"
              title="Fresh Picks Up to 30% Off"
              subtitle="Fruits, vegetables & farm-fresh daily."
              products={freshProducts.length > 0 ? freshProducts.slice(0, 9) : inStock.slice(0, 9)}
              brandOverlay="brightfarms"
              ctaHref="/category"
            />
            <ProductGridSection
              id="taste-nestle"
              title="Taste The Goodness of Nestlé"
              subtitle="Baby food, dairy & everyday nutrition."
              products={nestleProducts}
              ctaHref="/category"
            />
            <ThemedProductRail
              id="pantry-staples"
              products={pantryProducts}
              title="Pantry Staples"
              subtitle="Rice, grains, spices, oil & everyday cooking essentials."
              theme="pantry"
              ctaLabel="Shop pantry"
              ctaHref="/category"
            />
            <CampaignGrid products={campaignProducts} />

            <section aria-label="Why shop with Lucky Store" className="home-trust-strip">
              <dl className="grid grid-cols-1 divide-y divide-warm-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
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
          </div>

          <div className="mt-14 space-y-16 sm:mt-20 sm:space-y-20 lg:mt-24 lg:space-y-24">
            <FeaturedProducts products={featuredProducts} />
            <DealOfTheWeek products={inStock} />
            <CategorySingleCarousel products={inStock} />
          </div>

          <HeritageParallax />

          <section id="how-it-works" aria-labelledby="how-it-works-title" className="home-process mt-10 sm:mt-20 lg:mt-24">
            <h2 id="how-it-works-title" className="home-section-title text-lg sm:text-3xl">Order in 3 steps</h2>

            <ol className="mt-4 flex gap-2 overflow-x-auto pb-2 sm:mt-7 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible">
              <li className="home-process-step w-[72vw] shrink-0 sm:w-auto">
                <span className="home-process-number" aria-hidden="true">01</span>
                <h3 className="text-sm">Choose groceries</h3>
                <p className="text-xs">Browse and add what you need.</p>
              </li>
              <li className="home-process-step w-[72vw] shrink-0 sm:w-auto">
                <span className="home-process-number" aria-hidden="true">02</span>
                <h3 className="text-sm">Review order</h3>
                <p className="text-xs">Check items, details, and total.</p>
              </li>
              <li className="home-process-step w-[72vw] shrink-0 sm:w-auto">
                <span className="home-process-number" aria-hidden="true">03</span>
                <h3 className="text-sm">Get delivery</h3>
                <p className="text-xs">We bring it to your address.</p>
              </li>
            </ol>

            <Link
              href="/category"
              className="home-primary-action mt-4 inline-flex min-h-10 items-center justify-center rounded-full px-5 py-2 text-sm font-extrabold sm:mt-5 sm:min-h-11 sm:py-2.5"
            >
              Start shopping →
            </Link>
          </section>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
