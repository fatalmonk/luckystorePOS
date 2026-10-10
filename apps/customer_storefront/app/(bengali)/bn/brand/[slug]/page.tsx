import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BrandShell } from '../../../../components/BrandShell';
import { createProductRepository } from '../../../../lib/products/index';
import { getCachedCategories } from '../../../../lib/products/getCachedCategories';
import { getBrandBySlug, isProductOfBrand } from '../../../../lib/brandsData';
import { supabase } from '../../../../lib/supabase';

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

  const categories = await getCachedCategories();
  const rawProductsMap = new Map<string, any>();

  await Promise.all(
    searchTerms.map(async (term) => {
      let page = 0;
      let hasMore = true;
      const maxPages = 10;
      while (hasMore && page < maxPages) {
        const pageResult = await repo.search({
          query: term,
          limit: 1000,
          page,
        });
        for (const p of pageResult.products) {
          if (!rawProductsMap.has(p.id)) {
            rawProductsMap.set(p.id, p);
          }
        }
        hasMore = pageResult.hasMore;
        page++;
      }
    })
  );

  const allProducts = Array.from(rawProductsMap.values());
  const matchedProducts = allProducts.filter((p) => isProductOfBrand(p, brand));

  // Overlay published Bengali translations
  const productIds = matchedProducts.map((p) => p.id);
  const { data: translations } = productIds.length
    ? await (supabase as any)
        .from('item_translations')
        .select('item_id, name, description')
        .in('item_id', productIds)
        .eq('locale', 'bn')
        .eq('review_status', 'published')
    : { data: [] };

  const translationMap = new Map((translations ?? []).map((t: any) => [t.item_id, t]));
  const products = matchedProducts.map((product) => {
    const translation: any = translationMap.get(product.id);
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
