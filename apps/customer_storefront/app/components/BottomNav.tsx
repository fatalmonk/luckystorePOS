'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { BottomNavShell } from './BottomNavShell';
import { ActiveLink } from './ActiveLink';
import { HomeIcon, BrowseIcon, UserIcon, WhatsAppIcon } from './icons';
import { getLocaleFromPathname, withLocale, type Locale } from '../lib/i18n/config';
import { getDictionary } from '../lib/i18n/dictionaries';

export function BottomNav({ locale }: { locale?: Locale }) {
  const pathname = usePathname();
  const currentLocale = locale ?? getLocaleFromPathname(pathname);
  const dict = getDictionary(currentLocale);

  return (
    <BottomNavShell>
      <nav className="flex h-[var(--bottom-nav-height)] flex-shrink-0 items-center justify-around border-t border-warm-border bg-warm-surface/95 backdrop-blur-xl dark:border-transparent" aria-label={currentLocale === 'bn' ? 'প্রধান নেভিগেশন' : 'Primary navigation'}>
        <ActiveLink href={withLocale('/', currentLocale)} icon={<HomeIcon size={22} />} label={dict.bottomNav.home} />
        <ActiveLink
          href={withLocale('/category', currentLocale)}
          icon={<BrowseIcon size={22} />}
          label={dict.bottomNav.browse}
        />
        <ActiveLink
          href="https://wa.me/8801731944544?text=Hello%20Lucky%20Store%2C%20I%20need%20help%20with%20my%20order."
          icon={<WhatsAppIcon size={22} />}
          label={dict.bottomNav.whatsapp}
          external
        />
        <ActiveLink href={withLocale('/profile', currentLocale)} icon={<UserIcon size={22} />} label={dict.bottomNav.profile} />
      </nav>
    </BottomNavShell>
  );
}
