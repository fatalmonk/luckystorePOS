import Link from 'next/link';
import Image from 'next/image';
import { Header } from './updated/Header';
import { Footer } from './updated/Footer';
import { CampaignGrid } from './CampaignGrid';
import { BottomNav } from './BottomNav';
import { CartStorageNotice } from './CartStorageNotice';
import { HomeTeaBanner } from './HomePromoBanners';
import { ProductGridSection } from './ProductGridSection';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { MagnifyingGlass as SearchIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import type { Product, Category } from '../lib/types';
import { withLocale, type Locale } from '../lib/i18n/config';
import { getDictionary } from '../lib/i18n/dictionaries';
import { DeferredHomeShelves, type DeferredHomeShelvesProps } from './DeferredHomeShelves';
import { InstallPromptBootstrap } from './InstallPromptBootstrap';
import { getDealOfTheWeekProducts, getDiscountBadgePercentage, WEEKLY_DEALS_LIMIT } from '../lib/deals';
import { CATEGORY_RAIL_ITEMS, BENGALI_CATEGORY_NAMES } from '../lib/types';

const HOME_SHELF_SIZE = 8;

export interface CategoryItem {
  id: string;
  slug: Category;
  name: string;
  emoji: string;
}

export interface HomeShellProps {
  inStock: Product[];
  weeklyPicks?: Product[];
  weeklyEditionActive?: boolean;
  weeklyEditionUnavailable?: boolean;
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
  weeklyPicks = [],
  weeklyEditionActive = false,
  weeklyEditionUnavailable = false,
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
        <main id="main-content" className="flex-1 overflow-x-clip pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">
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
        <InstallPromptBootstrap locale={locale} />
      </>
    );
  }

  const discountedProductCount = Math.min(
    WEEKLY_DEALS_LIMIT,
    inStock.filter((product) => getDiscountBadgePercentage(product) !== null).length,
  );
  // The rail renders one lead plus eight supporting cards. Weekly campaign
  // picks stay on weeklyPicks and are not replaced by this discount ranking.
  const visibleDeals = weeklyEditionActive ? null : getDealOfTheWeekProducts(inStock, 8);
  const deferredShelves: DeferredHomeShelvesProps = {
    locale,
    pantryProducts,
    snacksProducts,
    personalCareProducts,
    weeklyDealProducts: visibleDeals ? [visibleDeals.leadProduct, ...visibleDeals.supportingProducts] : [],
    discountedProductCount,
    weeklyPicks,
    weeklyEditionActive,
    weeklyEditionUnavailable,
  };

  return (
    <>
      <Header locale={locale} />
      <CartStorageNotice />
      <main id="main-content" className="flex-1 overflow-x-clip pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto max-w-7xl px-4 pb-4 pt-2 sm:px-6 sm:pb-8 sm:pt-4 lg:pb-10">
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* Mobile inline search bar — prominent rounded input directly below header */}
            <form
              action={withLocale('/category', locale)}
              method="GET"
              className="md:hidden mb-4 relative"
              role="search"
            >
              <SearchIcon
                size={18}
                weight="bold"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-muted"
                aria-hidden="true"
              />
              <input
                name="q"
                type="search"
                placeholder={dict.header.searchPlaceholder}
                className="w-full pl-11 pr-10 py-3 bg-warm-surface border border-warm-border rounded-warm-control text-warm-fg focus:outline-none focus:ring-2 focus:ring-warm-accent text-base"
                aria-label={dict.header.searchPlaceholder}
              />
              <button
                type="submit"
                className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-warm-image-well text-warm-fg transition-colors hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                aria-label={locale === 'bn' ? 'অনুসন্ধান করুন' : 'Submit search'}
              >
                <ArrowRight weight="bold" size={16} aria-hidden="true" />
              </button>
            </form>

            {/* Compact mobile hero — Shop Easy. Stay Stocked. */}
            <section
              id="mobile-hero"
              className="md:hidden mb-6 min-h-[14rem] relative overflow-hidden rounded-xl bg-warm-image-well"
              aria-labelledby="mobile-hero-title"
            >
              <Image
                src="/images/hero-reference.webp"
                alt=""
                fill
                sizes="100vw"
                priority
                className="object-cover object-[82%_center]"
              />
              <div className="absolute inset-0 bg-black/35" aria-hidden="true" />
              <div className="absolute inset-0 flex flex-col justify-center p-4 sm:p-6 text-center">
                <h2
                  id="mobile-hero-title"
                  className="font-display text-2xl font-black text-warm-image-well sm:text-3xl leading-tight"
                >
                  {locale === 'bn' ? 'সহজে কেনাকাটা। স্টকে থাকুন।' : 'Shop Easy. Stay Stocked.'}
                </h2>
                <p className="mt-2 max-w-[42ch] mx-auto text-sm text-warm-image-well sm:text-base leading-relaxed">
                  {locale === 'bn'
                    ? 'নিত্যপ্রয়োজনীয় পণ্য এবং সুবিধাজনক পাড়ার বাজারের কেনাকাটা।'
                    : 'Everyday essentials and convenient neighborhood shopping.'}
                </p>
                <Link
                  href={withLocale('/category', locale)}
                  className="mt-4 inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-warm-control bg-warm-accent px-5 py-2.5 text-sm font-black text-warm-accent-text hover:bg-warm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                >
                  {locale === 'bn' ? 'এখন কিনুন' : 'Shop Now'}
                  <ArrowRight className="hidden sm:inline" size={16} aria-hidden="true" />
                </Link>
              </div>
            </section>

            {/* Mobile category rail — compact horizontal shortcuts below hero */}
            <nav aria-label={dict.header.allCategories} className="md:hidden mb-6">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                <Link
                  href={withLocale('/category', locale)}
                  className="shrink-0 inline-flex min-h-11 items-center justify-center rounded-full border border-warm-border bg-warm-surface px-4 py-2 text-xs font-semibold text-warm-fg hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                  aria-current="page"
                >
                  {locale === 'bn' ? 'সব ক্যাটাগরি' : 'All Categories'}
                </Link>
                {['rice-and-grain', 'oil-and-ghee', 'dairy-and-eggs', 'snacks', 'tea-and-coffee', 'personal-care'].map(
                  (slug) => {
                    const label =
                      locale === 'bn'
                        ? (BENGALI_CATEGORY_NAMES[slug] || slug)
                        : CATEGORY_RAIL_ITEMS.find((item) => item.slug === slug)?.label ||
                          slug;
                    return (
                      <Link
                        key={slug}
                        href={withLocale(`/category/${slug}`, locale)}
                        className="shrink-0 inline-flex min-h-11 items-center justify-center rounded-full border border-warm-border bg-warm-surface px-4 py-2 text-xs font-semibold text-warm-fg hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                      >
                        {label}
                      </Link>
                    );
                  },
                )}
              </div>
            </nav>

            <CampaignGrid products={campaignProducts} locale={locale} />

            <HomeTeaBanner locale={locale} />

            <nav aria-label={dict.popularBazaar.label} className="hidden md:flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold text-warm-muted scrollbar-hide">
              <span className="shrink-0 font-bold text-warm-fg">{dict.popularBazaar.label}</span>
              <Link
                href={withLocale('/category/rice-and-grain', locale)}
                className="store-elevated-pill inline-flex min-h-11 shrink-0 items-center rounded-full px-4 py-2 text-warm-fg transition-[background-color,border-color,color,transform] hover:border-warm-accent hover:bg-warm-accent hover:text-warm-accent-text motion-safe:active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              >
                {dict.popularBazaar.rice}
              </Link>
              <Link
                href={withLocale('/category/oil-and-ghee', locale)}
                className="store-elevated-pill inline-flex min-h-11 shrink-0 items-center rounded-full px-4 py-2 text-warm-fg transition-[background-color,border-color,color,transform] hover:border-warm-accent hover:bg-warm-accent hover:text-warm-accent-text motion-safe:active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              >
                {dict.popularBazaar.oil}
              </Link>
              <Link
                href={withLocale('/category/cooking-essentials', locale)}
                className="store-elevated-pill inline-flex min-h-11 shrink-0 items-center rounded-full px-4 py-2 text-warm-fg transition-[background-color,border-color,color,transform] hover:border-warm-accent hover:bg-warm-accent hover:text-warm-accent-text motion-safe:active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              >
                {dict.popularBazaar.cooking}
              </Link>
              <Link
                href={withLocale('/category/tea-and-coffee', locale)}
                className="store-elevated-pill inline-flex min-h-11 shrink-0 items-center rounded-full px-4 py-2 text-warm-fg transition-[background-color,border-color,color,transform] hover:border-warm-accent hover:bg-warm-accent hover:text-warm-accent-text motion-safe:active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              >
                {dict.popularBazaar.tea}
              </Link>
              <Link
                href={withLocale('/fortune-cookies-near-me', locale)}
                className="store-elevated-pill inline-flex min-h-11 shrink-0 items-center rounded-full px-4 py-2 text-warm-fg transition-[background-color,border-color,color,transform] hover:border-warm-accent hover:bg-warm-accent hover:text-warm-accent-text motion-safe:active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              >
                {dict.popularBazaar.fortuneCookies}
              </Link>
            </nav>

            <ProductGridSection
              id="popular-right-now"
              title={dict.reels.popularTitle}
              subtitle={dict.reels.popularSubtitle}
              products={featuredProducts.slice(0, HOME_SHELF_SIZE)}
              ctaHref={withLocale('/category', locale)}
              ctaLabel={dict.reels.seeAllPopular}
              locale={locale}
            />
            <DeferredHomeShelves {...deferredShelves} />

            <section className="rounded-2xl border border-warm-border bg-warm-surface p-5 sm:p-6">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-black text-warm-fg">
                    {locale === 'bn' ? 'চকবাজারে আমাদের গ্রোসারি ডেলিভারি' : 'Grocery delivery from Chawkbazar'}
                  </h2>
                  <p className="mt-1 text-sm text-warm-muted">
                    {locale === 'bn'
                      ? 'ডেলিভারি সময়, এলাকা ও পেমেন্টের তথ্য দেখুন।'
                      : 'See delivery hours, service area, and payment details.'}
                  </p>
                </div>
                <Link
                  href={withLocale('/delivery', locale)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-warm-accent px-5 text-sm font-extrabold text-warm-accent-text transition-colors hover:bg-warm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                >
                  {locale === 'bn' ? 'ডেলিভারি তথ্য' : 'Delivery information'}
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer locale={locale} />
      <BottomNav locale={locale} />
      <InstallPromptBootstrap locale={locale} />
    </>
  );
}
