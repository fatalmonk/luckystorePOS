import Link from 'next/link';
import { ArrowRight, Cookie, MagnifyingGlass } from '@phosphor-icons/react/dist/ssr';
import { BottomNav } from '../BottomNav';
import { Footer } from '../updated/Footer';
import { Header } from '../updated/Header';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { withLocale, type Locale } from '../../lib/i18n/config';
import { FaqJsonLd, type FaqItem } from './FaqJsonLd';

const copy = {
  en: {
    home: 'Home', category: 'Biscuits & Cookies', title: 'Fortune Cookies', eyebrow: 'Availability',
    heading: 'Fortune Cookies are not available at Lucky Store',
    intro: 'Lucky Store does not stock Fortune Cookies and has no plans to stock them. Browse our biscuits and cookies category for current alternatives.',
    browse: 'Browse biscuits & cookies', status: 'Current status', listing: 'Fortune Cookies',
    noListing: 'Not stocked. No plans to stock.', delivery: 'Delivery', deliveryArea: 'Fortune Cookies are not available for delivery.',
    nextStep: 'Explore alternatives', nextStepBody: 'Browse the current biscuits and cookies catalog.',
    info: [['Availability', 'We do not sell or arrange sourcing for Fortune Cookies.'], ['Shopping alternatives', 'Browse the biscuits and cookies category for actual catalog items.'], ['Before ordering', 'Check each listed product for its current price and availability.']],
    snacksTitle: 'Browse biscuits and cookies', snacksBody: 'Explore current catalog alternatives.', openCategory: 'Open biscuits and cookies', faqTitle: 'Fortune Cookies questions',
    faqs: [{ question: 'Does Lucky Store sell Fortune Cookies?', answer: 'No. Lucky Store does not stock Fortune Cookies and has no plans to stock them.' }, { question: 'Can Lucky Store arrange Fortune Cookies?', answer: 'No. Please browse our biscuits and cookies category for current alternatives.' }],
  },
  bn: {
    home: 'হোম', category: 'বিস্কুট ও কুকিজ', title: 'ফরচুন কুকিজ', eyebrow: 'প্রাপ্যতা',
    heading: 'লাকি স্টোরে ফরচুন কুকিজ পাওয়া যায় না',
    intro: 'লাকি স্টোর ফরচুন কুকিজ স্টকে রাখে না এবং রাখার কোনো পরিকল্পনা নেই। বিকল্প পণ্যের জন্য আমাদের বিস্কুট ও কুকিজ বিভাগ দেখুন।',
    browse: 'বিস্কুট ও কুকিজ দেখুন', status: 'বর্তমান অবস্থা', listing: 'ফরচুন কুকিজ',
    noListing: 'স্টকে নেই। স্টকে রাখার পরিকল্পনা নেই।', delivery: 'ডেলিভারি', deliveryArea: 'ফরচুন কুকিজ ডেলিভারির জন্য পাওয়া যায় না।',
    nextStep: 'বিকল্প পণ্য দেখুন', nextStepBody: 'বিস্কুট ও কুকিজের বর্তমান ক্যাটালগ দেখুন।',
    info: [['প্রাপ্যতা', 'আমরা ফরচুন কুকিজ বিক্রি করি না বা সংগ্রহের ব্যবস্থা করি না।'], ['বিকল্প পণ্য', 'ক্যাটালগের পণ্যের জন্য বিস্কুট ও কুকিজ বিভাগ দেখুন।'], ['অর্ডারের আগে', 'প্রতিটি পণ্যের বর্তমান দাম ও প্রাপ্যতা দেখুন।']],
    snacksTitle: 'বিস্কুট ও কুকিজ দেখুন', snacksBody: 'বর্তমান ক্যাটালগের বিকল্প পণ্য দেখুন।', openCategory: 'বিস্কুট ও কুকিজ খুলুন', faqTitle: 'ফরচুন কুকিজ সম্পর্কে প্রশ্ন',
    faqs: [{ question: 'লাকি স্টোরে কি ফরচুন কুকিজ পাওয়া যায়?', answer: 'না। লাকি স্টোর ফরচুন কুকিজ স্টকে রাখে না এবং রাখার কোনো পরিকল্পনা নেই।' }, { question: 'লাকি স্টোর কি ফরচুন কুকিজের ব্যবস্থা করতে পারে?', answer: 'না। বিকল্প পণ্যের জন্য আমাদের বিস্কুট ও কুকিজ বিভাগ দেখুন।' }],
  },
} satisfies Record<Locale, {
  home: string; category: string; title: string; eyebrow: string; heading: string; intro: string;
  browse: string; status: string; listing: string; noListing: string; delivery: string; deliveryArea: string;
  nextStep: string; nextStepBody: string; info: readonly (readonly [string, string])[];
  snacksTitle: string; snacksBody: string; openCategory: string; faqTitle: string; faqs: readonly FaqItem[];
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
