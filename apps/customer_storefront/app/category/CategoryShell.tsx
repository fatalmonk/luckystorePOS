import Link from 'next/link';
import React, { Suspense } from 'react';
import { Header } from '../components/updated/Header';
import { Footer } from '../components/updated/Footer';
import { BottomNav } from '../components/BottomNav';
import { CatalogLayout } from '../components/CatalogLayout';
import { CategoryGrid } from '../components/CategoryGrid';
import { CategoryGridSkeleton } from '../components/CategoryGridSkeleton';
import { HeroBanner } from '../components/updated/HeroBanner';
import type { Product, Category, CategoryGroup } from '../lib/types';
import { img, srcSet, responsiveHeroBanner } from '../lib/imageUrl';

interface CategoryShellProps {
  categorySlug: string;
  currentCat: Category | 'all';
  group?: CategoryGroup;
  parentGroup?: CategoryGroup;
  categories: { id: string; slug: Category; name: string; emoji: string }[];
  products: Product[];
  theme: string;
  sort: string;
  searchParams: Record<string, string | string[] | undefined>;
}

const BANNER_MAP: Record<string, { title: string; subtitle: string; badge: string; bgImage: any }> = {
  'ice-cream': {
    title: 'Ice Cream & Frozen Delights',
    subtitle: 'Chilled tubs, indulgent cones, and refreshing popsicles delivered frozen to your door.',
    badge: 'Chilled & Sweet',
    bgImage: responsiveHeroBanner('promo_ice_cream', 'Ice Cream & Frozen Delights'),
  },
  'ice-creams': {
    title: 'Ice Cream & Frozen Delights',
    subtitle: 'Chilled tubs, indulgent cones, and refreshing popsicles delivered frozen to your door.',
    badge: 'Chilled & Sweet',
    bgImage: responsiveHeroBanner('promo_ice_cream', 'Ice Cream & Frozen Delights'),
  },
  'cold-beverages': {
    title: 'Cold Beverages & Drinks',
    subtitle: 'Chilled sparklers, fresh juices, sodas, and energy drinks delivered ice-cold.',
    badge: 'Chilled & Refreshing',
    bgImage: responsiveHeroBanner('promo_beverages', 'Cold Beverages'),
  },
  'beverages': {
    title: 'Cold Beverages & Drinks',
    subtitle: 'Chilled sparklers, fresh juices, sodas, and energy drinks delivered ice-cold.',
    badge: 'Chilled & Refreshing',
    bgImage: responsiveHeroBanner('promo_beverages', 'Cold Beverages'),
  },
  'snacks': {
    title: 'Snacks & Munchies',
    subtitle: 'Bite-sized happiness, from sweet biscuits to savory local crisps.',
    badge: 'Crispy & Sweet',
    bgImage: responsiveHeroBanner('promo_snacks', 'Snacks'),
  },
  'biscuits-and-cookies': {
    title: 'Biscuits & Cookies',
    subtitle: 'Crunchy, sweet, and savory treats perfect for your tea time.',
    badge: 'Tea Time Treats',
    bgImage: responsiveHeroBanner('promo_biscuits', 'Biscuits & Cookies'),
  },
  'cooking-essentials': {
    title: 'Cooking Essentials',
    subtitle: 'Pure oils, aromatic spices, and finest grains for your daily meals.',
    badge: 'Kitchen Staples',
    bgImage: responsiveHeroBanner('promo_cooking', 'Cooking'),
  },
  'personal-care': {
    title: 'Personal Care & Hygiene',
    subtitle: 'Gentle soaps, premium hair care, skincare, and daily grooming essentials.',
    badge: 'Hygiene & Care',
    bgImage: responsiveHeroBanner('promo_personal', 'Personal care'),
  },
  'tea-coffee': {
    title: 'Tea & Coffee Essentials',
    subtitle: 'Aromatic teas, premium coffee blends, and milk powders for your morning brew.',
    badge: 'Morning Brew',
    bgImage: responsiveHeroBanner('promo_tea_coffee', 'Tea & Coffee'),
  },
};

export function CategoryShell({
  categorySlug,
  group,
  parentGroup,
  categories,
  products,
  theme,
  sort,
  searchParams,
}: CategoryShellProps) {
  const isAllProducts = categorySlug === 'all';
  const catObj = categories.find((c) => c.slug === categorySlug);
  const prettyName =
    catObj?.name ||
    categorySlug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const bannerConfig = BANNER_MAP[categorySlug] || (group?.slug && BANNER_MAP[group.slug]) || {
    title: prettyName,
    subtitle: `Explore top quality ${prettyName.toLowerCase()} products delivered directly to your home.`,
    badge: 'Lucky Choice',
    bgImage: responsiveHeroBanner('hero_grocery_banner', prettyName),
  };

  return (
    <>
      <Header />
      <main className={`flex-1 overflow-x-hidden pb-16 ${isAllProducts ? 'pt-4 sm:pt-6' : ''}`}>
        {isAllProducts ? (
          <Suspense fallback={<CategoryGridSkeleton />}>
            <CategoryGrid searchParams={searchParams} />
          </Suspense>
        ) : (
          <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
            <div className="space-y-4">
              {parentGroup && !group && (
                <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-warm-muted flex-wrap">
                  <Link href="/category" className="hover:text-warm-fg transition-colors py-1 px-1.5 rounded inline-flex items-center min-h-[44px]">
                    Categories
                  </Link>
                  <span>/</span>
                  <Link href={`/category/${parentGroup.slug}`} className="hover:text-warm-fg transition-colors py-1 px-1.5 rounded inline-flex items-center min-h-[44px]">
                    {parentGroup.label}
                  </Link>
                  <span>/</span>
                  <span className="text-warm-fg font-bold py-1 px-1.5 inline-flex items-center min-h-[44px]">{prettyName}</span>
                </nav>
              )}
              <HeroBanner
                slides={[
                  {
                    image: bannerConfig.bgImage,
                    title: bannerConfig.title,
                    subtitle: bannerConfig.subtitle,
                    badge: bannerConfig.badge,
                  },
                ]}
              />
            </div>

            <CatalogLayout
              products={products}
              categorySlug={categorySlug}
              group={group}
              parentGroup={parentGroup}
              categories={categories}
              theme={theme}
              sort={sort}
              searchParams={searchParams}
            />
          </div>
        )}
        <Footer />
      </main>
      <BottomNav />
    </>
  );
}
