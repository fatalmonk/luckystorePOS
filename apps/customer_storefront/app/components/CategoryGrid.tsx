'use client';

import { useRouter } from 'next/navigation';
import { CATEGORY_LABELS } from '../lib/types';

interface CategoryGridProps {
  categories: { id: string; slug: string; name: string; emoji: string }[];
  active?: string;
}

export function CategoryGrid({ categories, active }: CategoryGridProps) {
  const router = useRouter();

  return (
    <section className="mb-8 lg:mb-10">
      <h2 className="text-lg sm:text-xl font-bold tracking-tight mb-4">Categories</h2>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => router.push(`/category?cat=${cat.slug}`)}
            className={`flex flex-col items-center gap-2 group ${active === cat.slug ? 'opacity-100' : ''}`}
          >
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[14px] grid place-items-center text-2xl sm:text-[28px] shadow-sm transition-all duration-200 ${
              active === cat.slug
                ? 'bg-[#dc5f3b] text-white border-[#dc5f3b]'
                : 'bg-white border border-[#e7e5e4] group-hover:-translate-y-1 group-hover:shadow-md group-hover:border-[#dc5f3b]'
            }`}>
              {cat.emoji}
            </div>
            <span className="text-xs sm:text-sm font-semibold text-[#1c1917] text-center">{(CATEGORY_LABELS as Record<string, string>)[cat.slug] || cat.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
