import { Suspense } from 'react';
import { CategoryContent } from '../CategoryContent';
import { fetchCategories } from '../../lib/products';
import { CATEGORY_GROUPS } from '../../lib/types';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const categories = await fetchCategories();
    const catSlugs = categories.map((cat) => ({ slug: cat.slug }));
    const groupSlugs = CATEGORY_GROUPS.map((g) => ({ slug: g.slug }));
    return [...catSlugs, ...groupSlugs];
  } catch (error) {
    console.error('Failed to fetch categories for static generation:', error);
    return CATEGORY_GROUPS.map((g) => ({ slug: g.slug }));
  }
}

export default async function CategorySlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  
  return (
    <Suspense fallback={<div className="p-[18px]">Loading...</div>}>
      <CategoryContent categorySlug={resolvedParams.slug} />
    </Suspense>
  );
}
