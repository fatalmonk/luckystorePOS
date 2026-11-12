import { describe, expect, it } from 'vitest';
import { getLocalizedPathname, hasBengaliRoute } from './navigation';

describe('hasBengaliRoute', () => {
  it.each([
    '/',
    '/about',
    '/about/',
    '/brand',
    '/cart',
    '/category',
    '/checkout',
    '/delivery',
    '/fortune-cookies-near-me',
    '/login',
    '/order',
    '/profile',
    '/return-policy',
    '/signup',
    '/terms',
    '/wishlist',
    '/best/dealoftheweek',
    '/category/rice-and-grain',
    '/brand/acme',
    '/bn',
    '/bn/',
    '/bn/terms',
    '/bn/terms/',
    '/bn/category/rice-and-grain',
    '/bn/brand/acme',
    '/product/x?y=1',
    '/about#details',
    '/about/?y=1#details',
    '/bn/terms/?y=1#details',
    '/bn/order?num=LSO-1#track=token-1',
    '/bn?y=1#top',
    '/bn/product/x?y=1#details',
  ])('recognizes the Bengali counterpart for %s', (pathname) => {
    expect(hasBengaliRoute(pathname)).toBe(true);
  });

  it.each([
    '/contact',
    '/contact/',
    '/bn/contact?y=1#top',
    '/product',
    '/product/',
    '/about-us',
    '/terms/extra',
    '/terms/extra/',
    '/brands/acme',
    '/category/a/b',
    '/product/x/y',
    '/bn/brand/a/b',
  ])(
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
    ['/category/a/b', 'bn', '/bn'],
    ['/product/x/y', 'bn', '/bn'],
    ['/bn/about', 'en', '/about'],
    ['/bn/about', 'bn', '/bn/about'],
    ['/about/', 'bn', '/bn/about/'],
    ['/bn/terms/', 'en', '/terms/'],
    ['/about/?y=1#details', 'bn', '/bn/about/?y=1#details'],
    ['/order?num=LSO-1#track=token-1', 'bn', '/bn/order?num=LSO-1#track=token-1'],
    ['/bn/order?num=LSO-1#track=token-1', 'en', '/order?num=LSO-1#track=token-1'],
    ['/', 'bn', '/bn'],
    ['/bn', 'en', '/'],
    ['/product/x?y=1#details', 'bn', '/bn/product/x?y=1#details'],
    ['/bn/product/x?y=1#details', 'en', '/product/x?y=1#details'],
  ] as const)('localizes %s to %s as %s', (pathname, locale, expected) => {
    expect(getLocalizedPathname(pathname, locale)).toBe(expected);
  });
});
