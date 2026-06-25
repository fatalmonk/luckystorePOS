'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { CategoryDropdown } from './CategoryDropdown';
import type { Category } from '../lib/types';
import { CATEGORY_GROUPS } from '../lib/types';

interface CategoryPillProps {
  slug: string;
  label: string;
  emoji: string;
  isActive: boolean;
  isThematic?: boolean;
}

function CategoryPill({ slug, label, emoji, isActive, isThematic }: CategoryPillProps) {
  const isGroupSlug = CATEGORY_GROUPS.some((g) => g.slug === slug);
  const isLegacyThematic = ['deals', 'new', 'bestsellers'].includes(slug);
  const isThematicSlug = isGroupSlug || isLegacyThematic;

  const href =
    slug === 'all'
      ? '/category'
      : isThematicSlug
      ? `/category?theme=${slug}`
      : `/category/${slug}`;
  const activeClass = 'bg-warm-fg text-warm-accent font-bold shadow-sm';
  const inactiveClass = isThematic
    ? 'bg-warm-fg/5 text-warm-fg hover:bg-warm-fg/10'
    : 'bg-warm-border-light text-[#44403c] hover:bg-warm-border-light';

  return (
    <Link
      href={href}
      className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 press-feedback min-h-[44px] snap-start ${
        isActive ? activeClass : inactiveClass
      }`}
    >
      <span className="text-base leading-none flex items-center justify-center" aria-hidden="true">{emoji}</span>
      <span>{label}</span>
    </Link>
  );
}

const thematicPills = [
  { slug: 'deals', label: 'Deals', emoji: '🔥' },
  { slug: 'new', label: 'New', emoji: '✨' },
  { slug: 'bestsellers', label: 'Best Sellers', emoji: '⭐' },
];

interface CategoryGridProps {
  categories: { id: string; slug: string; name: string; emoji: string }[];
  active?: string;
  sticky?: boolean;
  subCategories?: string[];
  showThematic?: boolean;
}

export function CategoryGrid({ categories, active, sticky = false, subCategories, showThematic = false }: CategoryGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    };
    check();
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      el.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [categories.length, showThematic, subCategories?.length]);

  const displayCats = subCategories && subCategories.length > 0
    ? categories.filter((c) => subCategories.includes(c.slug))
    : categories;

  const handleScroll = () => {
    if (!hasInteracted) setHasInteracted(true);
  };

  const renderContent = () => (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex gap-2 overflow-x-auto scrollbar-hide scroll-edge-mask snap-x snap-mandatory py-2 relative"
    >
      {showThematic && (
        <>
          <CategoryDropdown categories={categories} />
          {thematicPills.map((pill) => (
            <CategoryPill
              key={`theme-${pill.slug}`}
              slug={pill.slug}
              label={pill.label}
              emoji={pill.emoji}
              isActive={active === pill.slug}
              isThematic
            />
          ))}
        </>
      )}
      {!subCategories && (
        <CategoryPill slug="all" label="All" emoji="📦" isActive={!active || active === 'all'} />
      )}

      {displayCats.map((cat) => (
        <CategoryPill
          key={`cat-${cat.slug}`}
          slug={cat.slug}
          label={cat.name}
          emoji={cat.emoji}
          isActive={active === cat.slug}
        />
      ))}

      {/* Overflow indicator */}
      {canScrollRight && !hasInteracted && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-12 bg-gradient-to-l from-white via-white/90 to-transparent pointer-events-none flex items-center justify-end pr-2 z-10">
          <span className="text-lg text-warm-muted animate-pulse">→</span>
        </div>
      )}
    </div>
  );

  if (sticky) {
    return (
      <div className="sticky top-[108px] z-40 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 px-4 sm:px-6 lg:px-8 xl:px-10 py-2 bg-white/95 backdrop-blur-sm border-b border-warm-border">
        {renderContent()}
      </div>
    );
  }

  return (
    <section className="mb-6">
      <div className="mb-3">
        <h2 className="text-lg font-bold">Categories</h2>
      </div>
      {renderContent()}
    </section>
  );
}
