import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Header } from '../../components/updated/Header';
import { HomeShell } from '../../components/HomeShell';
import { getHomePageData } from '../../lib/products/getHomePageData';
import { toProductSlug } from '../../lib/products/slugify';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'চট্টগ্রামের অনলাইন গ্রোসারি ও দৈনন্দিন বাজার | Lucky Store' },
  description: 'চট্টগ্রামে Lucky Store থেকে দৈনন্দিন বাজারের পণ্য অনলাইনে অর্ডার করুন। চকবাজার থেকে ১ কিমির মধ্যে ৳৫০০+ অর্ডারে ফ্রি ডেলিভারি ও ক্যাশ অন ডেলিভারি।',
  alternates: {
    canonical: 'https://www.luckystore1947.com/bn',
    languages: {
      'en-BD': 'https://www.luckystore1947.com/',
      'bn-BD': 'https://www.luckystore1947.com/bn',
      'x-default': 'https://www.luckystore1947.com/',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'bn_BD',
    url: 'https://www.luckystore1947.com/bn',
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

/** Streams the hero while live storefront data loads on the server. */
export default function BengaliHomePage() {
  return (
    <Suspense fallback={<BengaliHomeFallback />}>
      <BengaliHomeContent />
    </Suspense>
  );
}

function BengaliHomeFallback() {
  return (
    <>
      <Header locale="bn" />
      <main id="main-content" className="flex-1 overflow-x-clip pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto max-w-7xl px-4 pb-4 pt-2 sm:px-6 sm:pb-8 sm:pt-4 lg:pb-10">
          <section
            role="status"
            aria-label="হোমপেজ লোড হচ্ছে"
            aria-busy="true"
            className="min-h-[17rem] rounded-2xl bg-warm-surface sm:min-h-[20rem] lg:min-h-[24rem]"
          >
            <span className="sr-only">হোমপেজ লোড হচ্ছে…</span>
            <div aria-hidden="true" className="space-y-4 px-5 py-10 sm:px-8 sm:py-14">
              <div className="h-3 w-36 rounded bg-warm-border/50 motion-safe:animate-pulse" />
              <div className="h-10 w-3/4 rounded bg-warm-border/50 motion-safe:animate-pulse" />
              <div className="h-12 w-full max-w-md rounded-full bg-warm-border/50 motion-safe:animate-pulse" />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

/** Loads Bengali homepage data and renders structured data and the home shell. */
async function BengaliHomeContent() {
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
    itemListElement: data.featuredProducts.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: product.name,
      url: `https://www.luckystore1947.com/bn/product/${toProductSlug(product.name, product.id)}`,
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
