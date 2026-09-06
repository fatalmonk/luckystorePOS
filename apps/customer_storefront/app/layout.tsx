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
});

const notoBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  variable: '--font-bengali',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Lucky Store | Online Grocery in Chattogram',
    template: '%s | Lucky Store',
  },
  description:
    'Shop pantry staples, snacks, dairy, and household essentials from Lucky Store, with local delivery and cash on delivery in Chattogram.',
  keywords: [
    'online grocery chattogram',
    'grocery stores chattogram',
    'grocery prices chattogram',
    'bangladesh online grocery',
    'bangladesh bazaar',
    'daily bazaar',
    'daily shop',
    'bd shop',
    'online shop',
    'home shop',
    'Oil',
    'Chal',
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
  metadataBase: new URL('https://luckystore1947.com'),
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
    title: 'Lucky Store | Online Grocery in Chattogram',
    description:
      'Shop pantry staples, snacks, dairy, and household essentials from Lucky Store, with local delivery and cash on delivery in Chattogram.',
    images: [
      {
        url: '/lucky-store-social-share-v2.png',
        width: 1200,
        height: 630,
        alt: 'Lucky Store online grocery in Chattogram',
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
    title: 'Lucky Store | Online Grocery in Chattogram',
    description:
      'Shop pantry staples, snacks, dairy, and household essentials from Lucky Store, with local delivery and cash on delivery in Chattogram.',
    images: [
      {
        url: '/lucky-store-social-share-v2.png',
        alt: 'Lucky Store online grocery in Chattogram',
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
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('lucky-theme');if(!t){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';}if(t==='dark')document.documentElement.dataset.theme='dark';})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': ['WebSite', 'GroceryStore'],
              name: 'Lucky Store',
              alternateName: ['Lucky Store 1947', 'Lucky Store Chattogram'],
              description: 'Lucky Store offers pantry staples, snacks, dairy, and household essentials with local delivery and cash on delivery in Chattogram.',
              url: 'https://luckystore1947.com',
              telephone: '+880 1731-944544',
              email: 'hello@luckystore1947.com',
              priceRange: '$$',
              currenciesAccepted: 'BDT',
              paymentAccepted: 'Cash',
              areaServed: {
                '@type': 'City',
                name: 'Chattogram',
                addressCountry: 'BD',
              },
              openingHours: [
                'Mo-Sa 08:00-22:00',
                'Su 09:00-21:00',
              ],
              address: {
                '@type': 'PostalAddress',
                streetAddress: '665 Percival Hill Road, Emdad Park',
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
              sameAs: [
                'https://facebook.com/luckystore1947',
                'https://instagram.com/luckystore1947',
                'https://wa.me/8801731944544',
                'https://www.google.com/maps/place/Lucky+Store/@22.3550277,91.8363056,17z',
              ],
            }),
          }}
        />
      </head>
      <body className="antialiased font-body" suppressHydrationWarning>
        <Script id="google-consent-default" strategy="beforeInteractive">
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
        {/* Google Analytics — inserted after idle time so hero paint wins the main thread. */}
        <Script id="gtag-init" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            var loadGtag = function(){
              if (document.querySelector('script[data-lucky-gtag]')) return;
              var script = document.createElement('script');
              script.async = true;
              script.src = 'https://www.googletagmanager.com/gtag/js?id=G-K5JLJNSW6D';
              script.dataset.luckyGtag = 'true';
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
              className="min-h-11 rounded-full border border-warm-border px-4 py-2 text-sm font-semibold hover:bg-warm-subtle"
            >
              Reject analytics
            </button>
            <button
              id="lucky-consent-accept"
              type="button"
              className="min-h-11 rounded-full bg-warm-accent px-4 py-2 text-sm font-bold text-black hover:brightness-95"
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
