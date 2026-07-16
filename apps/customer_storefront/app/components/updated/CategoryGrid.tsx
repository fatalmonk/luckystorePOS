

import Link from 'next/link';
import { CategoryIcon } from '../icons/CategoryIcons';

interface CategoryChipProps {
  slug: string;
  label: string;
  emoji: string;
  isActive?: boolean;
}

function CategoryChip({ slug, label, emoji, isActive }: CategoryChipProps) {
  const href = slug === 'all' ? '/category' : `/category/${slug}`;

  return (
    <Link
      href={href}
      className={`group flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-2xl text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-warm-fg text-warm-accent'
          : 'bg-warm-border-light text-[#44403c] hover:bg-warm-border-light'
      }`}
    >
      <CategoryIcon slug={slug} emoji={emoji} size={24} className="mb-1" />
      <span className="text-[10px] leading-tight text-center px-1 truncate w-full">{label}</span>
    </Link>
  );
}

interface CategoryGridProps {
  categories: { id: string; slug: string; name: string; emoji: string }[];
  active?: string;
}

export function CategoryGrid({ categories, active }: CategoryGridProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">Browse Categories</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide scroll-edge-mask py-1">
        <CategoryChip slug="all" label="All" emoji="" isActive={!active || active === 'all'} />
        {categories.map((cat) => (
          <CategoryChip
            key={`cat-${cat.slug}`}
            slug={cat.slug}
            label={cat.name}
            emoji={cat.emoji}
            isActive={active === cat.slug}
          />
        ))}
      </div>
    </section>
  );
}
