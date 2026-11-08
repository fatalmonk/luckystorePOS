import React from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { CategoryShell } from '../../../../(english)/category/CategoryShell';
import { createProductRepository } from '../../../../lib/products/index';
import { getCachedCategories } from '../../../../lib/products/getCachedCategories';
import { supabase } from '../../../../lib/supabase';
import { getSingleParam } from '../../../../lib/utils';
import { getCanonicalCategoryRedirectPath, resolveCanonicalCategory } from '../../../../lib/categoryResolution';
import { resolveCategoryRouteData } from '../../../../lib/categoryRouteData';
import { resolveBengaliOverlays } from '../../../../lib/products/bengaliOverlay';
import { BENGALI_CATEGORY_NAMES } from '../../../../lib/products/getHomePageData';

export const dynamic = 'force-dynamic';

const BENGALI_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'rice-and-grain': 'মিনিকেট, নাজিরশাইল ও চিনিগুঁড়া চালের বর্তমান বাজারদর দেখুন।',
  'oil-and-ghee': 'সয়াবিন তেল, সরিষার তেল ও ঘি অনলাইনে কিনুন।',
  'cooking-essentials': 'ডাল, মসলা, আটা, ময়দা, লবণ ও চিনির সেরা পণ্য।',
  'tea-and-coffee': 'ইস্পাহানি, তাজা চা ও কফির আসল পণ্য।',
  breakfast: 'ডিম, দুধ ও সকালের পুষ্টিকর নাস্তার পণ্য।',
  snacks: 'নাস্তা, বিস্কুট ও চানাচুরের সেরা কালেকশন।',
  'personal-care': 'সাবান, শ্যাম্পু ও ব্যক্তিগত পরিচ্ছন্নতার প্রসাধন।',
  'cleaning-supplies': 'ঘরের পরিষ্কার-পরিচ্ছন্নতার নিত্যপ্রয়োজনীয় জিনিস।',
  household: 'ঘরের টুকিটাকি সামগ্রী ও গৃহস্থালি পণ্য।',
  'baby-care': 'শিশুর খাবার ও ডায়াপারের যত্নশীল কালেকশন।',
};

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

  const canonicalPath = getCanonicalCategoryRedirectPath('bn', categorySlug, canonicalSlug, resolvedSearch);
  if (canonicalPath) permanentRedirect(canonicalPath);

  const hasFilters = Object.values(resolvedSearch).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  );

  const rawTitleName = group?.label || currentCatObj?.name || canonicalSlug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const titleName = BENGALI_CATEGORY_NAMES[canonicalSlug] || (group?.slug && BENGALI_CATEGORY_NAMES[group.slug]) || rawTitleName;
  const description = BENGALI_CATEGORY_DESCRIPTIONS[canonicalSlug] || `${titleName} অনলাইনে কিনুন লাকি স্টোর চট্টগ্রাম থেকে। ক্যাশ অন ডেলিভারি এবং দ্রুত হোম ডেলিভারি।`;

  const canonicalUrl = `https://www.luckystore1947.com/bn/category/${canonicalSlug}`;
  const enCanonicalUrl = `https://www.luckystore1947.com/category/${canonicalSlug}`;
  const fullTitle = `${titleName} | লাকি স্টোর চট্টগ্রাম`;
  const imageUrl = 'https://www.luckystore1947.com/lucky-store-social-share.jpg';

  return {
    title: { absolute: fullTitle },
    description,
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: 'লাকি স্টোর',
      locale: 'bn_BD',
      type: 'website',
      images: [
        {
          url: imageUrl,
          alt: `${titleName} - লাকি স্টোর`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
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
        'en-BD': enCanonicalUrl,
        'bn-BD': canonicalUrl,
        'x-default': enCanonicalUrl,
      },
    },
  };
}

export default async function BengaliCategorySlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const rawCategories = await getCachedCategories();
  const { repo } = createProductRepository(supabase);
  let categorySlug: string;
  try {
    categorySlug = decodeURIComponent(resolvedParams.slug);
  } catch {
    notFound();
  }
  const { canonicalSlug, group: initialGroup, currentCatObj } = resolveCanonicalCategory(categorySlug, rawCategories);

  if (!canonicalSlug) {
    notFound();
  }

  const canonicalPath = getCanonicalCategoryRedirectPath('bn', categorySlug, canonicalSlug, resolvedSearch);
  if (canonicalPath) permanentRedirect(canonicalPath);

  const currentCat = canonicalSlug;
  const searchTerm = getSingleParam(resolvedSearch.q) || getSingleParam(resolvedSearch.search);
  const theme = getSingleParam(resolvedSearch.theme);
  const sort = getSingleParam(resolvedSearch.sort) || 'best';

  const routeData = await resolveCategoryRouteData({
    slug: canonicalSlug,
    categories: rawCategories,
    currentCategory: currentCatObj,
    searchTerm,
    repository: repo,
    categoryLabel: (category) => BENGALI_CATEGORY_NAMES[category.slug] || category.name,
  });
  const { group = initialGroup, parentGroup, products: rawProducts, productCount } = routeData;
  if (routeData.error) console.error('Failed to fetch Bengali category products:', routeData.error);

  // Overlay Bengali translations. Products from the shared search overlay
  // already carry bengaliName/bengaliDescription in memory; only products
  // without them trigger a batched DB read (see resolveBengaliOverlays).
  const translationMap = await resolveBengaliOverlays(supabase, rawProducts);
  const products = rawProducts.map((product) => {
    const translation = translationMap.get(String(product.id));
    return translation
      ? {
          ...product,
          originalName: product.name,
          name: translation.name?.trim() || product.name,
          description: translation.description?.trim() || product.description,
        }
      : product;
  });

  const categories = (rawCategories ?? []).map((c) => ({
    ...c,
    name: BENGALI_CATEGORY_NAMES[c.slug] || c.name,
  }));

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
      locale="bn"
    />
  );
}
