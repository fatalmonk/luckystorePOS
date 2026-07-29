'use client';

import { BottomNavShell } from './BottomNavShell';
import { ActiveLink } from './ActiveLink';
import { HomeIcon, BrowseIcon, CartIcon, WhatsAppIcon } from './icons';

export function BottomNav() {
  const navItems = [
    { icon: <HomeIcon size={22} />, label: 'Home', href: '/' },
    { icon: <BrowseIcon size={22} />, label: 'Browse', href: '/category' },
    {
      icon: <WhatsAppIcon size={22} />,
      label: 'WhatsApp',
      href: 'https://wa.me/8801731944544?text=Hello%20Lucky%20Store%2C%20I%20need%20help%20with%20my%20order.',
      external: true,
    },
    { icon: <CartIcon size={22} />, label: 'Cart', href: '/cart', showBadge: true },
  ];

  return (
    <BottomNavShell>
      <nav className="flex h-[60px] flex-shrink-0 items-center justify-around border-t border-warm-border bg-warm-surface/95 backdrop-blur-xl dark:border-transparent" aria-label="Primary navigation">
        {navItems.map((item) => (
          <ActiveLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            showBadge={item.showBadge}
            external={item.external}
          />
        ))}
      </nav>
    </BottomNavShell>
  );
}
