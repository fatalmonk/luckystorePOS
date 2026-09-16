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
  if (!pathname || pathname.startsWith('http://') || pathname.startsWith('https://') || pathname.startsWith('//') || pathname.startsWith('#') || pathname.startsWith('mailto:') || pathname.startsWith('tel:')) {
    return pathname;
  }
  const cleanPath = stripLocalePrefix(pathname);
  return locale === 'bn' ? `/bn${cleanPath === '/' ? '' : cleanPath}` : cleanPath;
}

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBengaliNumerals(val: number | string): string {
  return String(val).replace(/[0-9]/g, (digit) => BENGALI_DIGITS[Number(digit)] ?? digit);
}
