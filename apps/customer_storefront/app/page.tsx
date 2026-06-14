import { Suspense } from 'react';
import { HomeShell } from './components/HomeShell';
import { HomeShellSkeleton } from './components/HomeShellSkeleton';
import { fetchProducts, fetchCategories } from './lib/products';

export default async function Home() {
  const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()]);

  return (
    <Suspense fallback={<HomeShellSkeleton />}>
      <HomeShell products={products} categories={categories} />
    </Suspense>
  );
}
