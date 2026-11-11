'use client';

import { useEffect, useState } from 'react';
import { DealOfTheWeek } from './DealOfTheWeek';
import { HeritageSection } from './HeritageSection';
import { HomeTrustStrip } from './HomeTrustStrip';
import { InstallPrompt } from './InstallPrompt';
import { PopularBrandsSection } from './PopularBrandsSection';
import { ProductGridSection } from './ProductGridSection';
import type { Product } from '../lib/types';
import { withLocale, type Locale } from '../lib/i18n/config';
import { getDictionary } from '../lib/i18n/dictionaries';

const SHELF_SIZE = 8;

export interface DeferredHomeShelvesProps {
  locale: Locale;
  pantryProducts: Product[];
  snacksProducts: Product[];
  personalCareProducts: Product[];
  weeklyDealProducts: Product[];
  discountedProductCount: number;
  weeklyPicks: Product[];
  weeklyEditionActive: boolean;
  weeklyEditionUnavailable: boolean;
}

/** Below-the-fold homepage shelves. Loaded after the initial document so the hero is not competing with their JavaScript. */
export function DeferredHomeShelves({
  locale,
  pantryProducts,
  snacksProducts,
  personalCareProducts,
  weeklyDealProducts,
  discountedProductCount,
  weeklyPicks,
  weeklyEditionActive,
  weeklyEditionUnavailable,
}: DeferredHomeShelvesProps) {
  const [ready, setReady] = useState(false);
  const dict = getDictionary(locale);

  useEffect(() => {
    const win = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (win.requestIdleCallback) {
      const id = win.requestIdleCallback(() => setReady(true), { timeout: 1200 });
      return () => win.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(() => setReady(true), 250);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) return null;

  return (
    <>
      <ProductGridSection
        id="daily-essentials"
        title={dict.reels.pantryTitle}
        subtitle={dict.reels.pantrySubtitle}
        products={pantryProducts.slice(0, SHELF_SIZE)}
        ctaHref={withLocale('/category/cooking-essentials', locale)}
        ctaLabel={dict.reels.seeAll}
        locale={locale}
      />
      <DealOfTheWeek
        products={weeklyDealProducts}
        discountedProductCount={discountedProductCount}
        weeklyPicks={weeklyPicks}
        weeklyEditionActive={weeklyEditionActive}
        weeklyEditionUnavailable={weeklyEditionUnavailable}
        locale={locale}
      />
      <ProductGridSection
        id="snacks-drinks"
        title={dict.reels.snacksTitle}
        subtitle={dict.reels.snacksSubtitle}
        products={snacksProducts.slice(0, SHELF_SIZE)}
        ctaHref={withLocale('/category/snacks', locale)}
        ctaLabel={dict.reels.seeAll}
        locale={locale}
      />
      <ProductGridSection
        id="home-personal-care"
        title={dict.reels.careTitle}
        subtitle={dict.reels.careSubtitle}
        products={personalCareProducts.slice(0, SHELF_SIZE)}
        ctaHref={withLocale('/category/personal-care', locale)}
        ctaLabel={dict.reels.seeAll}
        locale={locale}
      />
      <PopularBrandsSection locale={locale} />
      <HeritageSection locale={locale} />
      <HomeTrustStrip locale={locale} />
      <InstallPrompt locale={locale} />
    </>
  );
}
