import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Geist, Geist_Mono, Noto_Sans_Bengali } from 'next/font/google';
import './globals.css';
import { ToastProvider } from './components/Toast';
import { CartProvider } from './components/CartProvider';
import { CartSheetProvider } from './components/providers/CartSheetProvider';
import { WebMCPInit } from './components/WebMCPInit';
import { AuthProvider } from './components/providers/AuthProvider';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'optional',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'optional',
});

const notoBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  variable: '--font-bengali',
  display: 'optional',
});

export const metadata: Metadata = {
  title: { default: 'Lucky Store', template: '%s | Lucky Store' },
  description: 'Your friendly neighborhood grocery store in Chittagong. Fresh products, fair prices, same-day delivery. Shop local.',
  keywords: ['grocery', 'supermarket', 'Chittagong', 'Bangladesh', 'Lucky Store', 'online grocery'],
  authors: [{ name: 'Lucky Store' }],
  creator: 'Lucky Store',
  metadataBase: new URL('https://luckystore1947.com'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_BD',
    url: '/',
    siteName: 'Lucky Store',
    title: 'Lucky Store — Your Friendly Neighborhood Grocer',
    description: 'Fresh products, fair prices, same-day delivery in Chittagong. Shop local.',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Lucky Store — Your Friendly Neighborhood Grocery in Chittagong',
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
    title: 'Lucky Store — Your Friendly Neighborhood Grocer',
    description: 'Fresh products, fair prices, same-day delivery in Chittagong. Shop local.',
    images: ['/twitter-image.png'],
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
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={`${geistSans.variable} ${geistMono.variable} ${notoBengali.variable}`}>
      <head>
        <link rel="preconnect" href="https://images.luckystore1947.com" crossOrigin="anonymous" />
        <meta name="facebook-domain-verification" content="9jw1hn1oghfyjbs41ymolt13tkd7hi" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'GroceryStore',
              name: 'Lucky Store',
              url: 'https://luckystore1947.com',
              telephone: '+880 1731-944544',
              email: 'hello@luckystore1947.com',
              priceRange: '$$',
              currenciesAccepted: 'BDT',
              paymentAccepted: 'Cash, bKash, Nagad, Card, Visa, Mastercard',
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
      <body className="antialiased font-body pb-[60px] md:pb-0" suppressHydrationWarning>
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
          <CartProvider>
            <ToastProvider>
              <CartSheetProvider>
                <div className="app-container">
                  {children}
                </div>
              </CartSheetProvider>
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
