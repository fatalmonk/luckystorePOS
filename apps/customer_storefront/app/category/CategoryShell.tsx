'use client';

import { Header } from '../components/updated/Header';
import { BottomNav } from '../components/BottomNav';
import { CategoryGrid } from '../components/updated/CategoryGrid';
import { CategorySwimlanes } from '../components/CategorySwimlanes';
import type { Product, Category, CategoryGroup } from '../lib/types';

interface CategoryShellProps {
  categorySlug: string;
  currentCat: Category | 'all';
  group?: CategoryGroup;
  categories: { id: string; slug: Category; name: string; emoji: string }[];
  products: Product[];
  theme: string;
  sort: string;
}

export function CategoryShell({
  categorySlug,
  currentCat,
  group,
  categories,
  products,
  theme,
  sort,
}: CategoryShellProps) {
  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16">
        <div className="p-4 sm:p-6 space-y-8">
          <CategoryGrid
            categories={categories}
            active={currentCat === 'all' ? undefined : currentCat}
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
