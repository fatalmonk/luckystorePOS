'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CATEGORY_GROUPS, type Category } from '../lib/types';
import { getCategoryIcon } from './icons/CategoryIcons';

interface CategoryQuickGridProps {
  categories?: { id: string; slug: Category; name: string; emoji: string }[];
}

function normalizeCategoryName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/&/g, '-and-')
    .replace(/[^a-z0-9-]/g, '');
}

export function CategoryQuickGrid({ categories }: CategoryQuickGridProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleGroups = isExpanded ? CATEGORY_GROUPS : CATEGORY_GROUPS.slice(0, 8);

  const getCategoryHref = (groupSlug: string) => {
    const match = categories?.find(
      (c) =>
        c.slug === groupSlug ||
        normalizeCategoryName(c.name) === groupSlug ||
        c.name.toLowerCase().replace(/\s+/g, '-') === groupSlug,
    );
    return `/category/${match?.slug ?? groupSlug}`;
  };

  return (
    <section aria-labelledby="category-quick-title" className="px-1">
      <div className="sr-only" id="category-quick-title">
        Quick category browse
      </div>

      <div className="grid grid-cols-4 gap-3 sm:gap-4">
        {visibleGroups.map((group) => (
          <Link
            key={group.slug}
            href={getCategoryHref(group.slug)}
            className="group flex flex-col items-center gap-2 rounded-2xl p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent sm:p-3"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f2f2f2] text-warm-fg transition-transform group-active:scale-[0.96] sm:h-20 sm:w-20 dark:bg-warm-surface">
              {group.emoji ? (
                <span className="text-3xl sm:text-4xl" aria-hidden="true">
                  {group.emoji}
                </span>
              ) : (
                <span className="text-warm-muted">{getCategoryIcon(group.slug, 28)}</span>
              )}
            </div>
            <span className="line-clamp-1 text-center text-xs font-semibold text-warm-fg sm:text-sm">
              {group.label}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex justify-center sm:mt-5">
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold text-warm-fg transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
        >
          <svg
            aria-hidden="true"
            className={`h-4 w-4 text-warm-muted transition-transform duration-300 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
          {isExpanded ? 'Show less categories' : 'View all categories'}
        </button>
      </div>
    </section>
  );
}
