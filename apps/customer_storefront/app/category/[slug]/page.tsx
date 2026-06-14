import { Suspense } from 'react';
import { CategoryShell } from '../CategoryShell';
import { CategoryShellSkeleton } from '../CategoryShellSkeleton';
import { fetchProducts, fetchCategories } from '../../lib/products';
import { getCategoryGroup, CATEGORY_LABELS, CATEGORY_GROUPS } from '../../lib/types';
import type { Category } from '../../lib/types';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function generateStaticParams() {
  const categories = await fetchCategories();
  const catSlugs = categories.map((cat) => ({ slug: cat.slug }));
  const groupSlugs = CATEGORY_GROUPS.map((g) => ({ slug: g.slug }));
  return [...catSlugs, ...groupSlugs];
}

export default async function CategorySlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const categorySlug = resolvedParams.slug;
  const currentCat = ((CATEGORY_LABELS[categorySlug as Category] ? categorySlug : 'all') as Category | 'all') || 'all';
  const group = getCategoryGroup(categorySlug);

  const searchTerm = String(resolvedSearch.q || '');
  const theme = String(resolvedSearch.theme || '');
  const sort = String(resolvedSearch.sort || 'best');

  const categories = await fetchCategories();

  let products: Awaited<ReturnType<typeof fetchProducts>> = [];
  try {
    if (group) {
      const subCatIds = categories
        .filter((c) => group.subCategories.includes(c.slug))
        .map((c) => c.id);
      products = await fetchProducts(searchTerm || undefined, undefined, subCatIds.length > 0 ? subCatIds : undefined);
    } else if (currentCat !== 'all') {
      const catId = categories.find((c) => c.slug === currentCat)?.id;
      products = await fetchProducts(searchTerm || undefined, catId);
    } else {
      products = await fetchProducts(searchTerm || undefined);
    }
  } catch (err) {
    console.error('Failed to fetch category products:', err);
  }

  return (
    <Suspense fallback={<CategoryShellSkeleton />}>
      <CategoryShell
        categorySlug={categorySlug}
        currentCat={currentCat}
        group={group}
        categories={categories}
        products={products}
        searchTerm={searchTerm}
        theme={theme}
        sort={sort}
      />
    </Suspense>
  );
}
