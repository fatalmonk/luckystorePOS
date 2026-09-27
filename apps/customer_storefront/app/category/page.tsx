import { permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { CategoryShell } from './CategoryShell';
import { createProductRepository } from '../lib/products/index';
import { getCachedCategories } from '../lib/products/getCachedCategories';
import { supabase } from '../lib/supabase';
import { getSingleParam } from '../lib/utils';
import { normalizeCategorySlug, type Category } from '../lib/types';

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

  const canonicalUrl = 'https://www.luckystore1947.com/category';
  const title = 'Browse Products | Lucky Store Chittagong';
  const description = 'Browse all products at Lucky Store — fresh groceries, household items, and more. Search by category, price, and availability. Same-day delivery in Chittagong.';
  const imageUrl = 'https://www.luckystore1947.com/lucky-store-social-share.jpg';

  return {
    title: { absolute: title },
    description,
    robots: hasFilters ? {
      index: false,
      follow: true,
    } : undefined,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en-BD': canonicalUrl,
        'bn-BD': 'https://www.luckystore1947.com/bn/category',
        'x-default': canonicalUrl,
      },
    },
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
          alt: 'Lucky Store Chittagong Catalog',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function CategoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
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
      ? (queryString ? `/category/${normalizedCat}?${queryString}` : `/category/${normalizedCat}`)
      : (queryString ? `/category?${queryString}` : '/category');
    permanentRedirect(destination);
  }

  const searchTerm = getSingleParam(resolvedParams.q) || getSingleParam(resolvedParams.search);
  const theme = getSingleParam(resolvedParams.theme);
  const sort = getSingleParam(resolvedParams.sort) || 'best';
  const categories = await getCachedCategories();
  const { repo } = createProductRepository(supabase);
  const { products } = await repo.search({ query: searchTerm || undefined });

  return (
    <CategoryShell
      categorySlug="all"
      currentCat="all"
      categories={categories}
      products={products}
      theme={theme}
      sort={sort}
      searchParams={resolvedParams}
    />
  );
}
