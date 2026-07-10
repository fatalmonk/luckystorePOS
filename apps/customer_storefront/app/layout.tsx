import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Geist, Geist_Mono, Noto_Sans_Bengali } from 'next/font/google';
import './globals.css';
import { ToastProvider } from './components/Toast';
import { CartProvider } from './components/CartProvider';
import { WebMCPInit } from './components/WebMCPInit';

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
    icon: '/favicon-32x32.png',
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
              ],
            }),
          }}
        />
      </head>
      <body className="antialiased font-body pb-[68px]" suppressHydrationWarning>
        {/* Google Analytics — deferred, never blocks LCP */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-K5JLJNSW6D"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-K5JLJNSW6D');
          `}
        </Script>
        <WebMCPInit />
        <CartProvider>
          <ToastProvider>
            <div className="app-container">
              {children}
            </div>
          </ToastProvider>
        </CartProvider>
      </body>
    </html>
  );
}
