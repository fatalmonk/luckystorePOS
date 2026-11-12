import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Header } from '../../components/updated/Header';
import { BengaliHomeContent } from './BengaliHomeContent';

export const revalidate = 120;

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
