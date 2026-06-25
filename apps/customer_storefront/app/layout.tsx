import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from './components/Toast';
import { CartProvider } from './components/CartProvider';
import { WebMCPInit } from './components/WebMCPInit';

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
    title: 'Lucky Store — Your Neighborhood Grocery',
    description: 'Fresh products, fair prices, same-day delivery in Chittagong. Shop local.',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Lucky Store — Neighborhood Grocery in Chittagong',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@luckystore1947',
    creator: '@luckystore1947',
    title: 'Lucky Store — Your Neighborhood Grocery',
    description: 'Fresh products, fair prices, same-day delivery in Chittagong. Shop local.',
    images: ['/twitter-image.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="antialiased" suppressHydrationWarning>
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
