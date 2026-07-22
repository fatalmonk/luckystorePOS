'use client';

import Link from 'next/link';
import { CATEGORY_GROUPS, getParentGroup } from '../lib/types';
import type { Product } from '../lib/types';

interface ThemedShortcutsProps {
  products?: Product[];
}

/** Horizontal Category Rail — driven by CATEGORY_GROUPS with derived product counts */
export function ThemedShortcuts({ products = [] }: ThemedShortcutsProps) {
  const getGroupProductCount = (groupSlug: string, subCategories: string[]) => {
    if (!products || products.length === 0) return 0;
    return products.filter((p) => {
      if (subCategories.includes(p.category)) return true;
      const parent = getParentGroup(p.category);
      return parent?.slug === groupSlug;
    }).length;
  };

  return (
    <section aria-label="Category Rail">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-extrabold tracking-tight text-warm-fg">Explore Categories</h2>
        <Link
          href="/category"
          className="text-xs font-bold text-warm-muted hover:text-warm-fg transition-colors"
        >
          View All ({CATEGORY_GROUPS.length}) →
        </Link>
      </div>
      <div className="relative">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-edge-mask py-1.5 px-0.5">
          {CATEGORY_GROUPS.map((group) => {
            const count = getGroupProductCount(group.slug, group.subCategories);
            return (
              <Link
                key={group.slug}
                href={`/category/${group.slug}`}
                className="group flex-shrink-0 flex flex-col items-center w-[84px] sm:w-[92px]"
              >
                <div className="w-[84px] h-[84px] sm:w-[92px] sm:h-[92px] rounded-[20px] border border-warm-border/60 bg-warm-surface group-hover:bg-warm-fg group-hover:border-warm-fg group-hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-warm-sm group-hover:shadow-warm-md flex flex-col items-center justify-center p-2 mb-1.5 text-center">
                  <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform duration-200" aria-hidden="true">
                    {group.emoji}
                  </span>
                  {count > 0 && (
                    <span className="mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-warm-accent/20 text-warm-fg group-hover:bg-warm-accent group-hover:text-warm-fg transition-colors">
                      {count} items
                    </span>
                  )}
                </div>
                <span className="text-[11px] leading-tight text-center font-bold text-warm-fg group-hover:text-warm-muted transition-colors line-clamp-2">
                  {group.label}
                </span>
              </Link>
            );
          })}
        </div>
        {/* Right-edge scroll hint for tablet/desktop */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-warm-bg via-warm-bg/80 to-transparent hidden md:flex items-center justify-end pr-1">
          <span className="text-warm-muted/70 text-lg animate-pulse">→</span>
        </div>
      </div>
    </section>
  );
}
