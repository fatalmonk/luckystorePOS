'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORY_LABELS } from '../lib/types';

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

const activeClass = 'bg-[#1c1917] text-[#FFF34D] font-bold shadow-sm';
const inactiveClass = 'bg-[#f5f5f4] text-[#44403c] hover:bg-[#e7e5e4]';

export function CategoryGrid({ categories, active, sticky = false }: CategoryGridProps) {
  const router = useRouter();
  const [departmentsOpen, setDepartmentsOpen] = useState(false);
  const departmentsRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (departmentsRef.current && !departmentsRef.current.contains(e.target as Node)) {
        setDepartmentsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderPill = (slug: string, label: string, emoji: string, isActive: boolean) => (
    <button
      onClick={() => {
        if (slug === 'all') {
          router.push('/category');
        } else if (slug === 'deals' || slug === 'new' || slug === 'bestsellers') {
          router.push(`/category?theme=${slug}`);
        } else {
          router.push(`/category/${slug}`);
        }
      }}
      className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 press-feedback ${
        isActive ? activeClass : inactiveClass
      }`}
    >
      <span className="text-base leading-none flex items-center justify-center">{emoji}</span>
      <span>{label}</span>
    </button>
  );

  const renderContent = () => (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide scroll-edge-mask py-2">
      {/* Departments Dropdown */}
      <div className="relative flex-shrink-0" ref={departmentsRef}>
        <button
          onClick={() => setDepartmentsOpen(!departmentsOpen)}
          className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 press-feedback ${
            departmentsOpen ? activeClass : inactiveClass
          }`}
        >
          <span className="text-base leading-none">📂</span>
          <span>Departments</span>
          <span className="text-xs">▼</span>
        </button>

        {departmentsOpen && (
          <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#e7e5e4] py-2 z-50 animate-fade-up">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
<<<<<<< HEAD
                  router.push(`/category?cat=${cat.slug}`);
=======
                  router.push(`/category/${cat.slug}`);
>>>>>>> feat/delivery-orders-realtime
                  setDepartmentsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-[#44403c] hover:bg-[#f5f5f4] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span>{cat.emoji}</span>
                  <span>{CATEGORY_LABELS[cat.slug as keyof typeof CATEGORY_LABELS] || cat.name}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Thematic Pills */}
      {thematicPills.map((pill) => (
        <React.Fragment key={`theme-${pill.slug}`}>
          {renderPill(
            pill.slug,
            pill.label,
            pill.emoji,
            active === pill.slug
          )}
        </React.Fragment>
      ))}

      {/* All Category Pill */}
      <React.Fragment key="pill-all">
        {renderPill('all', 'All', '📦', !active || active === 'all')}
      </React.Fragment>

      {/* Category Pills */}
      {categories.map((cat) => (
        <React.Fragment key={`cat-${cat.slug}`}>
          {renderPill(
            cat.slug,
            CATEGORY_LABELS[cat.slug as keyof typeof CATEGORY_LABELS] || cat.name,
            cat.emoji,
            active === cat.slug
          )}
        </React.Fragment>
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