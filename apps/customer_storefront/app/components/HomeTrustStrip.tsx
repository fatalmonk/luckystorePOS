import React from 'react';
import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { Bicycle } from '@phosphor-icons/react/dist/ssr/Bicycle';
import { Gift } from '@phosphor-icons/react/dist/ssr/Gift';
import { HandCoins } from '@phosphor-icons/react/dist/ssr/HandCoins';
import { ShieldCheck } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { DELIVERY_POLICY } from '../lib/deliveryData';
import { withLocale, type Locale } from '../lib/i18n/config';

/** Renders localized delivery, payment, and store trust details with links to further information. */
export function HomeTrustStrip({ locale = 'en' }: { locale?: Locale }) {
  const bn = locale === 'bn';
  const radius = DELIVERY_POLICY.radiusKm.toLocaleString(bn ? 'bn-BD' : 'en');
  const threshold = DELIVERY_POLICY.freeDeliveryThresholdBdt.toLocaleString(bn ? 'bn-BD' : 'en');
  const facts = [
    {
      icon: Bicycle,
      iconClassName: 'bg-warm-image-well text-[#245c3d] dark:text-[#a8d6b7]',
      title: bn ? 'ডেলিভারি এলাকা' : 'Delivery coverage',
      detail: bn ? `চকবাজার থেকে ${radius} কিমির মধ্যে` : `Within ${radius} km of Chawkbazar`,
      href: '/delivery',
    },
    {
      icon: Gift,
      iconClassName: 'bg-warm-image-well text-[#765500] dark:text-[#f4d778]',
      title: bn ? 'ডেলিভারি চার্জ' : 'Delivery fees',
      detail: bn ? `৳${threshold}+ অর্ডারে ফ্রি ডেলিভারি` : `Free Delivery on ৳${threshold}+ orders`,
      href: '/delivery',
    },
    {
      icon: HandCoins,
      iconClassName: 'bg-warm-image-well text-[#36517d] dark:text-[#b8c9eb]',
      title: bn ? 'পণ্য দেখে পেমেন্ট' : 'Pay after inspection',
      detail: bn ? 'অর্ডার বুঝে নিন, তারপর পেমেন্ট করুন' : 'Check your order, then pay',
      href: '/delivery#payment-heading',
    },
    {
      icon: ShieldCheck,
      iconClassName: 'bg-warm-image-well text-[#245c3d] dark:text-[#a8d6b7]',
      title: bn ? '১৯৪৭ সাল থেকে আস্থার সঙ্গী' : 'Trusted since 1947',
      detail: bn ? 'আপনার পাড়ার বাজারের দোকান' : 'Your neighbourhood grocer',
      href: '/contact#about',
    },
  ];

  return (
    <section
      aria-label={bn ? 'কেন লাকি স্টোরে কেনাকাটা করবেন' : 'Why shop with Lucky Store'}
      className="rounded-3xl bg-warm-image-well px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-9"
    >
      <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-10">
        <div className="max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#245c3d] dark:text-[#a8d6b7]">
            {bn ? `আপনার পাড়ার দোকান · ${DELIVERY_POLICY.establishedYear}` : 'Your Neighborhood Family Grocer'}
          </p>
          <h2 className="max-w-xl text-2xl font-extrabold leading-tight tracking-tight text-warm-fg sm:text-3xl lg:text-[2.5rem]">
            {bn ? 'প্রতিদিনের প্রয়োজন, যত্ন নিয়ে আপনার দরজায়।' : 'Everyday essentials, delivered with care.'}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-warm-muted sm:text-base">
            {bn
              ? 'চকবাজারের পরিচিত দোকান থেকে—পরিষ্কার ডেলিভারি তথ্য, আর পণ্য হাতে পেয়ে পরীক্ষা করে পেমেন্ট।'
              : 'From your familiar Chawkbazar store, with clear delivery details and time to check your order before you pay.'}
          </p>
        </div>
        <Link
          href={withLocale('/delivery', locale)}
          className="group inline-flex w-fit items-center gap-2 text-sm font-bold text-warm-fg underline decoration-warm-border underline-offset-4 transition-colors hover:text-warm-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
        >
          {bn ? 'ডেলিভারির তথ্য দেখুন' : 'See delivery details'}
          <ArrowRight size={17} weight="bold" aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <dl className="relative mt-6 grid grid-cols-2 border-t border-[#b8b1a4] pt-4 sm:pt-5 dark:border-white/15 lg:grid-cols-4">
        {facts.map(({ icon: Icon, iconClassName, title, detail, href }, index) => (
          <div
            key={title}
            className={`relative grid min-h-[5.5rem] grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-x-2.5 border-[#b8b1a4] py-3 sm:min-h-[4.75rem] sm:items-center sm:gap-x-3 dark:border-white/15 lg:min-h-[3.75rem] lg:border-b-0 lg:px-4 lg:py-2 lg:first:pl-0 ${
              index < 2 ? 'border-b' : ''
            } ${index % 2 === 0 ? 'border-r pr-3' : 'pl-3'} ${
              index < facts.length - 1 ? 'lg:border-r' : 'lg:border-r-0'
            }`}
          >
            <dt className="col-span-2 flex items-center gap-2.5 text-xs font-bold leading-5 text-warm-fg sm:gap-3 sm:text-sm">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClassName}`}>
                <Icon size={19} weight="regular" aria-hidden="true" />
              </span>
              <Link
                href={href.startsWith('/contact') ? href : withLocale(href, locale)}
                className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              >
                {title}
              </Link>
            </dt>
            <dd className="col-start-2 mt-0.5 text-xs leading-5 text-warm-muted">{detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
