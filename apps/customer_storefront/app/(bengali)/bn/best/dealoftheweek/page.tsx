import React from 'react';
import type { Metadata } from 'next';
import { loadWeeklyDeals } from '../../../../lib/deals';
import { supabase } from '../../../../lib/supabase';
import { toProductSlug } from '../../../../lib/products/slugify';
import { DealOfTheWeekClient } from '../../../../(english)/best/dealoftheweek/DealOfTheWeekClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BASE_URL = 'https://www.luckystore1947.com';
const CANONICAL_URL = `${BASE_URL}/bn/best/dealoftheweek`;
const ENGLISH_URL = `${BASE_URL}/best/dealoftheweek`;

export async function generateMetadata(): Promise<Metadata> {
  const result = await loadWeeklyDeals(supabase, new Date(), 1);
  const title = result.activeEdition
    ? 'সপ্তাহের সেরা অফার | লাকি স্টোর'
    : 'লাকি স্টোরের বর্তমান অফার';
  const description = result.activeEdition
    ? 'লাকি স্টোরের যাচাইকৃত সাপ্তাহিক অফার দেখুন। অনলাইন চেকআউটে অতিরিক্ত ৫% ছাড় প্রযোজ্য।'
    : 'চট্টগ্রামের লাকি স্টোরে বর্তমান যাচাইকৃত অফার, মূল্য ও পণ্যের তথ্য দেখুন।';

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: CANONICAL_URL,
      languages: {
        'bn-BD': CANONICAL_URL,
        'en-BD': ENGLISH_URL,
        'x-default': ENGLISH_URL,
      },
    },
    openGraph: {
      title,
      description,
      url: CANONICAL_URL,
      type: 'website',
      siteName: 'লাকি স্টোর',
      locale: 'bn_BD',
      images: [{ url: '/lucky-store-social-share-v2.png', width: 1200, height: 630, alt: 'লাকি স্টোরের সাপ্তাহিক অফার' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/lucky-store-social-share-v2.png'],
    },
    robots: { index: true, follow: true },
  };
}

function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function toAbsoluteImageUrl(rawUrl?: string | null): string {
  const trimmed = rawUrl?.trim();
  if (!trimmed) return `${BASE_URL}/logo-main.png`;
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  return `${BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

export default async function BengaliDealOfTheWeekPage() {
  const dealsData = await loadWeeklyDeals(supabase, new Date(), 48);
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'হোম', item: `${BASE_URL}/bn` },
      { '@type': 'ListItem', position: 2, name: 'সপ্তাহের সেরা অফার', item: CANONICAL_URL },
    ],
  };
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'লাকি স্টোরের সপ্তাহের সেরা অফার',
    url: CANONICAL_URL,
    inLanguage: 'bn-BD',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: dealsData.products.slice(0, 24).map((product, index) => {
        const productUrl = `${BASE_URL}/bn/product/${toProductSlug(product.name, product.id)}`;
        return {
          '@type': 'ListItem',
          position: index + 1,
          url: productUrl,
          item: {
            '@type': 'Product',
            name: product.name,
            url: productUrl,
            image: toAbsoluteImageUrl(product.image_url),
            offers: {
              '@type': 'Offer',
              price: product.promotionalPrice ?? product.price,
              priceCurrency: 'BDT',
              availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              seller: { '@type': 'Organization', name: 'লাকি স্টোর' },
            },
          },
        };
      }),
    },
  };

  return (
    <main id="main-content" className="min-h-screen bg-warm-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionSchema) }} />
      <DealOfTheWeekClient
        products={dealsData.products}
        activeEdition={dealsData.activeEdition}
        editionPeriod={dealsData.editionPeriod}
        campaignKey={dealsData.campaignKey}
        endsAt={dealsData.endsAt}
        degradedReason={dealsData.degradedReason}
        error={dealsData.error}
        locale="bn"
      />
    </main>
  );
}
