import { CategoryShell } from '../CategoryShell';
import { fetchProducts, fetchCategories } from '../../lib/products';
import { getSingleParam } from '../../lib/utils';
import { getCategoryGroup, CATEGORY_GROUPS } from '../../lib/types';
import type { Category, Product } from '../../lib/types';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Category',
  description: 'Browse products by category at Lucky Store — fresh groceries, household items, and more. Same-day delivery in Chittagong.',
};

export default async function CategorySlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const categories = await fetchCategories();
  const categorySlug = decodeURIComponent(resolvedParams.slug);
  
  let group = getCategoryGroup(categorySlug);
  const currentCatObj = categories.find((c) => c.slug === categorySlug);

  // Dynamically treat root categories with child categories as groups
  if (!group && currentCatObj) {
    const childCats = categories.filter((c) => c.parent_id === currentCatObj.id);
    if (childCats.length > 0) {
      group = {
        slug: currentCatObj.slug,
        label: currentCatObj.name,
        emoji: currentCatObj.emoji,
        subCategories: childCats.map((c) => c.slug),
      };
    }
  }

  const isValidCat = !!currentCatObj;
  const currentCat = isValidCat || group ? categorySlug : 'all';

  const searchTerm = getSingleParam(resolvedSearch.q);
  const theme = getSingleParam(resolvedSearch.theme);
  const sort = getSingleParam(resolvedSearch.sort) || 'best';

  let products: Product[] = [];
  try {
    if (group) {
      const subCatIds = categories
        .filter((c) => group.subCategories.includes(c.slug))
        .map((c) => c.id);
      const result = await fetchProducts(searchTerm || undefined, undefined, subCatIds.length > 0 ? subCatIds : undefined);
      products = result.products;
    } else if (currentCat !== 'all') {
      const catId = currentCatObj?.id;
      const result = await fetchProducts(searchTerm || undefined, catId);
      products = result.products;
    } else {
      const result = await fetchProducts(searchTerm || undefined);
      products = result.products;
    }
  } catch (err) {
    console.error('Failed to fetch category products:', err);
  }

  return (
    <CategoryShell
      categorySlug={categorySlug}
      currentCat={currentCat}
      group={group}
      categories={categories}
      products={products}
      theme={theme}
      sort={sort}
      searchParams={resolvedSearch}
    />
  );
}
