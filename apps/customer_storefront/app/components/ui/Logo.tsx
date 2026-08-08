import Link from 'next/link';
import Image from 'next/image';
import React from 'react';
import type { MouseEventHandler } from 'react';

interface LogoProps {
  className?: string;
  href?: string;
  variant?: 'default' | 'white';
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export function Logo({ className = '', href = '/', variant = 'default', onClick }: LogoProps) {
  const isWhite = variant === 'white';

  const content = (
    <div className={`flex items-center select-none group ${className}`}>
      {/* Light theme logo */}
      <Image
        src="/logo-main.png"
        alt="Lucky Store 1947"
        width={210}
        height={48}
        priority
        className={`h-10 sm:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105 ${
          isWhite ? 'hidden' : 'block dark:hidden'
        }`}
      />
      {/* Dark theme / inverse logo */}
      <Image
        src="/logo-main-inverse.png"
        alt="Lucky Store 1947"
        width={210}
        height={48}
        priority
        className={`h-10 sm:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105 ${
          isWhite ? 'block' : 'hidden dark:block'
        }`}
      />
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className="flex min-h-14 flex-shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
        aria-label="Lucky Store 1947"
      >
        {content}
      </Link>
    );
  }

  return content;
}
