'use client';

import React from 'react';
import { BottomNavShell } from './BottomNavShell';
import { ActiveLink } from './ActiveLink';
import { HomeIcon, BrowseIcon, UserIcon, WhatsAppIcon } from './icons';

export function BottomNav() {
  return (
    <BottomNavShell>
      <nav className="flex h-[var(--bottom-nav-height)] flex-shrink-0 items-center justify-around border-t border-warm-border bg-warm-surface/95 backdrop-blur-xl dark:border-transparent" aria-label="Primary navigation">
        <ActiveLink href="/" icon={<HomeIcon size={22} />} label="Home" />
        <ActiveLink
          href="/category"
          icon={<BrowseIcon size={22} />}
          label="Browse"
        />
        <ActiveLink
          href="https://wa.me/8801731944544?text=Hello%20Lucky%20Store%2C%20I%20need%20help%20with%20my%20order."
          icon={<WhatsAppIcon size={22} />}
          label="WhatsApp"
          external
        />
        <ActiveLink href="/profile" icon={<UserIcon size={22} />} label="Profile" />
      </nav>
    </BottomNavShell>
  );
}
