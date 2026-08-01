import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/checkout/', '/cart/', '/order/'],
    },
    sitemap: 'https://luckystore1947.com/sitemap.xml',
  };
}
