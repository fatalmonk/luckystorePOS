import React from 'react';
import Link from 'next/link';
import type { Category } from '../lib/types';
import { getCanonicalCategorySlug } from '../lib/types';
import { getCategoryIcon } from './icons/CategoryIcons';

import { withLocale, type Locale } from '../lib/i18n/config';
import { getDictionary } from '../lib/i18n/dictionaries';

interface CategoryQuickGridProps {
  categories?: { id: string; slug: Category; name: string; emoji: string }[];
  locale?: Locale;
}

function normalizeCategoryName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/&/g, '-and-')
    .replace(/[^a-z0-9-]/g, '');
}

export function CategoryQuickGrid({ categories, locale = 'en' }: CategoryQuickGridProps) {

  const dict = getDictionary(locale);
  const collections = [
    {
      label: dict.categoryGrid.dailyCooking,
      slug: 'cooking-essentials',
      fallbackSlugs: ['rice-and-grain', 'spices', 'oil-and-ghee'],
      iconSlug: 'cooking-essentials',
      desktopOnly: false,
    },
    {
      label: dict.categoryGrid.breakfast,
      slug: 'breakfast',
      fallbackSlugs: ['dairy-and-eggs', 'tea-&-coffee', 'biscuits-and-cookies'],
      iconSlug: 'breakfast',
      desktopOnly: false,
    },
    {
      label: dict.categoryGrid.snacksDrinks,
      slug: 'snacks',
      fallbackSlugs: ['cold-beverages', 'ice-cream', 'biscuits-and-cookies'],
      iconSlug: 'snacks',
      desktopOnly: false,
    },
    {
      label: dict.categoryGrid.homeEssentials,
      slug: 'household',
      fallbackSlugs: ['home-care', 'cleaning-supplies'],
      iconSlug: 'household',
      desktopOnly: false,
    },
    {
      label: dict.categoryGrid.personalCare,
      slug: 'personal-care',
      fallbackSlugs: ['baby-care'],
      iconSlug: 'personal-care',
      desktopOnly: true,
    },
  ] as const;

  const getCategoryTarget = (
    groupSlug: string,
    fallbackSlugs: readonly string[] = [],
    fallbackLabel: string,
  ) => {
    const slugs = [groupSlug, ...fallbackSlugs];
    const match = categories?.find(
      (c) =>
        slugs.some((slug) =>
          c.slug === slug ||
          normalizeCategoryName(c.name) === slug ||
          c.name.toLowerCase().replace(/\s+/g, '-') === slug
        ),
    );
    const rawSlug = match?.slug ?? groupSlug;
    const targetSlug = getCanonicalCategorySlug(rawSlug) || rawSlug;
    return {
      href: withLocale(`/category/${targetSlug}`, locale),
      accessibleLabel: locale === 'bn' ? fallbackLabel : (match?.name ?? fallbackLabel),
    };
  };

  return (
    <section aria-labelledby="category-quick-title" className="px-1 pt-1">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="home-section-kicker">
            {locale === 'bn' ? 'বাছাইকৃত ক্যাটাগরি' : 'Curated discovery'}
          </p>
          <h2 id="category-quick-title" className="text-balance text-lg font-black leading-tight tracking-tight text-warm-fg sm:text-xl">
            {locale === 'bn' ? 'দৈনন্দিন রুটিন অনুযায়ী বাজার' : 'Shop by routine'}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 sm:gap-4 lg:grid-cols-5">
        {collections.map((collection) => {
          const target = getCategoryTarget(
            collection.slug,
            collection.fallbackSlugs,
            collection.label,
          );

          return (
            <Link
              key={collection.slug}
              href={target.href}
              className={`group flex flex-col items-center gap-2 rounded-warm-lg p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent sm:p-3 ${
                collection.desktopOnly ? 'hidden lg:flex' : ''
              }`}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-warm-lg border border-warm-image-well-border bg-warm-image-well text-warm-fg transition-transform motion-safe:group-active:scale-[0.96] sm:h-20 sm:w-20">
                <span className="text-warm-fg" aria-hidden="true">{getCategoryIcon(collection.iconSlug, 30)}</span>
              </div>
              <span className="line-clamp-1 text-center text-xs font-semibold text-warm-fg sm:text-sm">
                {target.accessibleLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
