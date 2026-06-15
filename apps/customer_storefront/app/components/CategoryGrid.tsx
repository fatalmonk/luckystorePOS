import Link from 'next/link';
import { CategoryDropdown } from './CategoryDropdown';
import type { Category } from '../lib/types';

interface CategoryPillProps {
  slug: string;
  label: string;
  emoji: string;
  isActive: boolean;
  isThematic?: boolean;
}

function CategoryPill({ slug, label, emoji, isActive, isThematic }: CategoryPillProps) {
  const href =
    slug === 'all'
      ? '/category'
      : ['deals', 'new', 'bestsellers'].includes(slug)
      ? `/category?theme=${slug}`
      : `/category/${slug}`;
  const activeClass = 'bg-[#1c1917] text-[#ffe302] font-bold shadow-sm';
  const inactiveClass = isThematic
    ? 'bg-[#1c1917]/5 text-[#1c1917] hover:bg-[#1c1917]/10'
    : 'bg-[#f5f5f4] text-[#44403c] hover:bg-[#e7e5e4]';

  return (
    <Link
      href={href}
      className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 press-feedback min-h-[44px] ${
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
  /** When true, renders as a compact sticky bar (used on category/browse pages) */
  sticky?: boolean;
  /** Optional sub-categories to show. If omitted, shows all categories. */
  subCategories?: string[];
  /** Show departments dropdown + thematic pills (used on homepage/global nav). */
  showThematic?: boolean;
}

export function CategoryGrid({ categories, active, sticky = false, subCategories, showThematic = false }: CategoryGridProps) {
  const displayCats = subCategories && subCategories.length > 0
    ? categories.filter((c) => subCategories.includes(c.slug))
    : categories;

  const renderContent = () => (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide scroll-edge-mask py-2">
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
    </div>
  );

  if (sticky) {
    return (
      <div className="sticky top-[108px] z-40 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 px-4 sm:px-6 lg:px-8 xl:px-10 py-2 bg-white/95 backdrop-blur-sm border-b border-[#e7e5e4]">
        {renderContent()}
      </div>
    );
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">Categories</h2>
        <span className="text-xs font-semibold text-[#78716c]">Shop by department</span>
      </div>
      {renderContent()}
    </section>
  );
}
