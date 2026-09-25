'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { getLocaleFromPathname } from '../lib/i18n/config';
import { getDictionary } from '../lib/i18n/dictionaries';
import { getLocaleHref } from '../lib/i18n/navigation';

export function LanguageSwitcher() {
  const pathname = usePathname() || '/';
  const search = useSearchParams()?.toString() || '';
  const locale = getLocaleFromPathname(pathname);
  const targetLocale = locale === 'bn' ? 'en' : 'bn';
  const dictionary = getDictionary(locale);
  const cleanPath = pathname.startsWith('/bn') ? pathname.slice(3) || '/' : pathname;
  const supportsBengaliRoute =
    cleanPath === '/' ||
    cleanPath === '/delivery' ||
    cleanPath === '/category' ||
    cleanPath === '/cart' ||
    cleanPath === '/checkout' ||
    cleanPath === '/wishlist' ||
    cleanPath.startsWith('/category/') ||
    cleanPath.startsWith('/product/');
  const targetPath = targetLocale === 'bn' && !supportsBengaliRoute ? '/' : pathname;

  return (
    <Link
      href={getLocaleHref(targetPath, targetPath === '/' && cleanPath !== '/' ? '' : search ? `?${search}` : '', targetLocale)}
      className="inline-flex min-h-11 items-center rounded-full border border-warm-border px-3 text-xs font-bold text-warm-fg transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
      aria-label={dictionary.languageLabel}
      hrefLang={targetLocale === 'bn' ? 'bn-BD' : 'en-BD'}
      prefetch={true}
      scroll={false}
    >
      {dictionary.language}
    </Link>

  );
}
