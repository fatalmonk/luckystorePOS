import React from 'react';
import type { Metadata } from 'next';
import { loadWeeklyDeals } from '../../../lib/deals';
import { supabase } from '../../../lib/supabase';
import { toProductSlug } from '../../../lib/products/slugify';
import { DealOfTheWeekClient } from './DealOfTheWeekClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BASE_URL = 'https://www.luckystore1947.com';
const CANONICAL_URL = `${BASE_URL}/best/dealoftheweek`;

export async function generateMetadata(): Promise<Metadata> {
  const result = await loadWeeklyDeals(supabase, new Date(), 1);
  const active = result.activeEdition;

  const title = active
    ? 'Deal of the Week: Weekly Specials | Lucky Store'
    : 'Deal of the Week: Current Store Offers | Lucky Store';

  const description = active
    ? 'Browse this week’s editor-verified promotions at Lucky Store with an extra 5% off at online checkout. Accurate prices and fast home delivery in Chattogram.'
    : 'Browse current eligible offers across Lucky Store products in Chattogram. Check verified prices, pack sizes, and real inventory before ordering.';

  return {
    title,
    description,
    alternates: {
      canonical: CANONICAL_URL,
    },
    openGraph: {
      title,
      description,
      url: CANONICAL_URL,
      type: 'website',
      siteName: 'Lucky Store',
      images: [
        {
          url: '/lucky-store-social-share-v2.png',
          width: 1200,
          height: 630,
          alt: 'Lucky Store Deal of the Week',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/lucky-store-social-share-v2.png'],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function DealOfTheWeekPage() {
  const dealsData = await loadWeeklyDeals(supabase, new Date(), 48);

  // Generate commercial CollectionPage, ItemList, and BreadcrumbList structured data
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${BASE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Deal of the Week',
        item: CANONICAL_URL,
      },
    ],
  };

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: dealsData.activeEdition
      ? 'Lucky Store Deal of the Week: Weekly Specials'
      : 'Lucky Store Deal of the Week: Current Store Offers',
    url: CANONICAL_URL,
    description: dealsData.activeEdition
      ? 'Verified weekly specials and promotions at Lucky Store with online checkout savings.'
      : 'Current verified discounts and offers across Lucky Store groceries and essentials.',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: dealsData.products.slice(0, 24).map((product, index) => {
        const productUrl = `${BASE_URL}/product/${toProductSlug(product.name, product.id)}`;
        return {
          '@type': 'ListItem',
          position: index + 1,
          url: productUrl,
          item: {
            '@type': 'Product',
            name: product.name,
            url: productUrl,
            image: product.image_url || `${BASE_URL}/logo-main.png`,
            offers: {
              '@type': 'Offer',
              price: product.promotionalPrice ?? product.price,
              priceCurrency: 'BDT',
              availability: 'https://schema.org/InStock',
              seller: {
                '@type': 'Organization',
                name: 'Lucky Store',
              },
            },
          },
        };
      }),
    },
  };

  return (
    <main id="main-content" className="min-h-screen bg-warm-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <DealOfTheWeekClient
        products={dealsData.products}
        activeEdition={dealsData.activeEdition}
        editionPeriod={dealsData.editionPeriod}
        campaignKey={dealsData.campaignKey}
        endsAt={dealsData.endsAt}
        error={dealsData.error}
      />
    </main>
  );
}
