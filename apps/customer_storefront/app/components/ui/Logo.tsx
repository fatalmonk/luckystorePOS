'use client';

import Link from 'next/link';
import React from 'react';
import type { MouseEventHandler } from 'react';
import { usePathname } from 'next/navigation';
import { cloudflareImageSources } from '../../lib/image-loader';
import { getLocaleFromPathname, type Locale } from '../../lib/i18n/config';

const LOGO_WIDTHS = [210, 420] as const;
const LOGO_SIZES = '(max-width: 639px) 175px, 210px';

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
      <LogoImage
        src={lightSrc}
        alt={altText}
        width={isBn ? 155 : 210}
        height={48}
        loading="eager"
        className={`max-h-10 sm:max-h-12 w-auto object-contain transition-transform duration-300 motion-safe:group-hover:scale-105 ${
          isWhite ? 'hidden' : 'block dark:hidden'
        }`}
      />
      <LogoImage
        src={darkSrc}
        alt=""
        width={isBn ? 155 : 211}
        height={48}
        loading="lazy"
        className={`max-h-10 sm:max-h-12 w-auto object-contain transition-transform duration-300 motion-safe:group-hover:scale-105 ${
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

function LogoImage({
  src,
  alt,
  width,
  height,
  loading,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  loading: 'eager' | 'lazy';
  className: string;
}) {
  const image = cloudflareImageSources(src, LOGO_WIDTHS, 75);
  return (
    // The PNG artwork is unchanged. next/image is globally unoptimized and would
    // fetch the original file instead of a Cloudflare variant.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={image.srcSet ? LOGO_SIZES : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      fetchPriority="low"
      decoding="async"
      style={{ width: 'auto', height: 'auto' }}
      className={className}
    />
  );
}
