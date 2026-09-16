'use client';

import Link from 'next/link';
import Image from 'next/image';
import React from 'react';
import type { MouseEventHandler } from 'react';
import { usePathname } from 'next/navigation';
import { getLocaleFromPathname, type Locale } from '../../lib/i18n/config';

interface LogoProps {
  className?: string;
  href?: string;
  variant?: 'default' | 'white';
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  locale?: Locale;
}

export function Logo({ className = '', href, variant = 'default', onClick, locale }: LogoProps) {
  const pathname = usePathname();
  const currentLocale = locale || getLocaleFromPathname(pathname);
  const isBn = currentLocale === 'bn';
  const isWhite = variant === 'white';

  const defaultHref = isBn ? '/bn' : '/';
  const targetHref = href !== undefined ? (isBn && href === '/' ? '/bn' : href) : defaultHref;

  const lightSrc = isBn ? '/logo-bangla.svg' : '/logo-main.png';
  const darkSrc = isBn ? '/logo-bangla-inverse.svg' : '/logo-main-inverse.png';
  const altText = isBn ? 'লাকি স্টোর ১৯৪৭' : 'Lucky Store 1947';

  const content = (
    <div className={`flex items-center select-none group ${className}`}>
      {/* Light theme logo */}
      <Image
        src={lightSrc}
        alt={altText}
        width={isBn ? 155 : 210}
        height={48}
        priority
        style={{ width: 'auto' }}
        className={`h-10 sm:h-12 w-auto object-contain transition-transform duration-300 motion-safe:group-hover:scale-105 ${
          isWhite ? 'hidden' : 'block dark:hidden'
        }`}
      />
      {/* Dark theme / inverse logo */}
      <Image
        src={darkSrc}
        alt={altText}
        width={isBn ? 155 : 210}
        height={48}
        priority
        style={{ width: 'auto' }}
        className={`h-10 sm:h-12 w-auto object-contain transition-transform duration-300 motion-safe:group-hover:scale-105 ${
          isWhite ? 'block' : 'hidden dark:block'
        }`}
      />
    </div>
  );

  if (targetHref) {
    return (
      <Link
        href={targetHref}
        onClick={onClick}
        className="flex min-h-14 flex-shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
        aria-label={altText}
      >
        {content}
      </Link>
    );
  }

  return content;
}
