import type { Metadata, Viewport } from 'next';
import { SEOHead } from '@/components/SEOHead';
import { getDeliveryShippingServiceSchema } from './delivery/deliveryData';

const metadata: Metadata = {
  title: {
    default: 'Lucky Store | Online Grocery & Daily Bazaar in Chattogram',
    template: '%s | Lucky Store',
  },
  description: 'Order groceries and daily bazaar essentials online from Lucky Store in Chattogram. Free delivery on ৳500+ within our delivery area, with Cash on Delivery.',
  openGraph: {
    title: 'Lucky Store | Online Grocery & Daily Bazaar in Chattogram',
    description: 'Order groceries and daily bazaar essentials online from Lucky Store in Chattogram.',
    url: 'https://www.luckystore1947.com',
    siteName: 'Lucky Store',
    locale: 'en_BD',
    type: 'website',
    images: [{ url: 'https://www.luckystore1947.com/lucky-store-social-share.jpg', alt: 'Lucky Store Chittagong Catalog' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lucky Store | Online Grocery & Daily Bazaar in Chattogram',
    description: 'Order groceries and daily bazaar essentials online from Lucky Store in Chattogram.',
    images: ['https://www.luckystore1947.com/lucky-store-social-share.jpg'],
  },
  alternates: {
    languages: {
      'en-BD': 'https://www.luckystore1947.com',
      'bn-BD': 'https://www.luckystore1947.com/bn',
      'x-default': 'https://www.luckystore1947.com',
    },
  },
  other: {
    'json-ld': JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Lucky Store',
      url: 'https://www.luckystore1947.com',
      logo: { '@type': 'ImageObject', url: 'https://www.luckystore1947.com/lucky-store-social-share.jpg' },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Chittagong',
        addressCountry: 'BD',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Customer service',
        email: 'info@luckystore1947.com',
        phone: '+880-1711-111111',
      },
    }),
  },
};

const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <SEOHead
          title={metadata.title.default}
          description={metadata.description}
          canonical="https://www.luckystore1947.com"
          hrefLang={{ en: 'https://www.luckystore1947.com', bn: 'https://www.luckystore1947.com/bn' }}
          image="https://www.luckystore1947.com/lucky-store-social-share.jpg"
        />
        {metadata.other?.'json-ld' && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: metadata.other?.'json-ld' }}
          />
        )}
        <meta name="robots" content="index, follow" />
        {children}
      </head>
      <body>{children}</body>
    </html>
  );
}