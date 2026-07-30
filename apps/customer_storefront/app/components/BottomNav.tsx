'use client';

import { useState } from 'react';
import { BottomNavShell } from './BottomNavShell';
import { ActiveLink } from './ActiveLink';
import { HomeIcon, BrowseIcon, CartIcon, WhatsAppIcon } from './icons';
import { CategorySheet } from './CategorySheet';

export function BottomNav() {
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);

  return (
    <>
      <BottomNavShell>
        <nav className="flex h-[60px] flex-shrink-0 items-center justify-around border-t border-warm-border bg-warm-surface/95 backdrop-blur-xl dark:border-transparent" aria-label="Primary navigation">
          <ActiveLink href="/" icon={<HomeIcon size={22} />} label="Home" />
          <button
            type="button"
            onClick={() => setIsCategorySheetOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 min-h-[44px] px-3 text-warm-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent rounded-lg"
            aria-label="Browse Categories"
          >
            <BrowseIcon size={22} />
            <span className="text-[10px] font-bold">Browse</span>
          </button>
          <ActiveLink
            href="https://wa.me/8801731944544?text=Hello%20Lucky%20Store%2C%20I%20need%20help%20with%20my%20order."
            icon={<WhatsAppIcon size={22} />}
            label="WhatsApp"
            external
          />
          <ActiveLink href="/cart" icon={<CartIcon size={22} />} label="Cart" showBadge />
        </nav>
      </BottomNavShell>

      <CategorySheet isOpen={isCategorySheetOpen} onClose={() => setIsCategorySheetOpen(false)} />
    </>
  );
}
