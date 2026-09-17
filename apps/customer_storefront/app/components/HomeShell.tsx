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
import { InstallPrompt } from './InstallPrompt';
import type { Product, Category } from '../lib/types';
import { withLocale, type Locale } from '../lib/i18n/config';
import { getDictionary } from '../lib/i18n/dictionaries';

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
  locale?: Locale;
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
  locale = 'en',
}: HomeShellProps) {
  const dict = getDictionary(locale);

  if (inStock.length === 0) {
    return (
      <>
        <Header locale={locale} />
        <main id="main-content" className="flex-1 overflow-x-hidden pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">
          <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-20">
            <h1 className="text-balance text-2xl font-black">{dict.emptyState.title}</h1>
            <p className="mt-2 text-sm text-warm-muted">{dict.emptyState.message}</p>
            <Link
              href={withLocale('/category', locale)}
              className="mt-6 inline-flex min-h-11 items-center rounded-full bg-warm-accent px-5 py-2 text-sm font-extrabold text-warm-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            >
              {dict.emptyState.browse}
            </Link>
          </div>
        </main>
        <Footer locale={locale} />
        <BottomNav locale={locale} />
      </>
    );
  }


  return (
    <>
      <h1 className="sr-only">
        {locale === 'bn'
          ? 'লাকি স্টোর — চট্টগ্রামে অনলাইন গ্রোসারি ও দৈনন্দিন বাজার (স্থাপিত ১৯৪৭)'
          : 'Lucky Store — Online Grocery & Daily Bazaar in Chattogram (Est. 1947)'}
      </h1>
      <FaqJsonLd />
      <Header locale={locale} />
      <CartStorageNotice />
      <main id="main-content" className="flex-1 overflow-x-hidden pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-4 sm:px-6 sm:pb-20 sm:pt-7 lg:pb-24">
          <div className="space-y-4 sm:space-y-5">
            <CampaignGrid products={campaignProducts} locale={locale} />

            <section aria-label={locale === 'bn' ? 'কেন লাকি স্টোরে কেনাকাটা করবেন' : 'Why shop with Lucky Store'} className="home-trust-strip">
              <dl className="grid grid-cols-3 divide-x divide-warm-border">
                <div className="home-trust-fact group relative transition-colors hover:bg-warm-image-well/40">
                  <dt className="transition-colors group-hover:text-warm-accent">
                    <Link
                      href={withLocale('/delivery', locale)}
                      className="text-inherit after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent rounded-sm"
                    >
                      {dict.trustStrip.freeDeliveryTitle}
                    </Link>
                  </dt>
                  <dd>{dict.trustStrip.freeDeliveryDesc}</dd>
                </div>
                <div className="home-trust-fact">
                  <dt>{dict.trustStrip.establishedTitle}</dt>
                  <dd>{dict.trustStrip.establishedDesc}</dd>
                </div>
                <div className="home-trust-fact group relative transition-colors hover:bg-warm-image-well/40">
                  <dt className="transition-colors group-hover:text-warm-accent">
                    <Link
                      href={withLocale('/delivery#payment-heading', locale)}
                      className="text-inherit after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent rounded-sm"
                    >
                      {dict.trustStrip.codTitle}
                    </Link>
                  </dt>
                  <dd>{dict.trustStrip.codDesc}</dd>
                </div>
              </dl>
            </section>

            <CategoryQuickGrid categories={categories} locale={locale} />

            <nav aria-label={dict.popularBazaar.label} className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold text-warm-muted scrollbar-hide">
              <span className="shrink-0 font-bold text-warm-fg">{dict.popularBazaar.label}</span>
              <Link
                href={withLocale('/category/rice-and-grain', locale)}
                className="shrink-0 rounded-full border border-warm-border bg-warm-surface px-3 py-1 text-warm-fg hover:border-warm-accent hover:text-warm-accent-text hover:bg-warm-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              >
                {dict.popularBazaar.rice}
              </Link>
              <Link
                href={withLocale('/category/oil-and-ghee', locale)}
                className="shrink-0 rounded-full border border-warm-border bg-warm-surface px-3 py-1 text-warm-fg hover:border-warm-accent hover:text-warm-accent-text hover:bg-warm-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              >
                {dict.popularBazaar.oil}
              </Link>
              <Link
                href={withLocale('/category/cooking-essentials', locale)}
                className="shrink-0 rounded-full border border-warm-border bg-warm-surface px-3 py-1 text-warm-fg hover:border-warm-accent hover:text-warm-accent-text hover:bg-warm-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              >
                {dict.popularBazaar.cooking}
              </Link>
              <Link
                href={withLocale('/category/tea-and-coffee', locale)}
                className="shrink-0 rounded-full border border-warm-border bg-warm-surface px-3 py-1 text-warm-fg hover:border-warm-accent hover:text-warm-accent-text hover:bg-warm-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              >
                {dict.popularBazaar.tea}
              </Link>
            </nav>

            <ProductGridSection
              id="popular-right-now"
              title={dict.reels.popularTitle}
              subtitle={dict.reels.popularSubtitle}
              products={featuredProducts.slice(0, 15)}
              ctaHref={withLocale('/category', locale)}
              ctaLabel={dict.reels.seeAll}
              locale={locale}
            />
            <ProductGridSection
              id="daily-essentials"
              title={dict.reels.pantryTitle}
              subtitle={dict.reels.pantrySubtitle}
              products={pantryProducts.slice(0, 15)}
              ctaHref={withLocale('/category/cooking-essentials', locale)}
              ctaLabel={dict.reels.seeAll}
              locale={locale}
            />

            <div className="py-2 sm:py-4">
              <DealOfTheWeek products={inStock} locale={locale} />
            </div>

            <ProductGridSection
              id="snacks-drinks"
              title={dict.reels.snacksTitle}
              subtitle={dict.reels.snacksSubtitle}
              products={snacksProducts.slice(0, 15)}
              ctaHref={withLocale('/category/snacks', locale)}
              ctaLabel={dict.reels.seeAll}
              locale={locale}
            />
            <ProductGridSection
              id="home-personal-care"
              title={dict.reels.careTitle}
              subtitle={dict.reels.careSubtitle}
              products={personalCareProducts.slice(0, 15)}
              ctaHref={withLocale('/category/personal-care', locale)}
              ctaLabel={dict.reels.seeAll}
              locale={locale}
            />
          </div>

          <HeritageParallax locale={locale} />
        </div>
      </main>
      <Footer locale={locale} />
      <BottomNav locale={locale} />
      <InstallPrompt locale={locale} />
    </>
  );
}
