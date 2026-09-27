import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/checkout',
          '/cart',
          '/profile',
          '/order',
          '/login',
          '/signup',
          '/bn/checkout',
          '/bn/cart',
          '/bn/profile',
          '/bn/order',
        ],
      },
    ],
    sitemap: 'https://www.luckystore1947.com/sitemap.xml',
  };
}
