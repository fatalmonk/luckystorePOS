'use client'; // path-based active state + cart badge on Cart link

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartContext } from './CartProvider';

interface ActiveLinkProps {
  href: string;
  icon: ReactNode;
  label: string;
  hideLabel?: boolean;
  showBadge?: boolean;
  external?: boolean;
  emphasized?: boolean;
}

function CartBadge() {
  const { totalItems } = useCartContext();
  if (totalItems <= 0) return null;
  return (
    <span
      data-testid="cart-badge"
      className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warm-accent px-1 text-[10px] font-black leading-none text-warm-accent-text shadow-sm ring-2 ring-warm-surface dark:ring-[#121214]"
    >
      {totalItems}
      <span className="sr-only"> items in cart</span>
    </span>
  );
}

export function ActiveLink({
  href,
  icon,
  label,
  hideLabel = false,
  showBadge = false,
  external = false,
  emphasized = false,
}: ActiveLinkProps) {
  const pathname = usePathname();
  const hrefPath = href.split('?')[0];
  const isActive = !external && (pathname === hrefPath || (hrefPath !== '/' && pathname?.startsWith(`${hrefPath}/`)));
  const className = `relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1 text-center transition-[color,background-color,transform] duration-200 motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent ${
    isActive
      ? emphasized ? 'text-warm-accent-text font-black' : 'text-warm-fg font-extrabold'
      : external
        ? 'text-[#0d6f37] hover:text-[#07572a] dark:text-[#25D366] dark:hover:text-[#5BE58B] font-semibold'
        : emphasized ? 'text-warm-accent-text hover:text-warm-accent-text font-bold' : 'text-warm-muted hover:text-warm-fg font-semibold'
  } ${emphasized ? 'rounded-full bg-warm-accent px-3 py-1 shadow-sm hover:bg-warm-accent-hover' : ''}`;
  const content = (
    <>
      {isActive && !emphasized && (
        <span
          className={`absolute left-1/2 -translate-x-1/2 rounded-full bg-warm-accent transition-[bottom,width,height] duration-300 ${
            hideLabel ? 'bottom-1 h-1 w-1' : 'bottom-1 h-1 w-3'
          }`}
        />
      )}
      <span className="relative inline-flex items-center justify-center" aria-hidden="true">
        {icon}
        {showBadge && <CartBadge />}
      </span>
      {hideLabel ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span className="text-[11px] leading-tight font-bold tracking-tight transition-[opacity,transform] duration-200 animate-in fade-in motion-reduce:transition-none">
          {label}
        </span>
      )}
    </>
  );

  return external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={`${label} (opens in a new tab)`}
    >
      {content}
    </a>
  ) : (
    <Link
      href={href}
      className={className}
      aria-current={isActive ? 'page' : undefined}
      aria-label={hideLabel ? label : undefined}
    >
      {content}
    </Link>
  );
}
