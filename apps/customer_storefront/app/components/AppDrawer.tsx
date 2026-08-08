'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { X, House, ShoppingCart, Tag, Fire, Storefront, MapPin, Phone, Heart, Question, Sun, Moon } from '@phosphor-icons/react';
import { CATEGORY_GROUPS } from '../lib/types';
import { lockBodyScroll } from '../lib/bodyScrollLock';
import { Logo } from './ui/Logo';
import { useTheme } from './providers/ThemeProvider';
import { getCategoryIcon } from './icons/CategoryIcons';

interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
}

const TOP_LINKS = [
  { href: '/', label: 'Home', icon: House },
  { href: '/category', label: 'Shop All', icon: Storefront },
  { href: '/category?theme=deals', label: 'Deals', icon: Fire },
  { href: '/category?theme=new', label: 'New Arrivals', icon: Tag },
];

export function AppDrawer({ open, onClose }: AppDrawerProps) {
  const { theme, toggleTheme } = useTheme();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

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
        <div className="flex items-center justify-between px-4 h-14 border-b border-warm-border shrink-0">
          <Logo href="/" onClick={onClose} className="[&_img]:!h-7" />
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-warm-muted hover:text-warm-fg hover:bg-warm-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
            aria-label="Close menu"
          >
            <X weight="bold" size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Top Links */}
        <nav className="px-3 py-3 border-b border-warm-border" aria-label="Main navigation">
          <ul className="space-y-0.5">
            {TOP_LINKS.map(({ href, label, icon: Icon }) => (
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
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <p className="px-3 mb-2 text-xs font-black text-warm-dim uppercase tracking-widest">Categories</p>
          <ul className="space-y-0.5">
            {CATEGORY_GROUPS.map((group) => (
              <li key={group.slug}>
                <Link
                  href={`/category/${group.slug}`}
                  onClick={onClose}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-warm-fg transition-colors hover:bg-warm-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                >
                  <span className="shrink-0 text-warm-muted" aria-hidden="true">
                    {getCategoryIcon(group.slug, 18)}
                  </span>
                  <span className="truncate">{group.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-warm-border shrink-0 space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold leading-5 text-warm-fg">
              Free delivery on orders over ৳500
            </p>
            <a
              href="tel:+8801731944544"
              className="flex items-center gap-2 text-xs font-semibold text-warm-muted hover:text-warm-accent transition-colors"
            >
              <Phone weight="bold" size={14} aria-hidden="true" />
              +880 1731-944544
            </a>
            <p className="flex items-center gap-2 text-xs font-semibold text-warm-muted">
              <MapPin weight="bold" size={14} aria-hidden="true" />
              Chittagong, Bangladesh
            </p>
            <Link
              href="/#how-it-works"
              onClick={onClose}
              className="flex items-center gap-2 text-xs font-semibold text-warm-muted transition-colors hover:text-warm-accent"
            >
              <Question weight="bold" size={14} aria-hidden="true" />
              Help Center
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-warm-border text-warm-fg transition-colors hover:bg-warm-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun weight="bold" size={16} aria-hidden="true" /> : <Moon weight="bold" size={16} aria-hidden="true" />}
            </button>
            <Link
              href="/wishlist"
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
