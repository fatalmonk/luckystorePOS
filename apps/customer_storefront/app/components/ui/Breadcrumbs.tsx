'use client';

import Link from 'next/link';
import { JsonLd } from '../seo/JsonLd';

export interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const allItems: BreadcrumbItem[] = [{ label: 'Home', href: '/' }, ...items];

  // Schema.org BreadcrumbList structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: allItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: `https://luckystore1947.com${item.href}`,
    })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <nav aria-label="Breadcrumb" className="py-2.5 px-4 text-xs font-semibold text-warm-muted">
        <ol className="flex items-center gap-1.5 flex-wrap">
          {allItems.map((item, index) => {
            const isLast = index === allItems.length - 1;

            return (
              <li key={item.href} className="flex items-center gap-1.5">
                {index > 0 && <span className="text-warm-muted/50 select-none">/</span>}
                {isLast ? (
                  <span className="text-warm-fg font-bold line-clamp-1" aria-current="page">
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="hover:text-warm-fg transition-colors line-clamp-1"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
