'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Fire,
  House,
  Package,
  Storefront,
  UserCircle,
  UserPlus,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useAuth } from './providers/AuthProvider';

const DISTRACTION_FREE_PATHS = ['/checkout', '/login', '/signup'];

export function shouldHideDesktopRail(pathname: string) {
  return DISTRACTION_FREE_PATHS.some((path) => pathname.startsWith(path));
}

interface RailLink {
  href: string;
  label: string;
  icon: Icon;
  active: boolean;
}

export function DesktopQuickRail() {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  if (shouldHideDesktopRail(pathname)) return null;

  const accountLabel = loading ? 'Account' : user ? 'Profile' : 'Sign Up';
  const AccountIcon = loading ? UserCircle : user ? UserCircle : UserPlus;
  const isDeals = pathname.startsWith('/category') && searchParams.get('theme') === 'deals';
  const ordersHref = user ? '/profile#orders' : '/login?next=/profile%23orders';

  const links: RailLink[] = [
    { href: '/', label: 'Home', icon: House, active: pathname === '/' },
    {
      href: '/category',
      label: 'Shop',
      icon: Storefront,
      active: pathname.startsWith('/category') && !isDeals,
    },
    {
      href: user ? '/profile' : '/signup',
      label: accountLabel,
      icon: AccountIcon,
      active: pathname.startsWith('/profile') || pathname.startsWith('/signup'),
    },
    {
      href: '/category?theme=deals',
      label: 'Deals',
      icon: Fire,
      active: isDeals,
    },
    { href: ordersHref, label: 'Orders', icon: Package, active: false },
  ];

  return (
    <aside className="fixed bottom-0 left-0 top-14 z-40 hidden w-[72px] border-r border-warm-border/70 bg-warm-bg dark:border-transparent md:flex">
      <nav aria-label="Quick links" className="flex w-full flex-col items-center px-1 py-0">
        {links.map(({ href, label, icon: IconComponent, active }) => (
          <Link
            key={label}
            href={href}
            aria-current={active ? 'page' : undefined}
            title={label}
            className={`group flex h-16 w-[46px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl px-1 text-center text-[10px] font-bold leading-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-warm-accent ${
              active
                ? 'bg-warm-surface text-warm-fg'
                : 'text-warm-muted hover:bg-warm-surface/70 hover:text-warm-fg'
            }`}
          >
            <IconComponent
              aria-hidden="true"
              size={18}
              weight={active ? 'fill' : 'regular'}
              className={active ? 'text-warm-accent' : 'text-current'}
            />
            <span className="max-w-full truncate">{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
