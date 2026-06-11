
import { Suspense } from 'react';
import { CategoryContent } from './CategoryContent';

import { redirect } from 'next/navigation';

export default async function CategoryPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const resolvedParams = await searchParams;
  if (resolvedParams.cat) {
    const params = new URLSearchParams(resolvedParams as any);
    params.delete('cat');
    const queryString = params.toString();
    redirect(queryString ? `/category/${resolvedParams.cat}?${queryString}` : `/category/${resolvedParams.cat}`);
  }

  return (
    <Suspense fallback={<div className="p-[18px]">Loading...</div>}>
      <CategoryContent categorySlug="all" />
    </Suspense>
  );
}