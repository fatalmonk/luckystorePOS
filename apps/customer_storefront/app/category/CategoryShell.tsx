'use client';

import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { HeroBanner } from '../components/HeroBanner';
import { CategoryGrid } from '../components/CategoryGrid';
import { FilterSidebar } from '../components/FilterSidebar';
import { SponsoredBanner } from '../components/SponsoredBanner';
import { CategoryFooter } from '../components/CategoryFooter';
import { CategorySwimlanes } from '../components/CategorySwimlanes';
import { useState } from 'react';
import type { Product, Category, CategoryGroup } from '../lib/types';

interface CategoryShellProps {
  categorySlug: string;
  currentCat: Category | 'all';
  group?: CategoryGroup;
  categories: { id: string; slug: Category; name: string; emoji: string }[];
  products: Product[];
  searchTerm: string;
  theme: string;
  sort: string;
}

export function CategoryShell({
  categorySlug,
  currentCat,
  group,
  categories,
  products,
  searchTerm,
  theme,
  sort,
}: CategoryShellProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const activeFilters: Record<string, string | undefined> = {
    theme,
    sort,
    q: searchTerm,
  };

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6">
          <div className="flex gap-6 lg:gap-8">
            <FilterSidebar
              categories={categories}
              activeFilters={activeFilters}
              onFilterChange={() => {}}
              mobileOpen={filterOpen}
              onMobileClose={() => setFilterOpen(false)}
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <h1 className="text-xl font-extrabold tracking-tight">
                  {searchTerm
                    ? `Search: "${searchTerm}"`
                    : theme === 'deals'
                    ? 'Rollbacks & Deals'
                    : theme === 'new'
                    ? 'New Arrivals'
                    : theme === 'bestsellers'
                    ? 'Best Sellers'
                    : group
                    ? group.label
                    : currentCat === 'all'
                    ? 'All Products'
                    : currentCat}
                </h1>
                <button
                  type="button"
                  onClick={() => setFilterOpen(true)}
                  className="lg:hidden self-start flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#e7e5e4] text-sm font-bold min-h-[44px] shadow-sm"
                >
                  <span>⚙️</span> Filters
                </button>
              </div>
              <CategorySwimlanes
                categorySlug={categorySlug}
                group={group}
                products={products}
                categories={categories}
                theme={theme}
                sort={sort}
              />
            </div>
          </div>

          <CategoryFooter
            categorySlug={categorySlug}
            categoryName={
              searchTerm
                ? `Search: "${searchTerm}"`
                : theme === 'deals'
                ? 'Rollbacks & Deals'
                : theme === 'new'
                ? 'New Arrivals'
                : theme === 'bestsellers'
                ? 'Best Sellers'
                : group
                ? group.label
                : currentCat === 'all'
                ? 'All Products'
                : currentCat
            }
          />
        </div>
      </main>
      <BottomNav />
    </>
  );
}
