import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { CategoryShell } from './CategoryShell';
import { CategoryShellSkeleton } from './CategoryShellSkeleton';
import { fetchProducts, fetchCategories } from '../lib/products';
import type { Category } from '../lib/types';

export default async function CategoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const resolvedParams = await searchParams;

  const catParam = resolvedParams.cat;
  if (catParam) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(resolvedParams)) {
      if (key !== 'cat' && typeof value === 'string') params.set(key, value);
    }
    const queryString = params.toString();
    redirect(queryString ? `/category/${catParam}?${queryString}` : `/category/${catParam}`);
  }

  const searchTerm = String(resolvedParams.q || '');
  const theme = String(resolvedParams.theme || '');
  const sort = String(resolvedParams.sort || 'best');
  const categories = await fetchCategories();
  const products = await fetchProducts(searchTerm || undefined);

  return (
    <Suspense fallback={<CategoryShellSkeleton />}>
      <CategoryShell
        categorySlug="all"
        currentCat="all"
        categories={categories}
        products={products}
        searchTerm={searchTerm}
        theme={theme}
        sort={sort}
      />
    </Suspense>
  );
}
