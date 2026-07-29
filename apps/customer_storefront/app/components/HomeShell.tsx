import Link from 'next/link';
import { Header } from './updated/Header';
import { Footer } from './updated/Footer';
import { CampaignGrid } from './CampaignGrid';
import { ThemedShortcuts } from './ThemedShortcuts';
import { FeaturedProducts } from './FeaturedProducts';
import { DealOfTheWeek } from './DealOfTheWeek';
import { BottomNav } from './BottomNav';
import { FaqJsonLd } from './seo/FaqJsonLd';
import { CartStorageNotice } from './CartStorageNotice';
import { CategorySingleCarousel } from './CategorySingleCarousel';
import type { Product, Category } from '../lib/types';

interface HomeShellProps {
  products: Product[];
  categories?: { id: string; slug: Category; name: string; emoji: string }[];
}

export function HomeShell({ products }: HomeShellProps) {
  return (
    <>
      <h1 className="sr-only">Lucky Store 1947 — Authentic Grocery &amp; Daily Essentials</h1>
      <FaqJsonLd />
      <Header />
      <CartStorageNotice />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pb-20 sm:pt-7 lg:pb-24">
          <div className="space-y-4 sm:space-y-5">
            <CampaignGrid />

            <section aria-label="Why shop with Lucky Store" className="home-trust-strip">
              <dl className="grid grid-cols-1 divide-y divide-warm-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="home-trust-fact">
                  <dt>Local delivery</dt>
                  <dd>Across Chittagong</dd>
                </div>
                <div className="home-trust-fact">
                  <dt>Serving since 1947</dt>
                  <dd>Neighborhood roots</dd>
                </div>
                <div className="home-trust-fact">
                  <dt>Pay on arrival</dt>
                  <dd>Cash on delivery</dd>
                </div>
              </dl>
            </section>
          </div>

          <div className="mt-14 space-y-16 sm:mt-20 sm:space-y-20 lg:mt-24 lg:space-y-24">
            <ThemedShortcuts />
            <FeaturedProducts products={products} />
            <DealOfTheWeek products={products} />
            <CategorySingleCarousel products={products} />
          </div>

          <section id="how-it-works" aria-labelledby="how-it-works-title" className="home-process mt-16 sm:mt-20 lg:mt-24">
            <div className="max-w-2xl">
              <p className="home-section-kicker">Simple from shelf to doorstep</p>
              <h2 id="how-it-works-title" className="home-section-title">
                How Lucky Store works
              </h2>
              <p className="home-section-description">
                A familiar grocery run, made easier for busy Chittagong households.
              </p>
            </div>

            <ol className="mt-7 grid gap-3 sm:grid-cols-3">
              <li className="home-process-step">
                <span className="home-process-number" aria-hidden="true">01</span>
                <h3>Browse &amp; add</h3>
                <p>Choose from the groceries and daily essentials available today.</p>
              </li>
              <li className="home-process-step">
                <span className="home-process-number" aria-hidden="true">02</span>
                <h3>Confirm your order</h3>
                <p>Review quantities, delivery details, and your total before placing it.</p>
              </li>
              <li className="home-process-step">
                <span className="home-process-number" aria-hidden="true">03</span>
                <h3>Receive locally</h3>
                <p>We prepare your order for delivery across Chittagong.</p>
              </li>
            </ol>

            <div className="home-process-cta mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-extrabold text-warm-fg">Ready to turn the aisle?</p>
                <p className="mt-1 text-xs leading-5 text-warm-muted">
                  Browse freely · Review before ordering · Pay cash on delivery
                </p>
              </div>
              <Link
                href="/category"
                className="home-primary-action inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-sm font-extrabold"
              >
                Start shopping →
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
