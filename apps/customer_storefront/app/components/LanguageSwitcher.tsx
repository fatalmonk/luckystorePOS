'use client';

import React, { useCallback, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from 'cn';
import { getLocaleFromPathname } from '../lib/i18n/config';
import { getDictionary } from '../lib/i18n/dictionaries';
import { getLocaleHref } from '../lib/i18n/navigation';

export type Direction = 'ltr' | 'rtl' | 'ttb' | 'btt';
export type Locale = 'en' | 'bn';

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
      const targetPath = target === 'bn' && !supportsBengaliRoute ? '/' : pathname;
      const targetHref = getLocaleHref(
        targetPath,
        targetPath === '/' && cleanPath !== '/' ? '' : search ? `?${search}` : '',
        target
      );
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
      onImmediateChange?.(targetInfo.targetLocale);
      startTransition(() => {
        if (router?.push) {
          router.push(targetInfo.targetHref, { scroll: false });
        } else if (typeof window !== 'undefined') {
          window.location.assign(targetInfo.targetHref);
        }
      });
    },
    [calculateTarget, onImmediateChange, router]
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
      hrefLang={targetLocale === 'bn' ? 'bn-BD' : 'en-BD'}
      prefetch={true}
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
