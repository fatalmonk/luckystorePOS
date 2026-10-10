import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Header } from '../../../components/updated/Header';
import { Footer } from '../../../components/updated/Footer';
import { BottomNav } from '../../../components/BottomNav';
import { Breadcrumbs } from '../../../components/ui/Breadcrumbs';
import { JsonLd } from '../../../components/seo/JsonLd';
import { POPULAR_BRANDS, type BrandDefinition } from '../../../lib/brandsData';

export const metadata: Metadata = {
  title: { absolute: 'জনপ্রিয় ব্র্যান্ডসমূহ চট্টগ্রাম | লাকি স্টোর' },
  description: 'আসল রাঁধুনী, আড়ং, রূপচাঁদা, তীর, ফ্রেশ, ইস্পাহানি, পোলার ও নেসলে পণ্য কিনুন চকবাজার লাকি স্টোরে। ডোরস্টেপ চেকিং ও ক্যাশ অন ডেলিভারি।',
  alternates: {
    canonical: 'https://www.luckystore1947.com/bn/brand',
    languages: {
      'en-BD': 'https://www.luckystore1947.com/brand',
      'bn-BD': 'https://www.luckystore1947.com/bn/brand',
      'x-default': 'https://www.luckystore1947.com/brand',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'bn_BD',
    url: 'https://www.luckystore1947.com/bn/brand',
    siteName: 'লাকি স্টোর',
    title: 'জনপ্রিয় ব্র্যান্ডসমূহ চট্টগ্রাম | লাকি স্টোর',
    description: 'আসল ও খাঁটি ব্র্যান্ড পণ্য কিনুন ঘরে বসেই। চকবাজার ১ কিমি ডেলিভারি।',
  },
};

export default function BengaliBrandsDirectoryPage() {
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'জনপ্রিয় ব্র্যান্ডসমূহ চট্টগ্রাম',
    description: 'লাকি স্টোরে সহজলভ্য জনপ্রিয় ও বিশ্বস্ত গ্রোসারি ব্র্যান্ডসমূহ।',
    url: 'https://www.luckystore1947.com/bn/brand',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: POPULAR_BRANDS.map((b, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: b.bengaliName,
        url: `https://www.luckystore1947.com/bn/brand/${b.slug}`,
      })),
    },
  };

  return (
    <>
      <JsonLd data={collectionSchema} />
      <Header />

      <main className="flex-1 overflow-x-clip pb-16">
        <div className="p-4 sm:p-6 space-y-8 max-w-7xl mx-auto">
          <Breadcrumbs
            homeHref="/bn"
            homeLabel="হোম"
            items={[{ label: 'ব্র্যান্ডসমূহ', href: '/bn/brand' }]}
          />

          <header className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-warm-border bg-warm-surface px-3.5 py-1 text-xs font-black uppercase tracking-wider text-warm-fg">
              <span className="inline-block h-2 w-2 rounded-full bg-warm-accent" aria-hidden="true" />
              বিশ্বস্ত নিত্যপণ্য ব্র্যান্ড
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-warm-fg">
              লাকি স্টোরের জনপ্রিয় ব্র্যান্ডসমূহ
            </h1>
            <p className="max-w-3xl text-base sm:text-lg leading-relaxed text-warm-muted">
              বাংলাদেশের সেরা ও বিশ্বস্ত এফএমসিজি, মসলা, তেল, ডেইরি ও স্নাক্স ব্র্যান্ডের আসল পণ্য ঘরে বসেই অর্ডার করুন। চকবাজারের ১ কিমি এলাকার মধ্যে দ্রুত ডেলিভারি ও ১০০% ডোরস্টেপ পরিদর্শনের নিশ্চয়তা।
            </p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {POPULAR_BRANDS.map((b) => (
              <Link
                key={b.slug}
                href={`/bn/brand/${b.slug}`}
                className="group relative flex flex-col justify-between rounded-2xl border border-warm-border bg-warm-surface p-5 shadow-warm-sm transition-all hover:border-warm-accent hover:shadow-warm-md hover:-translate-y-0.5"
              >
                <div>
                  <div className="relative mb-3 flex h-16 w-full items-center justify-center overflow-hidden rounded-warm-control border border-warm-border/60 bg-warm-image-well transition-colors group-hover:border-warm-accent/50">
                    {b.logoUrl ? (
                      <Image
                        src={b.logoUrl}
                        alt={`${b.bengaliName} লোগো`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-contain p-2.5 transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <span className="text-sm font-black uppercase tracking-wider text-warm-muted">
                        {b.bengaliName.slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <span className="inline-block rounded-full bg-warm-bg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-warm-muted group-hover:text-warm-fg">
                    {b.badgeBn}
                  </span>
                  <h2 className="mt-2 text-xl font-black text-warm-fg group-hover:text-warm-accent transition-colors">
                    {b.bengaliName}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-warm-muted line-clamp-2">
                    {b.summaryBn}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-warm-border/50 flex items-center justify-between text-xs font-bold text-warm-muted group-hover:text-warm-fg">
                  <span>পণ্যসমূহ দেখুন</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <Footer locale="bn" />
      </main>
      <BottomNav locale="bn" />
    </>
  );
}
