import Link from 'next/link';
import { CATEGORY_LABELS } from '../lib/types';
import type { Category } from '../lib/types';
import { CategoryDropdown } from './CategoryDropdown';

interface CategoryPillProps {
  slug: string;
  label: string;
  emoji: string;
  isActive: boolean;
}

function CategoryPill({ slug, label, emoji, isActive }: CategoryPillProps) {
  const href =
    slug === 'all'
      ? '/category'
      : ['deals', 'new', 'bestsellers'].includes(slug)
      ? `/category?theme=${slug}`
      : `/category/${slug}`;
  const activeClass = 'bg-[#1c1917] text-[#FFF34D] font-bold shadow-sm';
  const inactiveClass = 'bg-[#f5f5f4] text-[#44403c] hover:bg-[#e7e5e4]';

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

interface CategoryGridProps {
  categories: { id: string; slug: string; name: string; emoji: string }[];
  active?: string;
  /** When true, renders as a compact sticky bar (used on category/browse pages) */
  sticky?: boolean;
}

const thematicPills = [
  { id: 'deals', slug: 'deals', label: 'Rollbacks & Deals', emoji: '🔥' },
  { id: 'new', slug: 'new', label: 'New Arrivals', emoji: '✨' },
  { id: 'bestsellers', slug: 'bestsellers', label: 'Best Sellers', emoji: '⭐' },
];

export function CategoryGrid({ categories, active, sticky = false }: CategoryGridProps) {
  const renderContent = () => (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide scroll-edge-mask py-2">
      <CategoryDropdown categories={categories} />

      {thematicPills.map((pill) => (
        <CategoryPill
          key={`theme-${pill.slug}`}
          slug={pill.slug}
          label={pill.label}
          emoji={pill.emoji}
          isActive={active === pill.slug}
        />
      ))}

      <CategoryPill slug="all" label="All" emoji="📦" isActive={!active || active === 'all'} />

      {categories.map((cat) => (
        <CategoryPill
          key={`cat-${cat.slug}`}
          slug={cat.slug}
          label={CATEGORY_LABELS[cat.slug as keyof typeof CATEGORY_LABELS] || cat.name}
          emoji={cat.emoji}
          isActive={active === cat.slug}
        />
      ))}
    </div>
  );

  if (sticky) {
    return (
      <div className="sticky top-[68px] z-40 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 px-4 sm:px-6 lg:px-8 xl:px-10 py-2 bg-white/95 backdrop-blur-sm border-b border-[#e7e5e4]">
        {renderContent()}
      </div>
    );
  }

  return (
    <section className="mb-6">
      <h2 className="text-lg font-bold mb-3">Categories</h2>
      {renderContent()}
    </section>
  );
}
