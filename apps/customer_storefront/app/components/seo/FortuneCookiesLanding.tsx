import Link from 'next/link';
import { ArrowRight, Cookie, MagnifyingGlass, WhatsappLogo } from '@phosphor-icons/react/dist/ssr';
import { BottomNav } from '../BottomNav';
import { Footer } from '../updated/Footer';
import { Header } from '../updated/Header';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { DELIVERY_POLICY } from '../../delivery/deliveryData';
import { withLocale, type Locale } from '../../lib/i18n/config';
import { FaqJsonLd, type FaqItem } from './FaqJsonLd';

const copy = {
  en: {
    home: 'Home',
    category: 'Biscuits & Cookies',
    title: 'Fortune Cookies',
    eyebrow: 'Fortune Cookies',
    heading: 'Looking for Fortune Cookies near you?',
    intro: 'Lucky Store is checking local demand for Fortune Cookies in Chawkbazar. Browse today’s live biscuits and cookies, or message the store team to confirm if Fortune Cookies can be arranged.',
    browse: 'Browse biscuits & cookies',
    whatsapp: 'Ask on WhatsApp',
    message: 'Hi Lucky Store, do you have Fortune Cookies in stock?',
    status: 'Current status',
    listing: 'Live product listing',
    noListing: 'Not yet connected to the storefront catalog.',
    delivery: 'Delivery area',
    deliveryArea: `${DELIVERY_POLICY.radiusLabel} around Chawkbazar.`,
    nextStep: 'Best next step',
    nextStepBody: 'Message the store team before visiting or ordering.',
    info: [
      ['Why this page exists', 'Searchers are asking specifically for Fortune Cookies, but the current catalog only has a broader biscuits and cookies category.'],
      ['No fake stock claims', 'This page does not create Product or Offer schema until a real item exists in the store catalog.'],
      ['Fast availability check', 'WhatsApp is the fastest route for confirming whether Fortune Cookies are stocked or can be sourced today.'],
    ],
    snacksTitle: 'Browse similar tea-time snacks',
    snacksBody: 'Until a Fortune Cookies SKU is connected, the closest live shopping path is the biscuits and cookies category.',
    openCategory: 'Open biscuits and cookies',
    faqTitle: 'Fortune Cookies questions',
    faqs: [
      { question: 'Does Lucky Store sell Fortune Cookies?', answer: 'Lucky Store is tracking local demand for Fortune Cookies. Check the biscuits and cookies category for current live listings, or message the store team on WhatsApp for today’s availability.' },
      { question: 'Can I get Fortune Cookies delivered near Chawkbazar?', answer: `Lucky Store delivers within a verified ${DELIVERY_POLICY.radiusLabel} around the Chawkbazar store. Delivery is available for stocked items only.` },
    ],
  },
  bn: {
    home: 'হোম',
    category: 'বিস্কুট ও কুকিজ',
    title: 'ফরচুন কুকিজ',
    eyebrow: 'ফরচুন কুকিজ',
    heading: 'কাছাকাছি ফরচুন কুকিজ খুঁজছেন?',
    intro: 'চকবাজারে ফরচুন কুকিজের চাহিদা যাচাই করছে লাকি স্টোর। আজকের বিস্কুট ও কুকিজ দেখুন, অথবা পণ্যটি পাওয়া যাবে কি না জানতে স্টোর টিমকে বার্তা দিন।',
    browse: 'বিস্কুট ও কুকিজ দেখুন',
    whatsapp: 'হোয়াটসঅ্যাপে জিজ্ঞাসা করুন',
    message: 'হ্যালো লাকি স্টোর, ফরচুন কুকিজ কি স্টকে আছে?',
    status: 'বর্তমান অবস্থা',
    listing: 'লাইভ পণ্যের তালিকা',
    noListing: 'এখনো স্টোরের ক্যাটালগে যুক্ত হয়নি।',
    delivery: 'ডেলিভারি এলাকা',
    deliveryArea: `চকবাজারের আশেপাশে ${DELIVERY_POLICY.radiusKm.toLocaleString('bn-BD')} কিমি।`,
    nextStep: 'পরবর্তী করণীয়',
    nextStepBody: 'আসা বা অর্ডার করার আগে স্টোর টিমকে বার্তা দিন।',
    info: [
      ['এই পেজটি কেন', 'অনেকে বিশেষভাবে ফরচুন কুকিজ খুঁজছেন, তবে বর্তমান ক্যাটালগে বিস্কুট ও কুকিজের সাধারণ বিভাগ রয়েছে।'],
      ['স্টকের ভুল দাবি নয়', 'স্টোর ক্যাটালগে আসল পণ্য যুক্ত না হওয়া পর্যন্ত এই পেজে Product বা Offer schema দেওয়া হয় না।'],
      ['দ্রুত খোঁজ নিন', 'ফরচুন কুকিজ স্টকে আছে বা আজ সংগ্রহ করা যাবে কি না জানতে হোয়াটসঅ্যাপে যোগাযোগ করুন।'],
    ],
    snacksTitle: 'চায়ের সময়ের আরও স্ন্যাকস দেখুন',
    snacksBody: 'ফরচুন কুকিজ ক্যাটালগে যুক্ত না হওয়া পর্যন্ত বিস্কুট ও কুকিজ বিভাগে বর্তমান পণ্য দেখতে পারেন।',
    openCategory: 'বিস্কুট ও কুকিজ খুলুন',
    faqTitle: 'ফরচুন কুকিজ সম্পর্কে প্রশ্ন',
    faqs: [
      { question: 'লাকি স্টোরে কি ফরচুন কুকিজ পাওয়া যায়?', answer: 'লাকি স্টোর ফরচুন কুকিজের স্থানীয় চাহিদা যাচাই করছে। বর্তমান পণ্যের জন্য বিস্কুট ও কুকিজ বিভাগ দেখুন, অথবা আজকের প্রাপ্যতা জানতে হোয়াটসঅ্যাপে স্টোর টিমকে বার্তা দিন।' },
      { question: 'চকবাজারের কাছে কি ফরচুন কুকিজ ডেলিভারি পাওয়া যাবে?', answer: `লাকি স্টোর চকবাজারের দোকান থেকে যাচাইকৃত ${DELIVERY_POLICY.radiusKm.toLocaleString('bn-BD')} কিমি এলাকার মধ্যে ডেলিভারি দেয়। শুধু স্টকে থাকা পণ্য ডেলিভারি করা হয়।` },
    ],
  },
} satisfies Record<Locale, {
  home: string; category: string; title: string; eyebrow: string; heading: string; intro: string;
  browse: string; whatsapp: string; message: string; status: string; listing: string; noListing: string;
  delivery: string; deliveryArea: string; nextStep: string; nextStepBody: string;
  info: readonly (readonly [string, string])[]; snacksTitle: string; snacksBody: string;
  openCategory: string; faqTitle: string; faqs: readonly FaqItem[];
}>;

