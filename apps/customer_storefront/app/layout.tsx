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
    default: 'Lucky Store — Save Money. Live Better. | Online Grocery Chittagong',
    template: '%s | Lucky Store',
  },
  description:
    'Online grocery Chittagong. Daily shop for Oil, Chal, pantry staples & daily bazaar items. Free return & home delivery. Save Money. Live Better.',
  keywords: [
    'online grocery chittagong',
    'grocery stores chittagong',
    'grocery price chittagong',
    'bangladesh online grocery',
    'bangladesh bazaar',
    'best bazaar',
    'daily bazaar',
    'daily shop',
    'bd shop',
    'online shop',
    'home shop',
    'Oil',
    'Chal',
    'free return',
    'chittagong online grocery',
    'grocery shop near me',
    'free home delivery',
    'discount grocery',
    'fresh grocery',
    'organic grocery',
    'Lucky Store',
    'Chittagong grocery',
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
    siteName: 'Lucky Store 1947',
    title: 'Lucky Store — Save Money. Live Better. | Online Grocery Chittagong',
    description:
      'Daily bazaar BD shop for Oil, Chal & grocery essentials. Best grocery price Chittagong, free return & home delivery.',
    images: [
      {
        url: '/lucky-store-social-share-v2.png',
        width: 1200,
        height: 630,
        alt: 'Lucky Store — Online Grocery Chittagong, Bangladesh Bazaar & Daily Shop',
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
    title: 'Lucky Store — Save Money. Live Better. | Online Grocery Chittagong',
    description:
      'Online grocery Chittagong. Daily shop for Oil, Chal & grocery essentials. Best grocery price & free return.',
    images: [
      {
        url: '/lucky-store-social-share-v2.png',
        alt: 'Lucky Store — Online Grocery Chittagong',
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
        <link rel="preconnect" href="https://images.luckystore1947.com" crossOrigin="anonymous" />
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
              name: 'Lucky Store — Online Grocery Chittagong',
              alternateName: ['Lucky Store Chittagong', 'Bangladesh Online Grocery', 'Daily Bazaar BD Shop', 'Chittagong Online Shop'],
              description: 'Best Bangladesh online grocery & daily bazaar in Chittagong. Shop Oil, Chal (Rice), daily shop items, best grocery price Chittagong & free return.',
              url: 'https://luckystore1947.com',
              telephone: '+880 1731-944544',
              email: 'hello@luckystore1947.com',
              priceRange: '$$',
              currenciesAccepted: 'BDT',
              paymentAccepted: 'Cash',
              areaServed: {
                '@type': 'City',
                name: 'Chittagong',
                addressCountry: 'BD',
              },
              openingHours: [
                'Mo-Sa 08:00-22:00',
                'Su 09:00-21:00',
              ],
              address: {
                '@type': 'PostalAddress',
                streetAddress: '665 Percival Hill Road, Emdad Park',
                addressLocality: 'Chittagong',
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
        {/* Google Analytics — deferred to idle time, never blocks render or layout */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-K5JLJNSW6D"
          strategy="lazyOnload"
        />
        <Script id="gtag-init" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-K5JLJNSW6D');
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
      </body>
    </html>
  );
}