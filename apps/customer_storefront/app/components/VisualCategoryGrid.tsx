'use client';

import Link from 'next/link';
import { CategoryIcon } from './icons/CategoryIcons';
import type { Category } from '../lib/types';

const TOP_CATEGORY_SLUGS = [
  'eggs',
  'tea-&-coffee',
  'biscuits-&-cookies',
  'cooking-needs',
  'dairy-&-eggs',
  'snacks',
  'rice-&-grain',
  'beverages',
  'personal-care',
  'cleaning-supply',
  'biscuits',
  'spices',
];

const FALLBACK_EMOJIS: Record<string, string> = {
  eggs: '🥚',
  'tea-&-coffee': '☕',
  'biscuits-&-cookies': '🍪',
  'cooking-needs': '🍳',
  'dairy-&-eggs': '🥛',
  snacks: '🍿',
  'rice-&-grain': '🍚',
  beverages: '🥤',
  'personal-care': '🧴',
  'cleaning-supply': '🧹',
  biscuits: '🍪',
  spices: '🌶️',
};

interface CategoryVisual {
  slug: string;
  label: string;
  emoji: string;
  gradient: string;
}

interface VisualCategoryGridProps {
  categories: { id: string; slug: Category; name: string; emoji: string }[];
}

export function VisualCategoryGrid({ categories }: VisualCategoryGridProps) {
  // Map real categories into our visual slots
  const visuals: CategoryVisual[] = TOP_CATEGORY_SLUGS.map((targetSlug) => {
    const match = categories.find((c) => c.slug === targetSlug);
    if (match) {
      return {
        slug: match.slug,
        label: match.name,
        emoji: match.emoji,
        gradient: '',
      };
    }
    // If not in our DB, skip (only show real categories)
    return null;
  }).filter(Boolean) as CategoryVisual[];

  const gradients = [
    'from-amber-100 to-orange-50',
    'from-stone-100 to-stone-50',
    'from-emerald-100 to-green-50',
    'from-sky-100 to-blue-50',
    'from-rose-100 to-pink-50',
    'from-violet-100 to-purple-50',
    'from-teal-100 to-cyan-50',
    'from-lime-100 to-yellow-50',
  ];

  if (visuals.length === 0) return null;

  return (
    <section aria-labelledby="cat-grid-heading">
      <div className="flex items-center justify-between mb-3">
        <h2 id="cat-grid-heading" className="text-lg font-extrabold tracking-tight text-charcoal">
          Browse Categories
        </h2>
        <Link
          href="/category"
          className="text-xs font-bold text-warm-muted hover:text-warm-fg transition-colors"
        >
          See all
        </Link>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {visuals.slice(0, 10).map((cat, i) => {
          const gradient = gradients[i % gradients.length];
          return (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className={`group flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 bg-gradient-to-br ${gradient} border border-white/60 hover:shadow-md active:scale-[0.97] transition-all duration-200 min-h-[88px]`}
            >
              <div className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200">
                <CategoryIcon slug={cat.slug} emoji={cat.emoji} size={22} />
              </div>
              <span className="text-[10px] font-semibold text-center text-stone-700 leading-tight line-clamp-2">
                {cat.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
