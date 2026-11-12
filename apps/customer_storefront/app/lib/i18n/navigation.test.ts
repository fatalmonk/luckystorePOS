import { describe, expect, it } from 'vitest';
import { getLocalizedPathname, hasBengaliRoute } from './navigation';

describe('hasBengaliRoute', () => {
  it.each([
    '/',
    '/about',
    '/brand',
    '/cart',
    '/category',
    '/checkout',
    '/delivery',
    '/fortune-cookies-near-me',
    '/login',
    '/profile',
    '/return-policy',
    '/signup',
    '/terms',
    '/wishlist',
    '/best/dealoftheweek',
    '/category/rice-and-grain',
    '/brand/acme',
    '/bn',
    '/bn/terms',
    '/bn/category/rice-and-grain',
    '/bn/brand/acme',
    '/product/x?y=1',
    '/about#details',
    '/bn?y=1#top',
    '/bn/product/x?y=1#details',
  ])('recognizes the Bengali counterpart for %s', (pathname) => {
    expect(hasBengaliRoute(pathname)).toBe(true);
  });

  it.each(['/contact', '/bn/contact?y=1#top', '/product', '/about-us', '/terms/extra', '/brands/acme'])(
    'rejects paths without a Bengali counterpart: %s',
    (pathname) => {
      expect(hasBengaliRoute(pathname)).toBe(false);
    },
  );
});

describe('getLocalizedPathname', () => {
  it.each([
    ['/contact', 'bn', '/bn'],
    ['/contact?y=1#top', 'bn', '/bn'],
    ['/contact', 'en', '/contact'],
    ['/category/rice-and-grain', 'bn', '/bn/category/rice-and-grain'],
    ['/bn/about', 'en', '/about'],
    ['/bn/about', 'bn', '/bn/about'],
    ['/', 'bn', '/bn'],
    ['/bn', 'en', '/'],
    ['/product/x?y=1#details', 'bn', '/bn/product/x?y=1#details'],
    ['/bn/product/x?y=1#details', 'en', '/product/x?y=1#details'],
  ] as const)('localizes %s to %s as %s', (pathname, locale, expected) => {
    expect(getLocalizedPathname(pathname, locale)).toBe(expected);
  });
});
