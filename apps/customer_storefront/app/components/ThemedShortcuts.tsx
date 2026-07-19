'use client';

import Link from 'next/link';
import { CATEGORY_GROUPS } from '../lib/types';

/** Quick Picks — driven by CATEGORY_GROUPS so it stays in sync with actual categories. */
export function ThemedShortcuts() {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-extrabold tracking-tight text-warm-fg">Quick Picks</h2>
      </div>
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide scroll-edge-mask py-1">
        {CATEGORY_GROUPS.map((group) => (
          <Link
            key={group.slug}
            href={`/category/${group.slug}`}
            className="group flex-shrink-0 flex flex-col items-center justify-center w-[96px] h-[84px] rounded-[16px] border border-warm-border/50 bg-warm-surface hover:bg-warm-fg hover:border-warm-fg hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-warm-sm hover:shadow-warm-md"
          >
            <span className="text-2xl mb-1 group-hover:scale-110 transition-transform duration-200" aria-hidden="true">
              {group.emoji}
            </span>
            <span className="text-[10px] leading-tight text-center px-1 font-semibold text-warm-muted group-hover:text-warm-accent transition-colors duration-200">
              {group.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
