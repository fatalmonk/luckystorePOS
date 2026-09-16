import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../components/updated/Header';
import { Footer } from '../components/updated/Footer';
import { BottomNav } from '../components/BottomNav';

export const metadata: Metadata = {
  title: 'চট্টগ্রামের অনলাইন গ্রোসারি ও দৈনন্দিন বাজার | Lucky Store',
  description: 'চট্টগ্রামে Lucky Store থেকে দৈনন্দিন বাজারের পণ্য অনলাইনে অর্ডার করুন।',
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

export default function BengaliHomePage() {
  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-4xl flex-col justify-center px-6 py-24 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-warm-muted">Lucky Store</p>
        <h1 className="mt-4 text-3xl font-extrabold text-warm-fg sm:text-5xl">চট্টগ্রামের অনলাইন গ্রোসারি ও দৈনন্দিন বাজার</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-warm-muted">চকবাজার থেকে ১ কিমির মধ্যে দৈনন্দিন বাজারের পণ্য অর্ডার করুন। ৳৫০০ বা তার বেশি অর্ডারে ফ্রি ডেলিভারি, সঙ্গে ক্যাশ অন ডেলিভারি ও bKash।</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/bn/category/rice-and-grain" className="inline-flex min-h-12 items-center rounded-full bg-warm-accent px-6 font-bold text-black">চাল ও শস্য দেখুন</Link>
          <Link href="/bn/delivery" className="inline-flex min-h-12 items-center rounded-full border border-warm-border px-6 font-bold text-warm-fg">ডেলিভারি তথ্য</Link>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
