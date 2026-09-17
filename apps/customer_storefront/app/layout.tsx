import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Bricolage_Grotesque, Geist_Mono, Manrope, Noto_Sans_Bengali } from 'next/font/google';
import './globals.css';
import { ToastProvider } from './components/Toast';
import { CartProvider } from './components/CartProvider';
import { CartSheetProvider } from './components/providers/CartSheetProvider';
import { WebMCPInit } from './components/WebMCPInit';
import { AuthProvider } from './components/providers/AuthProvider';
import { ThemeProvider } from './components/providers/ThemeProvider';
import { SpeedInsights } from '@vercel/speed-insights/next';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
  preload: false,
});

const notoBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  variable: '--font-bengali',
  display: 'swap',
  preload: false,
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
    'grocery stores chattogram',
    'grocery prices chattogram',
    'bangladesh online grocery',
    'bangladesh bazaar',
    'daily bazaar',
    'daily shop',
    'bd shop',
    'online shop',
    'home shop',
    'local delivery',
    'chattogram online grocery',
    'grocery shop near me',
    'cash on delivery',
    'discount grocery',
    'fresh grocery',
    'organic grocery',
    'Lucky Store',
    'Chattogram grocery',
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
  manifest: '/site.webmanifest',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={`${bricolage.variable} ${manrope.variable} ${geistMono.variable} ${notoBengali.variable}`}>
      <head>
        <link rel="preconnect" href="https://images.luckystore1947.com" />
        <link rel="dns-prefetch" href="https://images.luckystore1947.com" />
        <meta name="theme-color" content="#0B0B0D" />
        <meta name="facebook-domain-verification" content="9jw1hn1oghfyjbs41ymolt13tkd7hi" />
        <script
          data-cfasync="false"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(location.pathname==='/bn'||location.pathname.startsWith('/bn/'))document.documentElement.lang='bn';}catch(e){}try{var t=localStorage.getItem('lucky-theme');if(t==='dark')document.documentElement.dataset.theme='dark';}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': ['Store', 'GroceryStore'],
              '@id': 'https://www.luckystore1947.com/#grocerystore',
              name: 'Lucky Store',
              alternateName: ['Lucky Store 1947', 'Lucky Store Chattogram'],
              description: 'Lucky Store delivers groceries within 1 km of the store in Chattogram. Delivery is free for orders over ৳500 and costs ৳40 for orders below ৳500.',
              url: 'https://www.luckystore1947.com',
              telephone: '+880 1731-944544',
              email: 'hello@luckystore1947.com',
              currenciesAccepted: 'BDT',
              hasMap: 'https://maps.google.com/?cid=1342606622879549324',
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
              hasMerchantReturnPolicy: {
                '@type': 'MerchantReturnPolicy',
                applicableCountry: 'BD',
                returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
                merchantReturnDays: 1,
                returnMethod: 'https://schema.org/ReturnInStore',
                returnFees: 'https://schema.org/FreeReturn',
              },
              shippingDetails: {
                '@type': 'OfferShippingDetails',
                shippingDestination: {
                  '@type': 'DefinedRegion',
                  addressCountry: 'BD',
                  addressRegion: 'Chattogram',
                  postalCode: '4203',
                },
                shippingRate: {
                  '@type': 'ShippingRateSettings',
                  shippingLabel: 'Lucky Store Standard Local Delivery',
                  shippingDestination: {
                    '@type': 'DefinedRegion',
                    addressCountry: 'BD',
                    addressRegion: 'Chattogram',
                    postalCode: '4203',
                  },
                  shippingRate: {
                    '@type': 'MonetaryAmount',
                    value: '40',
                    currency: 'BDT',
                  },
                  freeShippingThreshold: {
                    '@type': 'DeliveryChargeSpecification',
                    appliesToDeliveryMethod: 'https://schema.org/DeliveryModeOwnFleet',
                    price: '500',
                    priceCurrency: 'BDT',
                  },
                },
              },
              sameAs: [
                'https://facebook.com/luckystore1947',
                'https://instagram.com/luckystore1947',
                'https://wa.me/8801731944544',
                'https://maps.google.com/?cid=1342606622879549324',
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
        <Script id="google-consent-default" strategy="beforeInteractive" data-cfasync="false">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('consent', 'default', {
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              analytics_storage: 'denied',
              wait_for_update: 500
            });
            gtag('set', 'ads_data_redaction', true);

            try {
              if (localStorage.getItem('lucky-analytics-consent') === 'granted') {
                gtag('consent', 'update', {
                  ad_storage: 'denied',
                  ad_user_data: 'denied',
                  ad_personalization: 'denied',
                  analytics_storage: 'granted'
                });
              }
            } catch (error) {
              // Storage can be unavailable in privacy-restricted browsers.
            }
          `}
        </Script>
        {/* Google Analytics — consolidated with Cloudflare Zaraz to avoid redundant 173 KiB script when Zaraz is active */}
        <Script id="gtag-init" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            var loadGtag = function(){
              if (document.querySelector('script[data-lucky-gtag]')) return;
              if (window.zaraz) {
                // Cloudflare Zaraz is active at edge; skip direct gtag.js download
                return;
              }
              var script = document.createElement('script');
              script.async = true;
              script.src = 'https://www.googletagmanager.com/gtag/js?id=G-K5JLJNSW6D';
              script.dataset.luckyGtag = 'true';
              script.setAttribute('data-cfasync', 'false');
              script.onload = function(){
                gtag('js', new Date());
                gtag('config', 'G-K5JLJNSW6D');
              };
              document.head.appendChild(script);
            };
            var scheduleGtag = function(){
              window.setTimeout(loadGtag, 3000);
            };
            if ('requestIdleCallback' in window) {
              window.requestIdleCallback(scheduleGtag, { timeout: 5000 });
            } else {
              scheduleGtag();
            }
          `}
        </Script>
        <div
          id="lucky-consent-banner"
          role="region"
          aria-labelledby="lucky-consent-title"
          aria-describedby="lucky-consent-description"
          hidden
          className="fixed inset-x-3 bottom-20 z-[80] mx-auto max-w-xl rounded-[var(--radius-md)] border border-warm-border bg-warm-surface p-4 text-warm-fg shadow-2xl sm:bottom-6 sm:p-5"
        >
          <h2 id="lucky-consent-title" className="text-base font-bold">
            Your privacy choices
          </h2>
          <p id="lucky-consent-description" className="mt-1 text-sm leading-relaxed text-warm-muted">
            We use optional Google Analytics to understand site traffic. Advertising storage and personalization remain disabled.
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
        <Script id="google-consent-ui" strategy="afterInteractive">
          {`
            (function () {
              var storageKey = 'lucky-analytics-consent';
              var banner = document.getElementById('lucky-consent-banner');
              var accept = document.getElementById('lucky-consent-accept');
              var reject = document.getElementById('lucky-consent-reject');
              if (!banner || !accept || !reject) return;

              var readChoice = function () {
                try { return localStorage.getItem(storageKey); } catch (error) { return null; }
              };
              var saveChoice = function (value) {
                try { localStorage.setItem(storageKey, value); } catch (error) {}
              };
              var showBanner = function () {
                banner.hidden = false;
                window.setTimeout(function () { accept.focus(); }, 0);
              };
              var hideBanner = function () {
                banner.hidden = true;
              };
              var updateConsent = function (analyticsStorage) {
                window.gtag('consent', 'update', {
                  ad_storage: 'denied',
                  ad_user_data: 'denied',
                  ad_personalization: 'denied',
                  analytics_storage: analyticsStorage
                });
                if (window.zaraz && window.zaraz.consent) {
                  try {
                    window.zaraz.consent.set({ analytics: analyticsStorage === 'granted' });
                  } catch (error) {}
                }
              };

              accept.addEventListener('click', function () {
                saveChoice('granted');
                updateConsent('granted');
                hideBanner();
              });
              reject.addEventListener('click', function () {
                saveChoice('denied');
                updateConsent('denied');
                hideBanner();
              });

              if (readChoice()) hideBanner();
              else showBanner();
            })();
          `}
        </Script>
        <WebMCPInit />
        <AuthProvider>
          <ThemeProvider>
            <CartProvider>
              <ToastProvider>
                <CartSheetProvider>
                  <div className="app-container">
                    {children}
                  </div>
                </CartSheetProvider>
              </ToastProvider>
            </CartProvider>
          </ThemeProvider>
        </AuthProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
