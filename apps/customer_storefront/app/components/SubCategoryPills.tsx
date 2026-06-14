'use client'; // interactive category pills with router navigation

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CATEGORY_EMOJIS, CATEGORY_LABELS } from '../lib/types';
import type { Category } from '../lib/types';

interface SubCategoryPillsProps {
  categories: { id: string; slug: Category; name: string; emoji: string; image_url?: string }[];
  active?: string;
  /** Optional sub-categories to show (for group pages). If omitted, shows all categories. */
  subCategories?: Category[];
}

export function SubCategoryPills({ categories, active, subCategories }: SubCategoryPillsProps) {
  const router = useRouter();

  // If subCategories is provided, filter to only those; otherwise show all
  const displayCats = subCategories && subCategories.length > 0
    ? categories.filter((c) => subCategories.includes(c.slug))
    : categories;

  if (displayCats.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 px-3 sm:px-4 lg:px-6 scrollbar-hide">
        {displayCats.map((cat, index) => (
          <button
            key={cat.id}
            onClick={() => router.push(`/category/${cat.slug}`)}
            className={`flex-shrink-0 snap-start flex flex-col items-center gap-1.5 w-[72px] sm:w-[80px] transition-transform active:scale-95 ${
              active === cat.slug ? 'opacity-100' : 'opacity-90 hover:opacity-100'
            }`}
          >
            <div
              className={`w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] rounded-full overflow-hidden border-2 flex items-center justify-center text-2xl sm:text-3xl bg-white ${
                active === cat.slug
                  ? 'border-[#0071DC] shadow-md'
                  : 'border-[#e7e5e4] hover:border-[#d6d3d1]'
              }`}
            >
              {cat.image_url ? (
                <Image
                  src={cat.image_url}
                  alt={cat.name}
                  width={72}
                  height={72}
                  className="object-cover w-full h-full"
                  priority={index < 6}
                />
              ) : (
                <span>{cat.emoji || CATEGORY_EMOJIS[cat.slug] || '📦'}</span>
              )}
            </div>
            <span
              className={`text-[11px] sm:text-xs font-medium text-center leading-tight ${
                active === cat.slug ? 'text-[#0071DC] font-bold' : 'text-[#44403c]'
              }`}
            >
              {CATEGORY_LABELS[cat.slug] || cat.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
