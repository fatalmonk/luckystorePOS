import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../components/updated/Header';
import { Footer } from '../../components/updated/Footer';
import { BottomNav } from '../../components/BottomNav';
import { DELIVERY_POLICY, COVERED_AREAS } from '../../delivery/deliveryData';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';

export const metadata: Metadata = {
  title: 'চট্টগ্রাম grocery delivery | Lucky Store',
  description: 'চকবাজার থেকে ১ কিমির মধ্যে grocery delivery। ৳৫০০+ অর্ডারে ফ্রি ডেলিভারি, ক্যাশ অন ডেলিভারি ও bKash।',
  alternates: {
    canonical: 'https://luckystore1947.com/bn/delivery',
    languages: {
      'en-BD': 'https://luckystore1947.com/delivery',
      'bn-BD': 'https://luckystore1947.com/bn/delivery',
      'x-default': 'https://luckystore1947.com/delivery',
    },
  },
};

export default function BengaliDeliveryPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-24 text-warm-fg">
        <Breadcrumbs
          homeHref="/bn"
          homeLabel="হোম"
          items={[{ label: 'ডেলিভারি তথ্য', href: '/bn/delivery' }]}
        />
        <header className="mt-8 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-warm-muted">Lucky Store</p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">চট্টগ্রামে অনলাইন grocery delivery</h1>
          <p className="mt-5 text-lg leading-8 text-warm-muted">চকবাজারের Lucky Store থেকে আমাদের যাচাইকৃত ১ কিমি ডেলিভারি জোনের মধ্যে দৈনন্দিন বাজার পৌঁছে দিই।</p>
        </header>
        <section className="mt-10 grid gap-4 sm:grid-cols-3" aria-label="ডেলিভারি সারাংশ">
          <div className="rounded-2xl border border-warm-border bg-warm-surface p-5"><p className="text-sm text-warm-muted">ডেলিভারি জোন</p><p className="mt-2 text-2xl font-black">{DELIVERY_POLICY.radiusKm} কিমি</p><p className="mt-1 text-sm text-warm-muted">চকবাজার থেকে</p></div>
          <div className="rounded-2xl border border-warm-border bg-warm-surface p-5"><p className="text-sm text-warm-muted">ডেলিভারি ফি</p><p className="mt-2 text-2xl font-black">৳{DELIVERY_POLICY.freeDeliveryThresholdBdt}+ ফ্রি</p><p className="mt-1 text-sm text-warm-muted">এর নিচে ফ্ল্যাট ৳{DELIVERY_POLICY.standardDeliveryFeeBdt}</p></div>
          <div className="rounded-2xl border border-warm-border bg-warm-surface p-5"><p className="text-sm text-warm-muted">পেমেন্ট</p><p className="mt-2 text-2xl font-black">COD ও bKash</p><p className="mt-1 text-sm text-warm-muted">পেমেন্টের আগে পণ্য দেখুন</p></div>
        </section>
        <section className="mt-12" aria-labelledby="areas-heading">
          <h2 id="areas-heading" className="text-2xl font-black">যেসব এলাকার কাছাকাছি অংশে ডেলিভারি</h2>
          <p className="mt-2 text-warm-muted">শুধু ১ কিমি GeoCircle-এর ভেতরের রাস্তা ও ঠিকানা কভার করা হয়।</p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {COVERED_AREAS.map((area) => <li key={area.name} className="rounded-xl border border-warm-border bg-warm-surface p-4 font-semibold">{area.name}</li>)}
          </ul>
        </section>
        <section className="mt-12 rounded-2xl border border-warm-border bg-warm-surface p-6" aria-labelledby="hours-heading">
          <h2 id="hours-heading" className="text-2xl font-black">অর্ডার ও ডেলিভারি সময়</h2>
          <p className="mt-3 leading-8 text-warm-muted">প্রতিদিন সকাল {DELIVERY_POLICY.deliveryHours.start} থেকে রাত {DELIVERY_POLICY.deliveryHours.end} পর্যন্ত অর্ডার নেওয়া হয়। ডেলিভারি পার্টনার আসার পর প্যাকেট, ওজন, সিল ও মেয়াদ দেখে পেমেন্ট করুন।</p>
        </section>
        <Link href="/bn/category/rice-and-grain" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-warm-accent px-6 font-bold text-black">কেনাকাটা শুরু করুন</Link>
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
