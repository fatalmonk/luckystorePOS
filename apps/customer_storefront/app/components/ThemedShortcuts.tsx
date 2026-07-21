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
      <div className="relative">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-edge-mask py-1.5 px-0.5">
          {CATEGORY_GROUPS.map((group) => (
            <Link
              key={group.slug}
              href={`/category/${group.slug}`}
              className="group flex-shrink-0 flex flex-col items-center justify-center w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] rounded-[18px] border border-warm-border/50 bg-warm-surface hover:bg-warm-fg hover:border-warm-fg hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-warm-sm hover:shadow-warm-md"
            >
              <span className="text-3xl mb-1 group-hover:scale-110 transition-transform duration-200" aria-hidden="true">
                {group.emoji}
              </span>
            </Link>
          ))}
        </div>
        {/* Right-edge scroll hint for tablet/desktop */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-warm-bg via-warm-bg/80 to-transparent hidden md:flex items-center justify-end pr-1">
          <span className="text-warm-muted/70 text-lg animate-pulse">→</span>
        </div>
      </div>
      <div className="flex gap-3 px-0.5 -mt-1">
        {CATEGORY_GROUPS.map((group) => (
          <span
            key={`${group.slug}-label`}
            className="w-[72px] sm:w-[80px] flex-shrink-0 text-[11px] leading-tight text-center font-semibold text-warm-muted"
          >
            {group.label}
          </span>
        ))}
      </div>
    </section>
  );
}
