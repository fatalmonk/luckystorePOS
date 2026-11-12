import type { Locale } from './config';
import { stripLocalePrefix, withLocale } from './config';

export const BENGALI_ROUTE_PATHS = [
  '/',
  '/about',
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
] as const;

export const BENGALI_ROUTE_PREFIXES = ['/category/', '/product/', '/brand/'] as const;

export function hasBengaliRoute(pathname: string): boolean {
  const path = stripLocalePrefix(pathname.split(/[?#]/, 1)[0] ?? '/');
  const normalizedPath = path === '/' ? path : path.replace(/\/+$/, '');
  return BENGALI_ROUTE_PATHS.some((route) => normalizedPath === route)
    || BENGALI_ROUTE_PREFIXES.some((prefix) => {
      if (!normalizedPath.startsWith(prefix)) return false;
      const slug = normalizedPath.slice(prefix.length);
      return slug.length > 0 && !slug.includes('/');
    });
}

export function getLocalizedPathname(pathname: string, targetLocale: Locale): string {
  if (targetLocale === 'bn' && !hasBengaliRoute(pathname)) return '/bn';
  return withLocale(pathname, targetLocale);
}

export function getLocaleHref(pathname: string, search: string, locale: Locale): string {
  return `${withLocale(pathname, locale)}${search}`;
}
