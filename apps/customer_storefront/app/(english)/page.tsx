import type { Metadata } from 'next';
import { HomeShell } from '../components/HomeShell';
import { getHomePageData } from '../lib/products/getHomePageData';
import { toProductSlug } from '../lib/products/slugify';
import { DELIVERY_POLICY } from '../lib/deliveryData';

export const revalidate = 120;

const homepageTitle = `${DELIVERY_POLICY.storeName} ${DELIVERY_POLICY.shortLocation} | Since ${DELIVERY_POLICY.establishedYear}`;
const homepageDescription = `${DELIVERY_POLICY.storeName} in ${DELIVERY_POLICY.shortLocation} since ${DELIVERY_POLICY.establishedYear}. Delivery ${DELIVERY_POLICY.deliveryHours.display}; pay ${DELIVERY_POLICY.paymentMethods.cod.replace(/ \(COD\)$/, '')} or ${DELIVERY_POLICY.paymentMethods.bkash.split(' (')[0]} after doorstep inspection.`;

export const metadata: Metadata = {
  title: {
    absolute: homepageTitle,
  },
  description: homepageDescription,
  alternates: {
    canonical: 'https://www.luckystore1947.com/',
    languages: {
      'en-BD': 'https://www.luckystore1947.com/',
      'bn-BD': 'https://www.luckystore1947.com/bn',
      'x-default': 'https://www.luckystore1947.com/',
    },
  },
  openGraph: {
    title: homepageTitle,
    description: homepageDescription,
    url: 'https://www.luckystore1947.com/',
    siteName: 'Lucky Store',
    locale: 'en_BD',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: homepageTitle,
    description: homepageDescription,
  },
};

/** Loads English homepage data and renders structured data and the home shell. */
export default async function Home() {
  const data = await getHomePageData('en');

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://www.luckystore1947.com/#website',
    url: 'https://www.luckystore1947.com/',
    name: 'Lucky Store',
    alternateName: ['Lucky Store 1947', 'Lucky Store Chattogram'],
    description: 'Lucky Store offers pantry staples, snacks, dairy, and household essentials with local delivery and cash on delivery in Chattogram.',
  };
  const productListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Featured groceries at Lucky Store',
    itemListElement: data.featuredProducts
      .filter((product) => Number.isFinite(product.price) && product.price > 0)
      .map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: product.name,
        url: `https://www.luckystore1947.com/product/${toProductSlug(product.name, product.id)}`,
        ...(!data.catalogSnapshotFallback && Number.isFinite(product.price) && product.price > 0
          ? { offers: { '@type': 'Offer', priceCurrency: 'BDT', price: product.price } }
          : {}),
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productListJsonLd).replace(/</g, '\\u003c') }}
      />
      <HomeShell
        {...data}
        locale="en"
      />
    </>
  );
}
