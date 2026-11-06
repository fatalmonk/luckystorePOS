import React from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { CategoryShell } from '../CategoryShell';
import { createProductRepository } from '../../../lib/products/index';
import { getCachedCategories } from '../../../lib/products/getCachedCategories';
import { supabase } from '../../../lib/supabase';
import { getSingleParam } from '../../../lib/utils';
import { getCanonicalCategoryRedirectPath, resolveCanonicalCategory } from '../../../lib/categoryResolution';
import { resolveCategoryRouteData } from '../../../lib/categoryRouteData';
import type { Metadata } from 'next';

const MONEY_PAGE_METADATA: Record<string, { title: string; description: string }> = {
  'biscuits-and-cookies': {
    title: 'Biscuits & Cookies in Chittagong | Lucky Store',
    description:
      'Browse biscuits, cookies and snack packs from Lucky Store in Chittagong. Check current prices and availability, then order online for local delivery.',
  },
  snacks: {
    title: 'Snacks & Chips in Chittagong | Lucky Store',
    description:
      'Shop snacks and chips online from Lucky Store in Chittagong. Check current prices and availability for local delivery and Cash on Delivery.',
  },
  'rice-and-grain': {
    title: 'Miniket & Chinigura Rice Price in Chittagong | Lucky Store',
    description:
      'Shop Miniket, Nazirshail and Chinigura rice in Chittagong at displayed bazaar prices. Order online with Cash on Delivery and doorstep product inspection.',
  },
  'oil-and-ghee': {
    title: 'Soybean & Mustard Oil Price in Chittagong | Lucky Store',
    description:
      'Check current 1L & 5L soybean and mustard oil prices in Chittagong. Order online for local delivery with Cash on Delivery.',
  },
  'cooking-essentials': {
    title: 'Daily Bazaar & Pantry Staples in Chittagong | Lucky Store',
    description:
      'Shop everyday bazaar essentials: lentils, flour, spices, salt & sugar at displayed prices in Chittagong. Free home delivery on orders ৳500+. Order online.',
  },
  'tea-and-coffee': {
    title: 'Ispahani Tea & Coffee Blends in Chittagong | Lucky Store',
    description:
      'Shop Ispahani Mirzapore, Taaza tea and coffee online from Lucky Store in Chittagong. Cash on Delivery and local delivery available.',
  },
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  let categorySlug: string;
  try {
    categorySlug = decodeURIComponent(resolvedParams.slug);
  } catch {
    notFound();
  }
  const categories = await getCachedCategories();
  const { canonicalSlug, group, currentCatObj } = resolveCanonicalCategory(categorySlug, categories);

  if (!canonicalSlug) {
    notFound();
  }

  const canonicalPath = getCanonicalCategoryRedirectPath('en', categorySlug, canonicalSlug, resolvedSearch);
  if (canonicalPath) permanentRedirect(canonicalPath);

  const hasFilters = Object.values(resolvedSearch).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  );
  const titleName = group?.label || currentCatObj?.name || canonicalSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const customMeta = canonicalSlug ? MONEY_PAGE_METADATA[canonicalSlug] : undefined;
  const title = customMeta?.title || `${titleName} in Chittagong | Lucky Store`;
  const description = customMeta?.description || `Shop ${titleName} online at Lucky Store in Chattogram. Browse current prices and order for local delivery with Cash on Delivery and doorstep inspection.`;

  const canonicalUrl = `https://www.luckystore1947.com/category/${canonicalSlug}`;
  const bnCanonicalUrl = `https://www.luckystore1947.com/bn/category/${canonicalSlug}`;
  const imageUrl = 'https://www.luckystore1947.com/lucky-store-social-share.jpg';

  return {
    title: customMeta ? { absolute: customMeta.title } : `${titleName} in Chittagong`,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Lucky Store',
      locale: 'en_BD',
      type: 'website',
      images: [
        {
          url: imageUrl,
          alt: `${titleName} at Lucky Store`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    robots: hasFilters ? {
      index: false,
      follow: true,
    } : undefined,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en-BD': canonicalUrl,
        'bn-BD': bnCanonicalUrl,
        'x-default': canonicalUrl,
      },
    },
  };
}

export default async function CategorySlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const categories = await getCachedCategories();
  const { repo } = createProductRepository(supabase);
  let categorySlug: string;
  try {
    categorySlug = decodeURIComponent(resolvedParams.slug);
  } catch {
    notFound();
  }
  const { canonicalSlug, group: initialGroup, currentCatObj } = resolveCanonicalCategory(categorySlug, categories);

  if (!canonicalSlug) {
    notFound();
  }

  const canonicalPath = getCanonicalCategoryRedirectPath('en', categorySlug, canonicalSlug, resolvedSearch);
  if (canonicalPath) permanentRedirect(canonicalPath);

  const currentCat = canonicalSlug;

  const searchTerm = getSingleParam(resolvedSearch.q) || getSingleParam(resolvedSearch.search);
  const theme = getSingleParam(resolvedSearch.theme);
  const sort = getSingleParam(resolvedSearch.sort) || 'best';

  const routeData = await resolveCategoryRouteData({
    slug: canonicalSlug,
    categories,
    currentCategory: currentCatObj,
    searchTerm,
    repository: repo,
  });
  const { group = initialGroup, parentGroup, products, productCount } = routeData;
  if (routeData.error) console.error('Failed to fetch category products:', routeData.error);

  return (
    <CategoryShell
      categorySlug={canonicalSlug}
      currentCat={currentCat}
      group={group}
      parentGroup={parentGroup}
      categories={categories}
      products={products}
      productCount={productCount}
      theme={theme}
      sort={sort}
      searchParams={resolvedSearch}
    />
  );
}
