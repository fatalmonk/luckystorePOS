'use client';

import React, { type ComponentPropsWithoutRef, type ReactNode } from 'react';
import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react';
import { JsonLd } from '../seo/JsonLd';

const SITE_URL = 'https://www.luckystore1947.com';

/* -------------------------------------------------------------------------- */
/*                     shadcn Breadcrumb Primitives                           */
/* -------------------------------------------------------------------------- */

export function Breadcrumb({ className = '', ...props }: ComponentPropsWithoutRef<'nav'>) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`py-2.5 px-4 text-xs font-semibold text-warm-muted ${className}`.trim()}
      {...props}
    />
  );
}

export function BreadcrumbList({ className = '', ...props }: ComponentPropsWithoutRef<'ol'>) {
  return (
    <ol
      className={`flex flex-wrap items-center gap-1.5 break-words ${className}`.trim()}
      {...props}
    />
  );
}

export function BreadcrumbItem({ className = '', ...props }: ComponentPropsWithoutRef<'li'>) {
  return (
    <li
      className={`inline-flex items-center gap-1.5 ${className}`.trim()}
      {...props}
    />
  );
}

export interface BreadcrumbLinkProps extends ComponentPropsWithoutRef<typeof Link> {
  asChild?: boolean;
}

export function BreadcrumbLink({ className = '', href, ...props }: BreadcrumbLinkProps) {
  return (
    <Link
      href={href}
      className={`line-clamp-1 transition-colors hover:text-warm-fg ${className}`.trim()}
      {...props}
    />
  );
}

export function BreadcrumbPage({ className = '', ...props }: ComponentPropsWithoutRef<'span'>) {
  return (
    <span
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={`line-clamp-1 font-bold text-warm-fg ${className}`.trim()}
      {...props}
    />
  );
}

export function BreadcrumbSeparator({
  children,
  className = '',
  ...props
}: ComponentPropsWithoutRef<'li'>) {
  return (
    <li
      role="presentation"
      aria-hidden="true"
      className={`select-none text-warm-muted/50 ${className}`.trim()}
      {...props}
    >
      {children ?? <CaretRight size={12} weight="bold" aria-hidden="true" />}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                    High-level Convenient Wrapper                           */
/* -------------------------------------------------------------------------- */

export interface BreadcrumbItemData {
  label: string;
  href: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItemData[];
  homeHref?: string;
  homeLabel?: string;
  className?: string;
}

export function Breadcrumbs({
  items,
  homeHref = '/',
  homeLabel = 'Home',
  className = '',
}: BreadcrumbsProps) {
  const allItems: BreadcrumbItemData[] = [{ label: homeLabel, href: homeHref }, ...items].map((item) => {
    const label = typeof item.label === 'string' ? item.label.trim() : '';
    if (label) return { ...item, label };

    const segment = item.href.split(/[?#]/, 1)[0].split('/').filter(Boolean).at(-1);
    if (!segment) return { ...item, label: homeLabel };

    let decodedSegment = segment;
    try {
      decodedSegment = decodeURIComponent(segment);
    } catch {
      // Keep readable segment on malformed encoding
    }

    const fallbackLabel = decodedSegment
      .replace(/--[a-f0-9]{8}$/i, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
    return { ...item, label: fallbackLabel || homeLabel };
  });

  const toCanonicalUrl = (href: string) => {
    if (/^https?:\/\//i.test(href)) return href;
    return `${SITE_URL}${href === '/' ? '' : href}`;
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: allItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: toCanonicalUrl(item.href),
    })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <Breadcrumb className={className}>
        <BreadcrumbList>
          {allItems.map((item, index) => {
            const isLast = index === allItems.length - 1;

            return (
              <React.Fragment key={item.href}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
}

// Backwards-compatible type alias
export type BreadcrumbItem = BreadcrumbItemData;
