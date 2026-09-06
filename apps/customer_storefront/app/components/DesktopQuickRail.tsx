'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
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
  const router = useRouter();
  const { user, loading, status, ensureAuth } = useAuth();

  useEffect(() => {
    if (shouldHideDesktopRail(pathname)) return;
    const media = window.matchMedia('(min-width: 768px)');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (media.matches) timer = setTimeout(() => { void ensureAuth().catch(() => {}); }, 3000);
    };
    const afterLoad = () => schedule();
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', afterLoad, { once: true });
    media.addEventListener('change', schedule);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('load', afterLoad);
      media.removeEventListener('change', schedule);
    };
  }, [pathname, ensureAuth]);

  const unresolved = loading || status === 'error';

  if (shouldHideDesktopRail(pathname)) return null;

  const accountLabel = unresolved ? 'Account' : user ? 'Profile' : 'Sign Up';
  const AccountIcon = unresolved ? UserCircle : user ? UserCircle : UserPlus;
  const isDeals = pathname.startsWith('/category') && searchParams.get('theme') === 'deals';
  const ordersHref = unresolved || user ? '/profile#orders' : '/login?next=/profile%23orders';

  const links: RailLink[] = [
    { href: '/', label: 'Home', icon: House, active: pathname === '/' },
    {
      href: '/category',
      label: 'Shop',
      icon: Storefront,
      active: pathname.startsWith('/category') && !isDeals,
    },
    {
      href: unresolved || user ? '/profile' : '/signup',
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
    <aside className="fixed bottom-0 left-0 top-14 z-40 hidden w-[72px] border-r border-transparent bg-warm-bg dark:border-transparent md:flex">
      <nav aria-label="Quick links" className="flex w-full flex-col items-center px-1 py-0">
        {links.map(({ href, label, icon: IconComponent, active }) => (
          <Link
            key={label}
            prefetch={label === accountLabel || label === 'Orders' ? false : undefined}
            onClick={async (event) => {
              if (!unresolved || (label !== accountLabel && label !== 'Orders')) return;
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              try {
                const resolved = await ensureAuth();
                router.push(label === 'Orders'
                  ? (resolved ? '/profile#orders' : '/login?next=/profile%23orders')
                  : (resolved ? '/profile' : '/signup'));
              } catch {
                router.push('/profile');
              }
            }}
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
