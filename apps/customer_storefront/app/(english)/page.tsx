import type { Metadata } from 'next';
import { HomeShell } from '../components/HomeShell';
import { getHomePageData } from '../lib/products/getHomePageData';
import { toProductSlug } from '../lib/products/slugify';

export const revalidate = 60;

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://www.luckystore1947.com/',
    languages: {
      'en-BD': 'https://www.luckystore1947.com/',
      'bn-BD': 'https://www.luckystore1947.com/bn',
      'x-default': 'https://www.luckystore1947.com/',
    },
  },
};

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
    itemListElement: data.featuredProducts.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: product.name,
      url: `https://www.luckystore1947.com/product/${toProductSlug(product.name, product.id)}`,
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
      <link rel="preload" as="image" href="/images/hero-reference.webp" fetchPriority="high" />
      <HomeShell
        {...data}
        locale="en"
      />
    </>
  );
}
