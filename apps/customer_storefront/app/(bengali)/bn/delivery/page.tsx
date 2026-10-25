import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '../../../components/updated/Header';
import { Footer } from '../../../components/updated/Footer';
import { BottomNav } from '../../../components/BottomNav';
import { DELIVERY_POLICY, COVERED_AREAS, BENGALI_DELIVERY_FAQS, getBengaliDeliveryFaqSchema } from '../../../lib/deliveryData';
import { Breadcrumbs } from '../../../components/ui/Breadcrumbs';
import { JsonLd } from '../../../components/seo/JsonLd';

export const metadata: Metadata = {
  title: { absolute: 'চট্টগ্রাম grocery delivery | Lucky Store' },
  description: 'চকবাজার থেকে ১ কিমির মধ্যে grocery delivery। ৳৫০০+ অর্ডারে ফ্রি ডেলিভারি, ক্যাশ অন ডেলিভারি ও bKash।',
  alternates: {
    canonical: 'https://www.luckystore1947.com/bn/delivery',
    languages: {
      'en-BD': 'https://www.luckystore1947.com/delivery',
      'bn-BD': 'https://www.luckystore1947.com/bn/delivery',
      'x-default': 'https://www.luckystore1947.com/delivery',
    },
  },
  openGraph: {
    title: 'চট্টগ্রাম grocery delivery | Lucky Store',
    description: 'চকবাজার থেকে ১ কিমির মধ্যে grocery delivery। ৳৫০০+ অর্ডারে ফ্রি ডেলিভারি, ক্যাশ অন ডেলিভারি ও bKash।',
    url: 'https://www.luckystore1947.com/bn/delivery',
    siteName: 'লাকি স্টোর',
    locale: 'bn_BD',
    type: 'website',
    images: [
      {
        url: '/lucky-store-social-share-v2.png',
        width: 1200,
        height: 630,
        alt: 'চট্টগ্রাম grocery delivery | Lucky Store',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'চট্টগ্রাম grocery delivery | Lucky Store',
    description: 'চকবাজার থেকে ১ কিমির মধ্যে grocery delivery। ৳৫০০+ অর্ডারে ফ্রি ডেলিভারি, ক্যাশ অন ডেলিভারি ও bKash।',
    images: ['/lucky-store-social-share-v2.png'],
  },
};

export default function BengaliDeliveryPage() {
  return (
    <>
      <JsonLd data={getBengaliDeliveryFaqSchema()} />
      <Header locale="bn" />
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
        <section className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4" aria-label="দ্রুত ডেলিভারি তথ্য">
          <div className="rounded-2xl border border-warm-border bg-warm-surface p-4 sm:p-5"><p className="text-xs text-warm-muted">কোথায় ডেলিভারি দেন?</p><p className="mt-2 text-lg sm:text-2xl font-black">{DELIVERY_POLICY.radiusKm} কিমির মধ্যে</p><p className="mt-1 text-xs text-warm-muted">চকবাজারের স্টোর থেকে</p></div>
          <div className="rounded-2xl border border-warm-border bg-warm-surface p-4 sm:p-5"><p className="text-xs text-warm-muted">ডেলিভারি চার্জ কত?</p><p className="mt-2 text-lg sm:text-2xl font-black">৳{DELIVERY_POLICY.freeDeliveryThresholdBdt}+ অর্ডারে ফ্রি</p><p className="mt-1 text-xs text-warm-muted">এর কমে ৳{DELIVERY_POLICY.standardDeliveryFeeBdt}</p></div>
          <div className="rounded-2xl border border-warm-border bg-warm-surface p-4 sm:p-5"><p className="text-xs text-warm-muted">কখন ডেলিভারি দেন?</p><p className="mt-2 text-lg sm:text-2xl font-black">{DELIVERY_POLICY.deliveryHours.display}</p><p className="mt-1 text-xs text-warm-muted">প্রতিদিন</p></div>
          <div className="rounded-2xl border border-warm-border bg-warm-surface p-4 sm:p-5"><p className="text-xs text-warm-muted">কীভাবে পেমেন্ট করব?</p><p className="mt-2 text-sm sm:text-base font-black">{DELIVERY_POLICY.paymentMethods.cod}</p><p className="mt-1 text-xs text-warm-muted">{DELIVERY_POLICY.paymentMethods.bkash}</p></div>
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
          <p className="mt-3 leading-8 text-warm-muted">প্রতিদিন সকাল {DELIVERY_POLICY.deliveryHours.start} থেকে রাত {DELIVERY_POLICY.deliveryHours.end} পর্যন্ত অর্ডার নেওয়া হয়।</p>
        </section>
        <section className="mt-12 rounded-2xl border border-warm-border bg-warm-surface p-6" aria-labelledby="payment-heading">
          <h2 id="payment-heading" className="text-2xl font-black">পেমেন্ট ও পণ্য পরীক্ষা পদ্ধতি</h2>
          <p className="mt-3 leading-8 text-warm-muted">ক্যাশ অন ডেলিভারি (COD) ও bKash-এ পেমেন্ট সুবিধা রয়েছে। ডেলিভারি পার্টনারের কাছ থেকে প্যাকেট, ওজন, সিল ও মেয়াদ নিজে দেখে নিশ্চিত হয়ে তারপর নিশ্চিন্তে পেমেন্ট করুন।</p>
        </section>
        <section className="mt-12" aria-labelledby="delivery-faq-heading">
          <h2 id="delivery-faq-heading" className="text-2xl font-black">ডেলিভারি সম্পর্কে সাধারণ প্রশ্ন</h2>
          <dl className="mt-5 space-y-4">
            {BENGALI_DELIVERY_FAQS.map((faq) => {
              const linkedAreaText = 'ডেলিভারি এলাকার তথ্য';
              const linkIndex = faq.answer.indexOf(linkedAreaText);

              return (
                <div key={faq.question} className="rounded-2xl border border-warm-border bg-warm-surface p-5">
                  <dt className="font-bold">{faq.question}</dt>
                  <dd className="mt-2 leading-7 text-warm-muted">
                    {linkIndex === -1 ? faq.answer : (
                      <>
                        {faq.answer.slice(0, linkIndex)}
                        <Link href="/bn/delivery" className="underline underline-offset-2">{linkedAreaText}</Link>
                        {faq.answer.slice(linkIndex + linkedAreaText.length)}
                      </>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
        <Link href="/bn/category" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-warm-accent px-6 font-bold text-black">সব পণ্য দেখুন</Link>
      </main>
      <Footer locale="bn" />
      <BottomNav locale="bn" />
    </>
  );
}
