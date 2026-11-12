import { HomeShell } from '../../components/HomeShell';
import { getHomePageData } from '../../lib/products/getHomePageData';
import { catalogProductSlug } from '../../lib/products/slugify';

/** Loads Bengali homepage data and renders structured data and the home shell. */
export async function BengaliHomeContent() {
  const data = await getHomePageData('bn');

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://www.luckystore1947.com/#website',
    url: 'https://www.luckystore1947.com/bn',
    name: 'Lucky Store (লাকি স্টোর)',
    alternateName: ['Lucky Store 1947', 'লাকি স্টোর', 'Lucky Store Chattogram'],
    description: 'লাকি স্টোর চট্টগ্রামে নিত্যপ্রয়োজনীয় মুদি বাজার, স্ন্যাক্স, ডেইরি ও গৃহস্থালী পণ্য স্থানীয় হোম ডেলিভারি ও ক্যাশ অন ডেলিভারিতে সরবরাহ করে।',
  };
  const productListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'লাকি স্টোরের জনপ্রিয় পণ্যসমূহ',
    itemListElement: data.featuredProducts
      .filter((product) => Number.isFinite(product.price) && product.price > 0)
      .map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: product.name,
        url: `https://www.luckystore1947.com/bn/product/${catalogProductSlug(product)}`,
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
        locale="bn"
      />
    </>
  );
}
