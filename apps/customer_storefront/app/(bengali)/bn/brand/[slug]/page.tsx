import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BrandShell } from '../../../../components/BrandShell';
import { createProductRepository } from '../../../../lib/products/index';
import { getCachedCategories } from '../../../../lib/products/getCachedCategories';
import { getBrandBySlug, isProductOfBrand } from '../../../../lib/brandsData';
import { supabase } from '../../../../lib/supabase';
import { searchAllPages } from '../../../../lib/products/searchAllPages';
import { resolveBengaliOverlays } from '../../../../lib/products/bengaliOverlay';

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

  const enUrl = `https://www.luckystore1947.com/brand/${brand.slug}`;
  const canonicalUrl = `https://www.luckystore1947.com/bn/brand/${brand.slug}`;

  return {
    title: { absolute: brand.titleBn },
    description: brand.descBn,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en-BD': enUrl,
        'bn-BD': canonicalUrl,
        'x-default': enUrl,
      },
    },
    openGraph: {
      type: 'website',
      locale: 'bn_BD',
      url: canonicalUrl,
      siteName: 'লাকি স্টোর',
      title: brand.titleBn,
      description: brand.descBn,
      images: [
        {
          url: '/lucky-store-social-share-v2.png',
          alt: brand.bengaliName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: brand.titleBn,
      description: brand.descBn,
      images: ['/lucky-store-social-share-v2.png'],
    },
  };
}

export default async function BengaliBrandPage({
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

  // Search terms run concurrently; each term pages only as far as needed,
  // with a ten-page bound to keep broad searches from running indefinitely.
  const [categories, ...perTermResults] = await Promise.all([
    getCachedCategories(),
    ...searchTerms.map((term) => searchAllPages(repo, term)),
  ]);

  const rawProductsMap = new Map<string, any>();
  for (const termProducts of perTermResults) {
    for (const p of termProducts) {
      if (!rawProductsMap.has(p.id)) {
        rawProductsMap.set(p.id, p);
      }
    }
  }

  const allProducts = Array.from(rawProductsMap.values());
  const matchedProducts = allProducts.filter((p) => isProductOfBrand(p, brand));

  // Overlay Bengali translations. Products from the shared search overlay
  // already carry bengaliName/bengaliDescription in memory; only products
  // without them trigger a batched DB read (see resolveBengaliOverlays).
  const translationMap = await resolveBengaliOverlays(supabase, matchedProducts);
  const products = matchedProducts.map((product) => {
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

  return (
    <BrandShell
      brand={brand}
      products={products}
      categories={categories as any}
      locale="bn"
      searchParams={resolvedSearch}
    />
  );
}
