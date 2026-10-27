'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNavShell } from './BottomNavShell';
import { ActiveLink } from './ActiveLink';
import { HomeIcon, BrowseIcon, SearchIcon, CartIcon, UserIcon } from './icons';
import { getLocaleFromPathname, withLocale, type Locale } from '../lib/i18n/config';
import { getDictionary } from '../lib/i18n/dictionaries';

export function BottomNav({ locale }: { locale?: Locale }) {
  const pathname = usePathname();
  const currentLocale = locale ?? getLocaleFromPathname(pathname);
  const dict = getDictionary(currentLocale);
  const [isSqueezed, setIsSqueezed] = useState(false);

  useEffect(() => {
    let lastScrollY = typeof window !== 'undefined' ? (window.scrollY ?? window.pageYOffset ?? 0) : 0;
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY ?? window.pageYOffset ?? 0;
          if (currentY <= 20) {
            setIsSqueezed(false);
          } else if (currentY > lastScrollY + 8 && currentY > 50) {
            setIsSqueezed(true);
          } else if (currentY < lastScrollY - 8) {
            setIsSqueezed(false);
          }
          lastScrollY = Math.max(0, currentY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <BottomNavShell>
      <nav
        className={`pointer-events-auto flex origin-bottom items-center justify-between gap-0.5 rounded-full border border-warm-border/70 bg-warm-surface/90 shadow-[0_12px_32px_rgba(11,11,13,0.12),0_2px_8px_rgba(11,11,13,0.06)] backdrop-blur-2xl transition-[max-width,height,padding,box-shadow,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transform-none motion-reduce:transition-none dark:border-white/10 dark:bg-[#121214]/90 dark:shadow-[0_16px_40px_rgba(0,0,0,0.5),0_2px_10px_rgba(0,0,0,0.4)] ${
          isSqueezed
            ? 'h-12 w-full max-w-[280px] px-3 py-0.5 shadow-[0_8px_20px_rgba(11,11,13,0.18)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.6)]'
            : 'h-[3.875rem] w-full max-w-[390px] px-2 py-1'
        }`}
        aria-label={currentLocale === 'bn' ? 'প্রধান নেভিগেশন' : 'Primary navigation'}
      >
        <ActiveLink
          href={withLocale('/', currentLocale)}
          icon={<HomeIcon size={20} />}
          label={dict.bottomNav.home}
          hideLabel={isSqueezed}
        />
        <ActiveLink
          href={withLocale('/category', currentLocale)}
          icon={<BrowseIcon size={20} />}
          label={dict.bottomNav.browse}
          hideLabel={isSqueezed}
        />
        <ActiveLink
          href={withLocale('/search', currentLocale)}
          icon={<SearchIcon size={20} />}
          label={dict.bottomNav.search}
          hideLabel={isSqueezed}
        />
        <ActiveLink
          href={withLocale('/cart', currentLocale)}
          icon={<CartIcon size={20} />}
          label={dict.bottomNav.cart}
          showBadge
          hideLabel={isSqueezed}
        />
        <ActiveLink
          href={withLocale('/profile', currentLocale)}
          icon={<UserIcon size={20} />}
          label={dict.bottomNav.profile}
          hideLabel={isSqueezed}
        />
      </nav>
    </BottomNavShell>
  );
}