export function FortuneCookiesLanding({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const categoryPath = withLocale('/category/biscuits-and-cookies', locale);
  const pagePath = withLocale('/fortune-cookies-near-me', locale);

  return (
    <>
      <FaqJsonLd items={text.faqs} />
      <Header locale={locale} />
      <main id="main-content" className="flex-1 overflow-x-hidden pb-16">
        <div className="mx-auto max-w-5xl space-y-7 px-4 py-6 sm:px-6 sm:py-10">
          <Breadcrumbs
            homeHref={withLocale('/', locale)}
            homeLabel={text.home}
            items={[
              { label: text.category, href: categoryPath },
              { label: text.title, href: pagePath },
            ]}
          />

          <section className="overflow-hidden rounded-warm-panel border border-warm-border bg-warm-surface">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="space-y-5 p-5 sm:p-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-warm-border bg-warm-image-well px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-warm-muted">
                  <Cookie size={15} weight="bold" aria-hidden="true" />
                  {text.eyebrow}
                </div>
                <div className="space-y-3">
                  <h1 className="text-balance text-3xl font-black tracking-tight text-warm-fg sm:text-5xl">{text.heading}</h1>
                  <p className="max-w-2xl text-base leading-7 text-warm-muted sm:text-lg">{text.intro}</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href={categoryPath} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-warm-accent px-5 text-sm font-black text-warm-accent-text transition-colors hover:bg-warm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-fg">
                    {text.browse}<ArrowRight size={17} weight="bold" aria-hidden="true" />
                  </Link>
                  <Link href={`https://wa.me/8801731944544?text=${encodeURIComponent(text.message)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-warm-border bg-warm-bg px-5 text-sm font-black text-warm-fg transition-colors hover:border-warm-accent hover:bg-warm-image-well focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent">
                    <WhatsappLogo size={18} weight="bold" aria-hidden="true" />{text.whatsapp}
                  </Link>
                </div>
              </div>
              <aside className="border-t border-warm-border bg-warm-image-well/50 p-5 sm:p-8 lg:border-l lg:border-t-0">
                <h2 className="text-base font-black text-warm-fg">{text.status}</h2>
                <dl className="mt-4 space-y-4 text-sm">
                  <div><dt className="font-bold text-warm-fg">{text.listing}</dt><dd className="mt-1 text-warm-muted">{text.noListing}</dd></div>
                  <div><dt className="font-bold text-warm-fg">{text.delivery}</dt><dd className="mt-1 text-warm-muted">{text.deliveryArea}</dd></div>
                  <div><dt className="font-bold text-warm-fg">{text.nextStep}</dt><dd className="mt-1 text-warm-muted">{text.nextStepBody}</dd></div>
                </dl>
              </aside>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            {text.info.map(([title, body]) => (
              <article key={title} className="rounded-warm-card border border-warm-border bg-warm-surface p-5">
                <h2 className="text-base font-black text-warm-fg">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-warm-muted">{body}</p>
              </article>
            ))}
          </section>

          <section className="rounded-warm-panel border border-warm-border bg-warm-surface p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-warm-accent-ghost text-warm-fg"><MagnifyingGlass size={21} weight="bold" aria-hidden="true" /></span>
              <div>
                <h2 className="text-lg font-black text-warm-fg">{text.snacksTitle}</h2>
                <p className="mt-1 text-sm leading-6 text-warm-muted">{text.snacksBody}</p>
                <Link href={categoryPath} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-warm-border px-4 text-sm font-black text-warm-fg transition-colors hover:border-warm-accent hover:bg-warm-accent hover:text-warm-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent">{text.openCategory}</Link>
              </div>
            </div>
          </section>

          <section aria-labelledby="fortune-faq-heading" className="space-y-3">
            <h2 id="fortune-faq-heading" className="text-xl font-black text-warm-fg">{text.faqTitle}</h2>
            <div className="divide-y divide-warm-border border-y border-warm-border">
              {text.faqs.map((faq) => (
                <details key={faq.question} className="py-4">
                  <summary className="cursor-pointer font-bold text-warm-fg">{faq.question}</summary>
                  <p className="mt-2 text-sm leading-6 text-warm-muted">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
        <Footer locale={locale} />
      </main>
      <BottomNav locale={locale} />
    </>
  );
}
