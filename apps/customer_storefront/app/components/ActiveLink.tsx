'use client'; // path-based active state + cart badge on Cart link

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface ActiveLinkProps {
  href: string;
  icon: ReactNode;
  label: string;
  external?: boolean;
}

export function ActiveLink({ href, icon, label, external = false }: ActiveLinkProps) {
  const pathname = usePathname();
  const hrefPath = href.split('?')[0];
  const isActive = !external && (pathname === hrefPath || (hrefPath !== '/' && pathname?.startsWith(`${hrefPath}/`)));
  const className = `relative flex min-h-[44px] min-w-16 flex-col items-center justify-center gap-0.5 px-3 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent ${
    isActive
      ? 'text-warm-fg'
      : external
        ? 'text-[#0d6f37] hover:text-[#07572a] dark:text-[#25D366] dark:hover:text-[#5BE58B]'
        : 'text-warm-muted hover:text-warm-fg'
  }`;
  const content = (
    <>
      {isActive && (
        <span className="absolute -top-0.5 left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-full bg-warm-accent" />
      )}
      <span className="inline-flex items-center justify-center" aria-hidden="true">{icon}</span>
      <span className="text-xs font-bold">{label}</span>
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
