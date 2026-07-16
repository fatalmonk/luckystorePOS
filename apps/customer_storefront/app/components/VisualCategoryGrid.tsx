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
    <section aria-labelledby="cat-grid-heading">
      <div className="flex items-center justify-between mb-4">
        <h2 id="cat-grid-heading" className="text-lg font-extrabold tracking-tight text-[#0B0B0D]">
          Browse Categories
        </h2>
        <Link href="/category" className="text-xs font-bold text-warm-muted hover:text-warm-fg transition-colors">
          See all
        </Link>
      </div>

      <div className="grid grid-cols-5 gap-y-6 gap-x-4">
        {visuals.map((cat) => (
          <Link
            key={cat.slug}
            href={`/category/${cat.slug}`}
            className="group flex flex-col items-center justify-center text-center active:scale-[0.97] transition-transform duration-200"
          >
            <div className="relative w-20 h-20 flex items-center justify-center mb-2">
              <Image
                src={cat.image}
                alt={cat.label}
                fill
                sizes="80px"
                className="object-contain group-hover:scale-110 transition-transform duration-200"
              />
            </div>
            <span className="text-[10px] font-bold text-[#0B0B0D] leading-tight line-clamp-1 w-full">
              {cat.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}