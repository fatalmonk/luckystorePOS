'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Category } from '../lib/types';

const TOP_CATEGORIES: { slug: string; image: string }[] = [
  { slug: 'tea-&-coffee', image: 'https://images.luckystore1947.com/categories/tea-coffee.webp' },
  { slug: 'biscuits-&-cookies', image: 'https://images.luckystore1947.com/categories/biscuits-cookies.webp' },
  { slug: 'cooking-needs', image: 'https://images.luckystore1947.com/categories/cooking-needs.webp' },
  { slug: 'dairy-&-eggs', image: 'https://images.luckystore1947.com/categories/dairy-eggs.webp' },
  { slug: 'snacks', image: 'https://images.luckystore1947.com/categories/snacks.webp' },
  { slug: 'rice-&-grain', image: 'https://images.luckystore1947.com/categories/rice-grain.webp' },
  { slug: 'beverages', image: 'https://images.luckystore1947.com/categories/beverages.webp' },
  { slug: 'personal-care', image: 'https://images.luckystore1947.com/categories/personal-care.webp' },
  { slug: 'cleaning-supply', image: 'https://images.luckystore1947.com/categories/cleaning-supply.webp' },
  { slug: 'spices', image: 'https://images.luckystore1947.com/categories/spices.webp' },
];

interface VisualCategoryGridProps {
  categories: { id: string; slug: Category; name: string; emoji: string }[];
}

export function VisualCategoryGrid({ categories }: VisualCategoryGridProps) {
  const byId = new Map(categories.map((c) => [c.slug, c]));
  const visuals = TOP_CATEGORIES
    .map((t) => {
      const match = byId.get(t.slug as Category);
      return match ? { ...t, label: match.name } : null;
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  if (visuals.length === 0) return null;

  return (
    <section aria-labelledby="cat-grid-heading" className="bg-warm-surface rounded-2xl p-4 sm:p-5 border border-warm-border/60 shadow-warm-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 id="cat-grid-heading" className="text-lg font-extrabold tracking-tight text-warm-fg">
          Browse Categories
        </h2>
        <Link href="/category" className="text-xs font-bold text-warm-muted hover:text-warm-fg transition-colors">
          See all →
        </Link>
      </div>

      <div className="grid grid-cols-5 gap-y-5 gap-x-3">
        {visuals.map((cat) => (
          <Link
            key={cat.slug}
            href={`/category/${cat.slug}`}
            className="group flex flex-col items-center justify-center text-center active:scale-[0.97] transition-transform duration-200"
          >
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-2">
              <Image
                src={cat.image}
                alt={cat.label}
                fill
                sizes="(max-width: 640px) 64px, 80px"
                className="object-contain group-hover:scale-110 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              />
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold text-warm-fg leading-tight line-clamp-1 w-full">
              {cat.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}