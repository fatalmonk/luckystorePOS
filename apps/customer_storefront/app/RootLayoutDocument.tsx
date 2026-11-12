import React from 'react';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Bricolage_Grotesque, Manrope } from 'next/font/google';
import './globals.css';
import { PullToRefresh } from './components/PullToRefresh';
import { DeferredClientWidgets } from './components/DeferredClientWidgets';
import { ToastProvider } from './components/Toast';
import { CartProvider } from './components/CartProvider';
import { CartSheetProvider } from './components/providers/CartSheetProvider';
import { AuthProvider } from './components/providers/AuthProvider';
import { ThemeProvider } from './components/providers/ThemeProvider';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import { getDeliveryShippingServiceSchema, getMerchantReturnPolicies } from './lib/deliveryData';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
  preload: true,
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: 'Lucky Store | Online Grocery & Daily Bazaar in Chattogram',
    template: '%s | Lucky Store',
  },
  description:
    'Order groceries and daily bazaar essentials online from Lucky Store in Chattogram. Free delivery on ৳500+ within our delivery area, with Cash on Delivery.',
  keywords: [
    'online grocery chattogram',
    'daily bazaar chattogram',
    'grocery store chawkbazar',
    'home delivery grocery bd',
    'cash on delivery grocery',
  ],
  authors: [{ name: 'Lucky Store' }],
  creator: 'Lucky Store',
  metadataBase: new URL('https://www.luckystore1947.com'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: '48x48' },
      { url: '/favicon-48x48.png?v=2', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-32x32.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192x192.png?v=2', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png?v=2', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.svg?v=2', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png?v=2',
  },
  openGraph: {
    type: 'website',
    locale: 'en_BD',
    url: '/',
    siteName: 'Lucky Store',
    title: 'Lucky Store | Online Grocery & Daily Bazaar in Chattogram',
    description:
      'Order groceries and daily bazaar essentials online from Lucky Store in Chattogram. Free delivery on ৳500+ within our delivery area, with Cash on Delivery.',
    images: [
      {
        url: '/lucky-store-social-share-v2.png',
        width: 1200,
        height: 630,
        alt: 'Lucky Store online grocery and daily bazaar in Chattogram',
      },
    ],
  },
  category: 'grocery',
  classification: 'Business',
  referrer: 'origin-when-cross-origin',
  generator: 'Next.js',
  manifest: '/manifest.webmanifest',
  twitter: {
    card: 'summary_large_image',
    title: 'Lucky Store | Online Grocery & Daily Bazaar in Chattogram',
    description:
      'Order groceries and daily bazaar essentials online from Lucky Store in Chattogram. Free delivery on ৳500+ within our delivery area, with Cash on Delivery.',
    images: [
      {
        url: '/lucky-store-social-share-v2.png',
        alt: 'Lucky Store online grocery and daily bazaar in Chattogram',
      },
    ],
    creator: '@luckystore1947',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lucky Store',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'fb:app_id': '842610775238413',
    'google-site-verification': '10811156927444855134',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0B0D' },
  ],
};

