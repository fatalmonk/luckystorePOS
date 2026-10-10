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
  const searchTerms = brand.searchQueries && brand.searchQueries.length > 0
    ? brand.searchQueries
    : [brand.searchQuery];

  const [categories, ...queryResults] = await Promise.all([
    getCachedCategories(),
    ...searchTerms.map((term) =>
      repo.search({
        query: term,
        limit: 1000,
        page: 0,
      })
    ),
  ]);

  const rawProductsMap = new Map<string, any>();
  for (const res of queryResults) {
    for (const p of res.products) {
      if (!rawProductsMap.has(p.id)) {
        rawProductsMap.set(p.id, p);
      }
    }
  }

  const allProducts = Array.from(rawProductsMap.values());
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
