import type { Metadata } from 'next';
import { HomeShell } from '../components/HomeShell';
import { getHomePageData } from '../lib/products/getHomePageData';
import { img, srcSet } from '../lib/imageUrl';
import { toProductSlug } from '../lib/products/slugify';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'চট্টগ্রামের অনলাইন গ্রোসারি ও দৈনন্দিন বাজার | Lucky Store',
  description: 'চট্টগ্রামে Lucky Store থেকে দৈনন্দিন বাজারের পণ্য অনলাইনে অর্ডার করুন। চকবাজার থেকে ১ কিমির মধ্যে ৳৫০০+ অর্ডারে ফ্রি ডেলিভারি ও ক্যাশ অন ডেলিভারি।',
  alternates: {
    canonical: 'https://luckystore1947.com/bn',
    languages: {
      'en-BD': 'https://luckystore1947.com/',
      'bn-BD': 'https://luckystore1947.com/bn',
      'x-default': 'https://luckystore1947.com/',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'bn_BD',
    url: 'https://luckystore1947.com/bn',
    siteName: 'Lucky Store',
    title: 'চট্টগ্রামের অনলাইন গ্রোসারি ও দৈনন্দিন বাজার | Lucky Store',
    description: 'চট্টগ্রামে Lucky Store থেকে দৈনন্দিন বাজারের পণ্য অনলাইনে অর্ডার করুন।',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'চট্টগ্রামের অনলাইন গ্রোসারি ও দৈনন্দিন বাজার | Lucky Store',
    description: 'চট্টগ্রামে Lucky Store থেকে দৈনন্দিন বাজারের পণ্য অনলাইনে অর্ডার করুন।',
  },
};

export default async function BengaliHomePage() {
  const data = await getHomePageData('bn');

  // Preload primary campaign hero image (LCP element)
  const primaryHeroAvif = img('/banners/promo_welcome_v2_1200.avif');
  const primaryHeroSrcSet = srcSet(
    '/banners/promo_welcome_v2_400.avif 400w, /banners/promo_welcome_v2_600.avif 600w, /banners/promo_welcome_v2_800.avif 800w, /banners/promo_welcome_v2_1200.avif 1200w'
  );
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://luckystore1947.com/#website',
    url: 'https://luckystore1947.com/bn',
    name: 'Lucky Store (লাকি স্টোর)',
    alternateName: ['Lucky Store 1947', 'লাকি স্টোর', 'Lucky Store Chattogram'],
    description: 'লাকি স্টোর চট্টগ্রামে নিত্যপ্রয়োজনীয় মুদি বাজার, স্ন্যাক্স, ডেইরি ও গৃহস্থালী পণ্য স্থানীয় হোম ডেলিভারি ও ক্যাশ অন ডেলিভারিতে সরবরাহ করে।',
  };
  const productListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'লাকি স্টোরের জনপ্রিয় পণ্যসমূহ',
    itemListElement: data.featuredProducts.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: product.name,
      url: `https://luckystore1947.com/bn/product/${toProductSlug(product.name, product.id)}`,
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
      <link
        rel="preload"
        as="image"
        href={primaryHeroAvif}
        imageSrcSet={primaryHeroSrcSet}
        imageSizes="100vw"
        type="image/avif"
        fetchPriority="high"
      />
      <HomeShell
        {...data}
        locale="bn"
      />
    </>
  );
}
