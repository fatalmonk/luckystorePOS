import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowRight, Cookie, MagnifyingGlass, WhatsappLogo } from '@phosphor-icons/react/dist/ssr';
import { Header } from '../components/updated/Header';
import { Footer } from '../components/updated/Footer';
import { BottomNav } from '../components/BottomNav';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { DELIVERY_POLICY } from '../delivery/deliveryData';

const pageUrl = 'https://www.luckystore1947.com/fortune-cookies-near-me';
const whatsappMessage = encodeURIComponent(
  'Hi Lucky Store, do you have Fortune Cookies in stock?'
);

export const metadata: Metadata = {
  title: {
    absolute: 'Fortune Cookies Near Me in Chattogram | Lucky Store',
  },
  description:
    'Looking for Fortune Cookies near Chawkbazar, Chattogram? Check Lucky Store availability, browse biscuits and cookies, or ask the store team on WhatsApp.',
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    type: 'website',
    locale: 'en_BD',
    url: pageUrl,
    siteName: 'Lucky Store',
    title: 'Fortune Cookies Near Me in Chattogram | Lucky Store',
    description:
      'Check Fortune Cookies availability near Chawkbazar, browse biscuits and cookies, or ask Lucky Store on WhatsApp.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fortune Cookies Near Me in Chattogram | Lucky Store',
    description:
      'Check Fortune Cookies availability near Chawkbazar, browse biscuits and cookies, or ask Lucky Store on WhatsApp.',
  },
};

export default function FortuneCookiesNearMePage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Does Lucky Store sell Fortune Cookies?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Lucky Store is tracking local demand for Fortune Cookies. Check the biscuits and cookies category for current live listings, or message the store team on WhatsApp for today’s availability.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I get Fortune Cookies delivered near Chawkbazar?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Lucky Store delivers within a verified ${DELIVERY_POLICY.radiusLabel} around the Chawkbazar store. Delivery is available for stocked items only.`,
        },
      },
    ],
  };

  return (
    <>
      <Script
        id="fortune-cookies-faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c') }}
      />
      <Header />
      <main id="main-content" className="flex-1 overflow-x-hidden pb-16">
        <div className="mx-auto max-w-5xl space-y-7 px-4 py-6 sm:px-6 sm:py-10">
          <Breadcrumbs
            items={[
              { label: 'Biscuits & Cookies', href: '/category/biscuits-and-cookies' },
              { label: 'Fortune Cookies', href: '/fortune-cookies-near-me' },
            ]}
          />

          <section className="overflow-hidden rounded-warm-panel border border-warm-border bg-warm-surface">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="space-y-5 p-5 sm:p-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-warm-border bg-warm-image-well px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-warm-muted">
                  <Cookie size={15} weight="bold" aria-hidden="true" />
                  Fortune Cookies
                </div>
                <div className="space-y-3">
                  <h1 className="text-balance text-3xl font-black tracking-tight text-warm-fg sm:text-5xl">
                    Looking for Fortune Cookies near you?
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-warm-muted sm:text-lg">
                    Lucky Store is checking local demand for Fortune Cookies in Chawkbazar. Browse today&apos;s live biscuits and cookies, or message the store team to confirm if Fortune Cookies can be arranged.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/category/biscuits-and-cookies"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-warm-accent px-5 text-sm font-black text-warm-accent-text transition-colors hover:bg-warm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-fg"
                  >
                    Browse biscuits & cookies
                    <ArrowRight size={17} weight="bold" aria-hidden="true" />
                  </Link>
                  <Link
                    href={`https://wa.me/8801731944544?text=${whatsappMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-warm-border bg-warm-bg px-5 text-sm font-black text-warm-fg transition-colors hover:border-warm-accent hover:bg-warm-image-well focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                  >
                    <WhatsappLogo size={18} weight="bold" aria-hidden="true" />
                    Ask on WhatsApp
                  </Link>
                </div>
              </div>

              <aside className="border-t border-warm-border bg-warm-image-well/50 p-5 sm:p-8 lg:border-l lg:border-t-0">
                <h2 className="text-base font-black text-warm-fg">Current status</h2>
                <dl className="mt-4 space-y-4 text-sm">
                  <div>
                    <dt className="font-bold text-warm-fg">Live product listing</dt>
                    <dd className="mt-1 text-warm-muted">Not yet connected to the storefront catalog.</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-warm-fg">Delivery area</dt>
                    <dd className="mt-1 text-warm-muted">{DELIVERY_POLICY.radiusLabel} around Chawkbazar.</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-warm-fg">Best next step</dt>
                    <dd className="mt-1 text-warm-muted">Message the store team before visiting or ordering.</dd>
                  </div>
                </dl>
              </aside>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            {[
              {
                title: 'Why this page exists',
                body: 'Searchers are asking specifically for Fortune Cookies, but the current catalog only has a broader biscuits and cookies category.',
              },
              {
                title: 'No fake stock claims',
                body: 'This page does not create Product or Offer schema until a real item exists in the store catalog.',
              },
              {
                title: 'Fast availability check',
                body: 'WhatsApp is the fastest route for confirming whether Fortune Cookies are stocked or can be sourced today.',
              },
            ].map((item) => (
              <article key={item.title} className="rounded-warm-card border border-warm-border bg-warm-surface p-5">
                <h2 className="text-base font-black text-warm-fg">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-warm-muted">{item.body}</p>
              </article>
            ))}
          </section>

          <section className="rounded-warm-panel border border-warm-border bg-warm-surface p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-warm-accent-ghost text-warm-fg">
                <MagnifyingGlass size={21} weight="bold" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-black text-warm-fg">Browse similar tea-time snacks</h2>
                <p className="mt-1 text-sm leading-6 text-warm-muted">
                  Until a Fortune Cookies SKU is connected, the closest live shopping path is the biscuits and cookies category.
                </p>
                <Link
                  href="/category/biscuits-and-cookies"
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-warm-border px-4 text-sm font-black text-warm-fg transition-colors hover:border-warm-accent hover:bg-warm-accent hover:text-warm-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                >
                  Open biscuits and cookies
                </Link>
              </div>
            </div>
          </section>
        </div>
        <Footer />
      </main>
      <BottomNav />
    </>
  );
}
