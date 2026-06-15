'use client';

import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { CategoryGrid } from '../components/CategoryGrid';
import { CategorySwimlanes } from '../components/CategorySwimlanes';
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
  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#faf8f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6">
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
          </div>
          <CategoryGrid
            categories={categories}
            active={currentCat === 'all' ? undefined : currentCat}
            sticky
          />
          <CategorySwimlanes
            categorySlug={categorySlug}
            group={group}
            products={products}
            categories={categories}
            theme={theme}
            sort={sort}
          />
        </div>
      </main>
      <BottomNav />
    </>
  );
}
