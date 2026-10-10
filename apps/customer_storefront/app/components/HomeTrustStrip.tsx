import React from 'react';
import Link from 'next/link';
import { Bike, Gift, HandCoins, ShieldCheck } from 'lucide-react';
import { DELIVERY_POLICY } from '../lib/deliveryData';
import { withLocale, type Locale } from '../lib/i18n/config';

export function HomeTrustStrip({ locale = 'en' }: { locale?: Locale }) {
  const bn = locale === 'bn';
  const radius = DELIVERY_POLICY.radiusKm.toLocaleString(bn ? 'bn-BD' : 'en');
  const threshold = DELIVERY_POLICY.freeDeliveryThresholdBdt.toLocaleString(bn ? 'bn-BD' : 'en');
  const facts = [
    {
      icon: Bike,
      title: bn ? 'স্থানীয় ডেলিভারি' : 'Local delivery',
      detail: bn ? `চকবাজার থেকে ${radius} কিমির মধ্যে` : `Within ${radius} km of Chawkbazar`,
      href: '/delivery',
    },
    {
      icon: Gift,
      title: bn ? 'ফ্রি ডেলিভারি' : 'Free delivery',
      detail: bn ? `৳${threshold}+ অর্ডারে` : `On ৳${threshold}+ orders`,
      href: '/delivery',
    },
    {
      icon: HandCoins,
      title: bn ? 'পণ্য দেখে পেমেন্ট' : 'Pay after inspection',
      detail: bn ? 'অর্ডার বুঝে নিন, তারপর পেমেন্ট করুন' : 'Check your order, then pay',
      href: '/delivery#payment-heading',
    },
    {
      icon: ShieldCheck,
      title: bn ? '১৯৪৭ সাল থেকে আস্থার সঙ্গী' : 'Trusted since 1947',
      detail: bn ? 'আপনার পাড়ার বাজারের দোকান' : 'Your neighbourhood grocer',
      href: '/about',
    },
  ];

  return (
    <section aria-label={bn ? 'কেন লাকি স্টোরে কেনাকাটা করবেন' : 'Why shop with Lucky Store'}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-6 rounded-2xl bg-warm-image-well p-5 sm:p-7 lg:grid-cols-4 lg:gap-6">
        {facts.map(({ icon: Icon, title, detail, href }) => (
          <div key={title} className="relative flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#eee7da] text-warm-fg sm:h-16 sm:w-16">
              <Icon size={30} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <div>
              <dt className="text-sm font-extrabold text-warm-fg">
                <Link href={withLocale(href, locale)} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent">
                  {title}
                </Link>
              </dt>
              <dd className="mt-1 text-sm leading-5 text-warm-muted">{detail}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