/** Wraps storefront pages with the HTML document, shared providers, metadata, and analytics scripts. */
export default function RootLayoutDocument({
  children,
  lang,
  extraClassName = '',
}: Readonly<{
  children: React.ReactNode;
  lang: 'en' | 'bn';
  extraClassName?: string;
}>) {
  return (
    <html lang={lang} suppressHydrationWarning data-scroll-behavior="smooth" className={`${bricolage.variable} ${manrope.variable} ${extraClassName}`.trim()}>
      <head>
        <link rel="dns-prefetch" href="https://images.luckystore1947.com" />
        {extraClassName.includes('font-bengali') ? (
          <link rel="preload" href="/fonts/noto-sans-bengali.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        ) : null}
        <meta name="theme-color" content="#0B0B0D" />
        <meta name="facebook-domain-verification" content="9jw1hn1oghfyjbs41ymolt13tkd7hi" />
        <script
          data-cfasync="false"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('lucky-theme');if(t==='dark'){document.documentElement.dataset.theme='dark';document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': ['Store', 'GroceryStore', 'Organization'],
              '@id': 'https://www.luckystore1947.com/#organization',
              name: 'Lucky Store',
              alternateName: ['Lucky Store 1947', 'Lucky Store Chattogram'],
              description: 'Lucky Store has served the Chattogram community since 1947. Visit our supermarket at 665 Percival Hill Road, Emdad Park, Chawkbazar for everyday groceries, pantry staples, snacks, drinks, and household essentials. Shop in store or order through our website for local delivery within our service area.',
              url: 'https://www.luckystore1947.com',
              logo: {
                '@type': 'ImageObject',
                url: 'https://www.luckystore1947.com/logo-main.png',
                width: '512',
                height: '512',
              },
              image: 'https://www.luckystore1947.com/lucky-store-social-share-v2.png',
              telephone: '+8801731944544',
              email: 'hello@luckystore1947.com',
              foundingDate: '1947',
              currenciesAccepted: 'BDT',
              knowsAbout: [
                'Grocery delivery in Chattogram',
                'Chawkbazar daily bazaar essentials',
                'Pantry staples and spices',
                'Edible oil and pure ghee',
                'Ispahani and packaged tea blends',
                'Aarong dairy and milk',
              ],
              hasMap: 'https://www.google.com/maps?cid=10553278394662472576',
              areaServed: {
                '@type': 'GeoCircle',
                geoMidpoint: {
                  '@type': 'GeoCoordinates',
                  latitude: '22.35500093723366',
                  longitude: '91.83628930715629',
                },
                geoRadius: '1000',
              },
              openingHoursSpecification: {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: [
                  'Monday',
                  'Tuesday',
                  'Wednesday',
                  'Thursday',
                  'Friday',
                  'Saturday',
                  'Sunday',
                ],
                opens: '09:00',
                closes: '00:30',
              },
              address: {
                '@type': 'PostalAddress',
                streetAddress: '665 Percival Hill Road, Emdad Park, Chawkbazar',
                addressLocality: 'Chattogram',
                addressRegion: 'Chattogram Division',
                postalCode: '4203',
                addressCountry: 'BD',
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: '22.35500093723366',
                longitude: '91.83628930715629',
              },
              hasMerchantReturnPolicy: getMerchantReturnPolicies(),
              hasShippingService: getDeliveryShippingServiceSchema(),
              sameAs: [
                'https://facebook.com/luckystore1947',
                'https://instagram.com/luckystore1947',
                'https://wa.me/8801731944544',
                'https://www.google.com/maps?cid=10553278394662472576',
              ],
            }),
          }}
        />
      </head>
      <body className="antialiased font-body" suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-warm-control focus:bg-warm-accent focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-black focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-warm-fg"
        >
          Skip to main content
        </a>
        <script
          id="google-consent-default-fallback"
          dangerouslySetInnerHTML={{ __html: `
            window.dataLayer = window.dataLayer || [];
            window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
            window.gtag('consent', 'default', {
              ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
              analytics_storage: 'denied', wait_for_update: 500
            });
            window.gtag('set', 'ads_data_redaction', true);
            try {
              if (localStorage.getItem('lucky-analytics-consent') === 'granted') {
                window.gtag('consent', 'update', {
                  ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
                  analytics_storage: 'granted'
                });
              }
            } catch (_) {}
            window.luckyConsentInitialized = true;
          ` }}
        />
        <Script id="google-consent-default" src="/scripts/google-consent-default.v1.js" strategy="beforeInteractive" data-cfasync="false" />
        {/* Google Analytics — consolidated with Cloudflare Zaraz to avoid redundant 173 KiB script when Zaraz is active */}
        <Script id="gtag-init" src="/scripts/google-analytics-loader.v1.js" strategy="lazyOnload" data-cfasync="false" />
        <div
          id="lucky-consent-banner"
          role="region"
          aria-labelledby="lucky-consent-title"
          aria-describedby="lucky-consent-description"
          className="fixed inset-x-3 bottom-20 z-[80] mx-auto max-w-xl rounded-[var(--radius-md)] border border-warm-border bg-warm-surface p-4 text-warm-fg shadow-2xl sm:bottom-6 sm:p-5"
        >
          <p id="lucky-consent-title" className="text-base font-bold">
            Your privacy choices
          </p>
          <p id="lucky-consent-description" className="mt-1 text-sm leading-relaxed text-warm-muted">
            We use optional analytics (Google Analytics & Meta Pixel) to understand site traffic and improve our services. Advertising personalization remains disabled.
          </p>
          <p className="mt-2 text-xs leading-5 text-warm-muted">
            Read our{' '}
            <a href="/privacy" className="font-semibold text-warm-fg underline underline-offset-2 hover:no-underline">
              Privacy Policy
            </a>{' '}
            and{' '}
            <a href="/terms" className="font-semibold text-warm-fg underline underline-offset-2 hover:no-underline">
              Terms
            </a>
            .
          </p>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              id="lucky-consent-reject"
              type="button"
              className="min-h-11 rounded-full border border-warm-border px-4 py-2 text-sm font-semibold hover:bg-warm-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            >
              Reject analytics
            </button>
            <button
              id="lucky-consent-accept"
              type="button"
              className="min-h-11 rounded-full bg-warm-accent px-4 py-2 text-sm font-bold text-black hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-fg"
            >
              Accept analytics
            </button>
          </div>
        </div>
        {/* eslint-disable @next/next/next-script-for-ga -- This consent fallback appends GTM only after an explicit grant. */}
        <script
          id="google-consent-ui-fallback"
          dangerouslySetInnerHTML={{ __html: `
            (function () {
              window.luckyConsentUiFallbackBound = true;
              var banner = document.getElementById('lucky-consent-banner');
              var accept = document.getElementById('lucky-consent-accept');
              var reject = document.getElementById('lucky-consent-reject');
              if (!banner || !accept || !reject) return;
              var storageKey = 'lucky-analytics-consent';
              var pendingConsent = null;
              var read = function () {
                try { return localStorage.getItem(storageKey); } catch (_) { return null; }
              };
              var save = function (value) {
                try { localStorage.setItem('lucky-analytics-consent', value); } catch (_) {}
              };
              var update = function (value) {
                if (!window.luckyConsentInitialized || typeof window.gtag !== 'function') return false;
                try {
                  window.gtag('consent', 'update', {
                    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
                    analytics_storage: value
                  });
                  pendingConsent = value;
                  var zarazConsent = window.zaraz && window.zaraz.consent;
                  if (zarazConsent && zarazConsent.APIReady) {
                    try { zarazConsent.set({ onAw: value === 'granted' }); pendingConsent = null; } catch (_) {}
                  }
                  return true;
                } catch (_) { return false; }
              };
              var loadGtm = function () {
                if (!window.luckyConsentInitialized || read() !== 'granted') return;
                if (!window.google_tag_manager && !window.luckyGtmLoading && !window.luckyGtmLoaded) {
                  window.luckyGtmLoading = true;
                  var gtm = document.createElement('script');
                  gtm.async = true;
                  gtm.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-PH4QHV3N';
                  gtm.setAttribute('data-cfasync', 'false');
                  gtm.onload = function () { window.luckyGtmLoaded = true; window.luckyGtmLoading = false; };
                  gtm.onerror = function () { window.luckyGtmLoading = false; };
                  document.head.appendChild(gtm);
                }
              };
              var clearCookies = function () {
                var parts = location.hostname.split('.');
                var domains = ['', location.hostname];
                if (parts.length > 2) domains.push('.' + parts.slice(-2).join('.'));
                document.cookie.split(';').forEach(function (cookie) {
                  var name = cookie.split('=')[0].trim();
                  if (name === '_ga' || name.indexOf('_ga_') === 0 || name === '_fbp' || name === '_fbc') {
                    domains.forEach(function (domain) {
                      document.cookie = name + '=; Max-Age=0; path=/' + (domain ? '; domain=' + domain : '');
                    });
                  }
                });
              };
              accept.addEventListener('click', function () {
                if (!update('granted')) return;
                save('granted');
                banner.hidden = true;
                loadGtm();
                if (window.luckyLoadGoogleAnalytics) window.luckyLoadGoogleAnalytics();
                if (window.luckyLoadMetaPixel) window.luckyLoadMetaPixel();
              });
              reject.addEventListener('click', function () {
                save('denied');
                update('denied');
                clearCookies();
                banner.hidden = true;
              });
              window.addEventListener('zarazConsentAPIReady', function () {
                if (pendingConsent === null) return;
                var zarazConsent = window.zaraz && window.zaraz.consent;
                if (!zarazConsent) return;
                try { zarazConsent.set({ onAw: pendingConsent === 'granted' }); pendingConsent = null; } catch (_) {}
              });
              var saved = read();
              var validChoice = saved === 'granted' || saved === 'denied';
              var applied = validChoice ? update(saved) : false;
              banner.hidden = saved === 'denied' || (saved === 'granted' && applied);
              if (saved === 'denied') clearCookies();
              if (saved === 'granted' && applied) loadGtm();
            })();
          ` }}
        />
        {/* eslint-enable @next/next/next-script-for-ga */}
        <Script id="google-consent-ui" src="/scripts/google-consent-ui.v1.js" strategy="afterInteractive" data-cfasync="false" />
        <AuthProvider>
          <ThemeProvider>
            <CartProvider>
              <ToastProvider>
                <CartSheetProvider>
                  <PullToRefresh lang={lang} />
                  <div className="app-container">
                    {children}
                  </div>
                  <DeferredClientWidgets />
                </CartSheetProvider>
              </ToastProvider>
            </CartProvider>
          </ThemeProvider>
        </AuthProvider>
        {process.env.VERCEL === '1' ? <SpeedInsights /> : null}
        {process.env.VERCEL === '1' ? <Analytics /> : null}
      </body>
    </html>
  );
}
