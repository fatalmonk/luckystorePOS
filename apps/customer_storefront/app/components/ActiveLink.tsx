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
}

function CartBadge() {
  const { totalItems } = useCartContext();
  if (totalItems <= 0) return null;
  return (
    <span className="absolute top-0.5 right-2.5 min-w-[17px] h-[17px] bg-warm-accent text-warm-fg text-[10px] font-bold rounded-full grid place-items-center px-1 leading-none">
      {totalItems}
      <span className="sr-only"> items in cart</span>
    </span>
  );
}

export function ActiveLink({ href, icon, label, showBadge }: ActiveLinkProps) {
  const pathname = usePathname();
  const hrefPath = href.split('?')[0];
  const isActive = pathname === hrefPath || (hrefPath !== '/' && pathname?.startsWith(`${hrefPath}/`));

  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] px-5 relative transition-all duration-200 ${
        isActive ? 'text-warm-fg' : 'text-warm-muted hover:text-warm-fg'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      {isActive && (
        <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-warm-accent rounded-full" />
      )}
      <span className="inline-flex items-center justify-center" aria-hidden="true">{icon}</span>
      <span className="text-[10px] font-bold">{label}</span>
      {showBadge && <CartBadge />}
    </Link>
  );
}
