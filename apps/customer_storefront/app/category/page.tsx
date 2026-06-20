import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { CategoryShell } from './CategoryShell';
import { fetchProducts, fetchCategories } from '../lib/products';
import { getSingleParam } from '../lib/utils';
import type { Category } from '../lib/types';

export const metadata: Metadata = {
  title: 'Browse Products',
  description: 'Browse all products at Lucky Store — fresh groceries, household items, and more. Search by category, price, and availability. Same-day delivery in Chittagong.',
  alternates: {
    canonical: '/category',
  },
};

export const revalidate = 3600;

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

  const searchTerm = getSingleParam(resolvedParams.q);
  const theme = getSingleParam(resolvedParams.theme);
  const sort = getSingleParam(resolvedParams.sort) || 'best';
  const categories = await fetchCategories();
  const products = await fetchProducts(searchTerm || undefined);

  return (
    <CategoryShell
      categorySlug="all"
      currentCat="all"
      categories={categories}
      products={products}
      searchTerm={searchTerm}
      theme={theme}
      sort={sort}
    />
  );
}
