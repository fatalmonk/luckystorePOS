import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { withLocale, type Locale } from '../lib/i18n/config';

const collections = [
  {
    id: 'personal-care',
    title: ['Personal Care & Hygiene', 'ব্যক্তিগত যত্ন ও স্বাস্থ্যবিধি'],
    subtitle: ['Soaps, shampoo, oral care & more', 'সাবান, শ্যাম্পু ও প্রসাধন সামগ্রী'],
    href: '/category/personal-care',
    surface: '#d5f0f2',
  },
  {
    id: 'pantry',
    title: ['Everyday Essentials', 'নিত্যদিনের প্রয়োজন'],
    subtitle: ['Rice, oil, dal, sugar & more', 'চাল, তেল, ডাল, চিনি ও আরও অনেক কিছু'],
    href: '/category/cooking-essentials',
    surface: '#ffe18a',
  },
  {
    id: 'snacks',
    title: ['Snacks & Beverages', 'নাস্তা ও পানীয়'],
    subtitle: ['For your snack-time cravings', 'নাস্তার সময়ের সঙ্গী'],
    href: '/category/snacks',
    surface: '#ffd1ce',
  },
] as const;

export function HomeCategoryBanners({ locale = 'en' }: { locale?: Locale }) {
  const lang = locale === 'bn' ? 1 : 0;

  return (
    <nav
      aria-label={lang ? 'বাজারের বিভাগগুলো দেখুন' : 'Explore grocery collections'}
      className="grid gap-3 sm:grid-cols-3"
    >
      {collections.map((collection) => (
        <Link
          key={collection.id}
          href={withLocale(collection.href, locale)}
          className="group relative isolate flex min-h-44 overflow-hidden rounded-2xl p-5 text-[#0b2517] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2 sm:min-h-48 lg:min-h-52"
          style={{ backgroundColor: collection.surface }}
        >
          <div className="absolute inset-y-0 right-0 -z-10 w-[55%]">
            <Image
              src={`/images/category-${collection.id}.webp`}
              alt=""
              fill
              sizes="(max-width: 639px) 55vw, 18vw"
              className="object-cover object-right transition-transform duration-300 motion-safe:group-hover:scale-105"
            />
          </div>
          <div className="absolute inset-0 -z-10" style={{ background: `linear-gradient(90deg, ${collection.surface} 0%, ${collection.surface} 42%, transparent 72%)` }} aria-hidden="true" />
          <div className="relative flex w-[58%] flex-col items-start">
            <h2 className="text-balance text-xl font-black leading-[1.08] tracking-tight lg:text-2xl">
              {collection.title[lang]}
            </h2>
            <p className="mt-2 text-xs leading-5 lg:text-sm">{collection.subtitle[lang]}</p>
            <span className="mt-4 inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full bg-[#003d24] px-3 text-sm font-bold text-white lg:px-4">
              {lang ? 'বাজার করুন' : 'Shop now'}
              <ArrowRight size={16} aria-hidden="true" />
            </span>
          </div>
        </Link>
      ))}
    </nav>
  );
}

export function HomeTeaBanner({ locale = 'en' }: { locale?: Locale }) {
  const bn = locale === 'bn';

  return (
    <section
      aria-labelledby="home-tea-title"
      className="relative isolate flex min-h-44 items-center overflow-hidden rounded-2xl bg-[#ffedba] px-6 py-6 text-[#0b2517] sm:min-h-36 sm:px-8"
    >
      <div className="absolute inset-y-0 right-0 -z-10 w-[65%] sm:w-[55%]">
        <Image
          src="/images/tea-time.webp"
          alt=""
          fill
          sizes="(max-width: 639px) 65vw, 55vw"
          className="object-cover object-right"
        />
      </div>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#ffedba_0%,#ffedba_42%,rgba(255,237,186,0)_65%)]" />
      <div className="flex max-w-[65%] flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-8">
        <div>
          <h2 id="home-tea-title" className="text-balance text-xl font-black tracking-tight sm:text-2xl">
            {bn ? 'চায়ের সময়ের পছন্দগুলো' : 'Tea time favourites'}
          </h2>
          <p className="mt-1 text-sm">{bn ? 'বিস্কুট, চা, দুধ ও আরও অনেক কিছু' : 'Biscuits, tea, milk and more'}</p>
        </div>
        <Link
          href={withLocale('/category/tea-and-coffee', locale)}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[#003d24] px-5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2"
        >
          {bn ? 'বাজার করুন' : 'Shop now'}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
