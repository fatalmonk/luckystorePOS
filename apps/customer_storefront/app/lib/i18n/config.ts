export const LOCALES = ['en', 'bn'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export function getLocaleFromPathname(pathname: string | null | undefined): Locale {
  return pathname === '/bn' || pathname?.startsWith('/bn/') ? 'bn' : DEFAULT_LOCALE;
}

export function stripLocalePrefix(pathname: string): string {
  if (pathname === '/bn') return '/';
  return pathname.startsWith('/bn/') ? pathname.slice(3) || '/' : pathname;
}

export function withLocale(pathname: string, locale: Locale): string {
  const cleanPath = stripLocalePrefix(pathname);
  return locale === 'bn' ? `/bn${cleanPath === '/' ? '' : cleanPath}` : cleanPath;
}
