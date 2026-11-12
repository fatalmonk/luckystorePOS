'use client';

import React, { useCallback, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from 'cn';
import type { Locale } from '../lib/i18n/config';
import { getLocaleFromPathname, LOCALE_HREFLANG, stripLocalePrefix } from '../lib/i18n/config';
import { getDictionary } from '../lib/i18n/dictionaries';
import { getLocalizedPathname, hasBengaliRoute } from '../lib/i18n/navigation';

export type Direction = 'ltr' | 'rtl' | 'ttb' | 'btt';
export type { Locale } from '../lib/i18n/config';

export interface LanguageSwitcherRenderState {
  locale: string;
  targetLocale: string;
  targetHref: string;
  label: string;
  isTransitioning: boolean;
  toggleLanguage: (nextLocale?: string) => void;
}

export interface LanguageSwitcherProps {
  direction?: Direction;
  onImmediateChange?: (locale: string) => void;
  className?: string;
  children?: (state: LanguageSwitcherRenderState) => React.ReactNode;
}

function useSafeRouter() {
  try {
    return useRouter();
  } catch {
    return null;
  }
}

export function LanguageSwitcher({
  direction,
  onImmediateChange,
  className,
  children,
}: LanguageSwitcherProps) {
  const router = useSafeRouter();
  const pathname = usePathname() || '/';
  const search = useSearchParams()?.toString() || '';
  const currentLocale = getLocaleFromPathname(pathname);
  const [isPending, startTransition] = useTransition();

  const calculateTarget = useCallback(
    (requestedLocale?: string) => {
      const activeLocale = currentLocale;
      const target: Locale =
        requestedLocale === 'bn' || requestedLocale === 'en'
          ? requestedLocale
          : activeLocale === 'bn'
            ? 'en'
            : 'bn';
      const dictionary = getDictionary(activeLocale);
      const cleanPath = stripLocalePrefix(pathname);
      const targetPath = getLocalizedPathname(cleanPath, target);
      const targetHref =
        target === 'bn' && !hasBengaliRoute(cleanPath)
          ? targetPath
          : `${targetPath}${search ? `?${search}` : ''}`;
      return {
        locale: activeLocale,
        targetLocale: target,
        targetHref,
        label: dictionary.language,
      };
    },
    [currentLocale, pathname, search]
  );

  const { targetLocale, targetHref, label } = calculateTarget();

  const toggleLanguage = useCallback(
    (nextLocale?: string) => {
      const targetInfo = calculateTarget(nextLocale);
      const navigationHref =
        typeof window !== 'undefined' &&
        (targetInfo.targetLocale === 'en' || hasBengaliRoute(pathname))
          ? `${targetInfo.targetHref}${window.location.hash}`
          : targetInfo.targetHref;
      onImmediateChange?.(targetInfo.targetLocale);
      startTransition(() => {
        if (router?.push) {
          router.push(navigationHref, { scroll: false });
        } else if (typeof window !== 'undefined') {
          window.location.assign(navigationHref);
        }
      });
    },
    [calculateTarget, onImmediateChange, pathname, router]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }
      e.preventDefault();
      toggleLanguage();
    },
    [toggleLanguage]
  );

  const state: LanguageSwitcherRenderState = {
    locale: currentLocale,
    targetLocale,
    targetHref,
    label,
    isTransitioning: isPending,
    toggleLanguage,
  };

  if (typeof children === 'function') {
    return <>{children(state)}</>;
  }

  return (
    <Link
      href={targetHref}
      onClick={handleClick}
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-full border border-warm-border px-3 text-xs font-bold text-warm-fg transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent',
        isPending && 'cursor-wait opacity-80',
        className
      )}
      lang={targetLocale === 'bn' ? 'bn' : 'en'}
      hrefLang={LOCALE_HREFLANG[targetLocale]}
      prefetch={false}
      scroll={false}
      aria-busy={isPending}
    >
      {isPending ? (
        <span className="inline-flex items-center gap-1.5" aria-hidden="true" data-testid="language-skeleton">
          <span className="h-3.5 w-7 animate-pulse rounded-full bg-warm-border/70" />
        </span>
      ) : (
        label
      )}
    </Link>
  );
}
