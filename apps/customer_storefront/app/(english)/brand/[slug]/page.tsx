import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BrandShell } from '../../../components/BrandShell';
import { createProductRepository } from '../../../lib/products/index';
import { getCachedCategories } from '../../../lib/products/getCachedCategories';
import { getBrandBySlug, isProductOfBrand } from '../../../lib/brandsData';
import { supabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = getBrandBySlug(slug);

  if (!brand) {
    notFound();
  }

  const canonicalUrl = `https://www.luckystore1947.com/brand/${brand.slug}`;
  const bnUrl = `https://www.luckystore1947.com/bn/brand/${brand.slug}`;

  return {
    title: { absolute: brand.titleEn },
    description: brand.descEn,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en-BD': canonicalUrl,
        'bn-BD': bnUrl,
        'x-default': canonicalUrl,
      },
    },
    openGraph: {
      type: 'website',
      locale: 'en_BD',
      url: canonicalUrl,
      siteName: 'Lucky Store',
      title: brand.titleEn,
      description: brand.descEn,
      images: [
        {
          url: '/lucky-store-social-share-v2.png',
          alt: brand.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: brand.titleEn,
      description: brand.descEn,
      images: ['/lucky-store-social-share-v2.png'],
    },
  };
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const resolvedSearch = await searchParams;
  const brand = getBrandBySlug(slug);

  if (!brand) {
    notFound();
  }

  const { repo } = createProductRepository(supabase);
  const [categories, firstPageResult] = await Promise.all([
    getCachedCategories(),
    repo.search({
      query: brand.searchQuery,
      limit: 1000,
      page: 0,
    }),
  ]);

  const allProducts: any[] = [...firstPageResult.products];
  let page = 1;
  let hasMore = firstPageResult.hasMore;
  const maxPages = 10;

  while (hasMore && page < maxPages) {
    const nextPage = await repo.search({
      query: brand.searchQuery,
      limit: 1000,
      page,
    });
    allProducts.push(...nextPage.products);
    hasMore = nextPage.hasMore;
    page++;
  }

  const matchedProducts = allProducts.filter((p) => isProductOfBrand(p, brand));

  return (
    <BrandShell
      brand={brand}
      products={matchedProducts}
      categories={categories as any}
      locale="en"
      searchParams={resolvedSearch}
    />
  );
}
