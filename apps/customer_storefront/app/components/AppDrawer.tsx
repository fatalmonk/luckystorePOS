'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, House, ShoppingCart, Tag, Fire, Storefront, MapPin, Phone, Heart, Question, Sun, Moon } from '@phosphor-icons/react';
import { CATEGORY_GROUPS } from '../lib/types';
import { BENGALI_CATEGORY_NAMES } from '../lib/products/getHomePageData';
import { lockBodyScroll } from '../lib/bodyScrollLock';
import { Logo } from './ui/Logo';
import { useTheme } from './providers/ThemeProvider';
import { getCategoryIcon } from './icons/CategoryIcons';
import { getLocaleFromPathname, withLocale, type Locale } from '../lib/i18n/config';
import { getDictionary } from '../lib/i18n/dictionaries';

interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
  locale?: Locale;
}

export function AppDrawer({ open, onClose, locale }: AppDrawerProps) {
  const pathname = usePathname() || '/';
  const effectiveLocale = locale ?? getLocaleFromPathname(pathname);
  const dict = getDictionary(effectiveLocale);
  const { theme, toggleTheme } = useTheme();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const topLinks = [
    { href: withLocale('/', effectiveLocale), label: dict.appDrawer.home, icon: House },
    { href: withLocale('/category', effectiveLocale), label: dict.appDrawer.shopAll, icon: Storefront },
    { href: withLocale('/category?theme=deals', effectiveLocale), label: dict.appDrawer.deals, icon: Fire },
    { href: withLocale('/category?theme=new', effectiveLocale), label: dict.appDrawer.newArrivals, icon: Tag },
  ];

  // Manage focus, Escape, and keyboard containment while the drawer is open.
  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !drawerRef.current) return;

      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('disabled'));

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  // Trap scroll when open
  useEffect(() => {
    if (!open) return;
    return lockBodyScroll();
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!open}
        inert={!open}
        className={`fixed left-0 top-0 bottom-0 z-50 w-72 max-w-[85vw] bg-warm-surface border-r border-warm-border flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-warm-border px-4">
          <Logo href="/" onClick={onClose} className="[&_img]:!h-11 [&_img]:w-auto" />
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-warm-muted transition-colors hover:bg-warm-border hover:text-warm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            aria-label={dict.appDrawer.closeMenu}
          >
            <X weight="bold" size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Top Links */}
        <nav className="px-3 py-3 border-b border-warm-border" aria-label={effectiveLocale === 'bn' ? 'প্রধান নেভিগেশন' : 'Main navigation'}>
          <ul className="space-y-0.5">
            {topLinks.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  className="flex items-center gap-3 min-h-11 px-3 rounded-xl text-sm font-semibold text-warm-fg hover:bg-warm-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                >
                  <Icon weight="bold" size={20} aria-hidden="true" className="text-warm-accent shrink-0" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Categories */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <p className="px-3 mb-2 text-xs font-black text-warm-dim uppercase tracking-widest">{dict.appDrawer.categories}</p>
          <ul className="space-y-0.5">
            {CATEGORY_GROUPS.map((group) => (
              <li key={group.slug}>
                <Link
                  href={withLocale(`/category/${group.slug}`, effectiveLocale)}
                  onClick={onClose}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-warm-fg transition-colors hover:bg-warm-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                >
                  <span className="shrink-0 text-warm-muted" aria-hidden="true">
                    {getCategoryIcon(group.slug, 18)}
                  </span>
                  <span className="truncate">
                    {effectiveLocale === 'bn' ? BENGALI_CATEGORY_NAMES[group.slug] || group.label : group.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-warm-border shrink-0 space-y-3">
          <div className="space-y-1.5">
            <Link
              href={withLocale('/delivery', effectiveLocale)}
              onClick={onClose}
              className="text-xs font-semibold leading-5 text-warm-fg hover:text-warm-accent transition-colors block"
            >
              {dict.appDrawer.freeDeliveryPromo}
            </Link>
            <a
              href="tel:+8801731944544"
              className="flex items-center gap-2 text-xs font-semibold text-warm-muted hover:text-warm-accent transition-colors"
            >
              <Phone weight="bold" size={14} aria-hidden="true" />
              +880 1731-944544
            </a>
            <Link
              href={withLocale('/delivery', effectiveLocale)}
              onClick={onClose}
              className="flex items-center gap-2 text-xs font-semibold text-warm-muted transition-colors hover:text-warm-accent"
            >
              <MapPin weight="bold" size={14} aria-hidden="true" />
              {dict.appDrawer.deliveryInfo}
            </Link>
            <Link
              href={withLocale('/#how-it-works', effectiveLocale)}
              onClick={onClose}
              className="flex items-center gap-2 text-xs font-semibold text-warm-muted transition-colors hover:text-warm-accent"
            >
              <Question weight="bold" size={14} aria-hidden="true" />
              {dict.appDrawer.helpCenter}
            </Link>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-warm-border text-xs font-bold text-warm-fg transition-colors hover:bg-warm-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            aria-label={theme === 'dark' ? dict.appDrawer.switchToLight : dict.appDrawer.switchToDark}
          >
            {theme === 'dark' ? <Sun weight="bold" size={16} aria-hidden="true" /> : <Moon weight="bold" size={16} aria-hidden="true" />}
            {theme === 'dark' ? dict.appDrawer.lightMode : dict.appDrawer.darkMode}
          </button>
          <div className="flex items-center gap-2">
            <Link
              href="/wishlist"
              prefetch={false}
              onClick={onClose}
              className="flex h-11 items-center gap-2 rounded-full border border-warm-border px-4 text-xs font-bold text-warm-fg transition-colors hover:bg-warm-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            >
              <Heart weight="bold" size={16} aria-hidden="true" />
              Wishlist
            </Link>
            <Link
              href="/cart"
              onClick={onClose}
              className="flex h-11 items-center gap-2 rounded-full bg-warm-accent px-4 text-xs font-bold text-warm-accent-text transition-colors hover:bg-warm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            >
              <ShoppingCart weight="bold" size={16} aria-hidden="true" />
              Cart
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
