'use client';

import Link from 'next/link';
import { CATEGORY_GROUPS } from '../lib/types';
import { getCategoryIcon } from './icons/CategoryIcons';

const FEATURED_CATEGORY_SLUGS = [
  'cooking-essentials',
  'dairy-and-eggs',
  'snacks',
  'personal-care',
] as const;

/** Focused category edit with a clear route into the full catalog. */
export function ThemedShortcuts() {
  const featuredGroups = FEATURED_CATEGORY_SLUGS
    .map((slug) => CATEGORY_GROUPS.find((group) => group.slug === slug))
    .filter((group): group is NonNullable<typeof group> => Boolean(group));

  return (
    <section aria-labelledby="category-rail-title">
      <div className="grid gap-6 border-y border-warm-border py-7 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-end">
        <div className="max-w-lg">
          <p className="home-section-kicker">Shop by need</p>
          <h2 id="category-rail-title" className="home-section-title">Four easy places to start</h2>
          <p className="home-section-description">
            Jump into four useful grocery aisles, or browse the complete catalog.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-1">
          {featuredGroups.map((group) => (
            <Link
              key={group.slug}
              href={`/category/${group.slug}`}
              className="group flex min-h-16 items-center justify-between gap-3 border-b border-warm-border py-3 text-warm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2 focus-visible:ring-offset-warm-bg"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="text-warm-muted" aria-hidden="true">
                  {getCategoryIcon(group.slug, 24)}
                </span>
                <span className="text-sm font-extrabold leading-5 sm:text-base">{group.label}</span>
              </span>
              <span className="text-warm-muted transition-transform group-hover:translate-x-1" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
          <Link
            href="/category"
            className="home-text-link col-span-2 mt-3 inline-flex min-h-11 items-center justify-end text-sm font-extrabold"
          >
            Browse all {CATEGORY_GROUPS.length} categories →
          </Link>
        </div>
      </div>
    </section>
  );
}
