'use client'; // path-based active state + cart badge on Cart link

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartContext } from './CartProvider';

interface ActiveLinkProps {
  href: string;
  icon: ReactNode;
  label: string;
  showBadge?: boolean;
  external?: boolean;
}

function CartBadge() {
  const { totalItems } = useCartContext();
  if (totalItems <= 0) return null;
  return (
    <span className="absolute right-2.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-warm-accent px-1 text-xs font-bold leading-none text-warm-accent-text">
      {totalItems}
      <span className="sr-only"> items in cart</span>
    </span>
  );
}

export function ActiveLink({ href, icon, label, showBadge, external = false }: ActiveLinkProps) {
  const pathname = usePathname();
  const hrefPath = href.split('?')[0];
  const isActive = !external && (pathname === hrefPath || (hrefPath !== '/' && pathname?.startsWith(`${hrefPath}/`)));
  const className = `relative flex min-h-[44px] min-w-16 flex-col items-center justify-center gap-0.5 px-3 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent ${
    isActive ? 'text-warm-fg' : external ? 'text-[#168f49] hover:text-[#0d6f37]' : 'text-warm-muted hover:text-warm-fg'
  }`;
  const content = (
    <>
      {isActive && (
        <span className="absolute -top-0.5 left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-full bg-warm-accent" />
      )}
      <span className="inline-flex items-center justify-center" aria-hidden="true">{icon}</span>
      <span className="text-xs font-bold">{label}</span>
      {showBadge && <CartBadge />}
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
    >
      {content}
    </Link>
  );
}
