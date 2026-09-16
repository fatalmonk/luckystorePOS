import React from 'react';
import { permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { CategoryShell } from '../../category/CategoryShell';
import { createProductRepository } from '../../lib/products/index';
import { getCachedCategories } from '../../lib/products/getCachedCategories';
import { supabase } from '../../lib/supabase';
import { getSingleParam } from '../../lib/utils';
import { normalizeCategorySlug } from '../../lib/types';
import { BENGALI_CATEGORY_NAMES } from '../../lib/products/getHomePageData';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const hasFilters = Object.values(resolvedParams).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  );

  return {
    title: 'পণ্য ব্রাউজ করুন | লাকি স্টোর',
    description: 'লাকি স্টোরের সব পণ্য দেখুন — তাজা মুদি বাজার, চকবাজারে ক্যাশ অন ডেলিভারি।',
    robots: hasFilters ? {
      index: false,
      follow: true,
    } : undefined,
    alternates: {
      canonical: 'https://luckystore1947.com/bn/category',
      languages: {
        'en-BD': 'https://luckystore1947.com/category',
        'bn-BD': 'https://luckystore1947.com/bn/category',
        'x-default': 'https://luckystore1947.com/category',
      },
    },
  };
}

export default async function BengaliCategoryRootPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await searchParams;

  const catParam = resolvedParams.cat;
  if (catParam) {
    const rawCat = Array.isArray(catParam) ? catParam[0] : catParam;
    const normalizedCat = normalizeCategorySlug(String(rawCat).trim());
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(resolvedParams)) {
      if (key !== 'cat' && typeof value === 'string') params.set(key, value);
    }
    const queryString = params.toString();
    const destination = normalizedCat
      ? (queryString ? `/bn/category/${normalizedCat}?${queryString}` : `/bn/category/${normalizedCat}`)
      : (queryString ? `/bn/category?${queryString}` : '/bn/category');
    permanentRedirect(destination);
  }

  const searchTerm = getSingleParam(resolvedParams.q) || getSingleParam(resolvedParams.search);
  const theme = getSingleParam(resolvedParams.theme);
  const sort = getSingleParam(resolvedParams.sort) || 'best';
  const rawCategories = await getCachedCategories();
  const categories = (rawCategories ?? []).map((cat) => ({
    ...cat,
    name: BENGALI_CATEGORY_NAMES[cat.slug] || cat.name,
  }));

  const { repo } = createProductRepository(supabase);
  const { products: rawProducts } = await repo.search({ query: searchTerm || undefined });

  // Overlay Bengali translations
  const productIds = (rawProducts ?? []).map((p) => p.id);
  const { data: translations } = productIds.length
    ? await (supabase as any)
        .from('item_translations')
        .select('item_id, name, description')
        .in('item_id', productIds)
        .eq('locale', 'bn')
        .eq('review_status', 'published')
    : { data: [] };

  const translationMap = new Map((translations ?? []).map((t: any) => [t.item_id, t]));
  const products = (rawProducts ?? []).map((p) => {
    const trans: any = translationMap.get(p.id);
    return trans
      ? { ...p, name: trans.name?.trim() || p.name, description: trans.description?.trim() || p.description }
      : p;
  });

  return (
    <CategoryShell
      categorySlug="all"
      currentCat="all"
      categories={categories}
      products={products}
      theme={theme}
      sort={sort}
      searchParams={resolvedParams}
      locale="bn"
    />
  );
}
