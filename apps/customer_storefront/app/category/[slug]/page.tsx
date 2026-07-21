import { CategoryShell } from '../CategoryShell';
import { fetchProducts, fetchCategories } from '../../lib/products';
import { getSingleParam } from '../../lib/utils';
import { getCategoryGroup, getParentGroup, CATEGORY_GROUPS } from '../../lib/types';
import type { Category, Product, CategoryGroup } from '../../lib/types';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const categorySlug = decodeURIComponent(resolvedParams.slug);
  const categories = await fetchCategories();
  const group = getCategoryGroup(categorySlug);
  const currentCatObj = categories.find((c) => c.slug === categorySlug);
  const titleName = group?.label || currentCatObj?.name || categorySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return {
    title: `${titleName} | Lucky Store`,
    description: `Shop ${titleName} at Lucky Store — fresh groceries, household items, and same-day delivery in Chittagong.`,
  };
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

  // Resolve parent group if this is a subcategory
  let parentGroup: CategoryGroup | undefined;
  if (!group) {
    parentGroup = getParentGroup(categorySlug);
    if (!parentGroup && currentCatObj?.parent_id) {
      const parentCatObj = categories.find((c) => c.id === currentCatObj.parent_id);
      if (parentCatObj) {
        parentGroup = getCategoryGroup(parentCatObj.slug) || {
          slug: parentCatObj.slug,
          label: parentCatObj.name,
          emoji: parentCatObj.emoji,
          subCategories: [categorySlug],
        };
      }
    }
  }

  const isValidCat = !!currentCatObj;
  const currentCat = isValidCat || group ? categorySlug : 'all';

  const searchTerm = getSingleParam(resolvedSearch.q);
  const theme = getSingleParam(resolvedSearch.theme);
  const sort = getSingleParam(resolvedSearch.sort) || 'best';

  let products: Product[] = [];
  try {
    const activeGroup = group || parentGroup;
    if (activeGroup) {
      const subCatIds = categories
        .filter((c) => activeGroup.subCategories.includes(c.slug))
        .map((c) => c.id);
      const result = await fetchProducts(searchTerm || undefined, undefined, subCatIds.length > 0 ? subCatIds : undefined, 0, 500);
      products = result.products;
    } else if (currentCat !== 'all') {
      const catId = currentCatObj?.id;
      const result = await fetchProducts(searchTerm || undefined, catId, undefined, 0, 200);
      products = result.products;
    } else {
      const result = await fetchProducts(searchTerm || undefined, undefined, undefined, 0, 200);
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
      parentGroup={parentGroup}
      categories={categories}
      products={products}
      theme={theme}
      sort={sort}
      searchParams={resolvedSearch}
    />
  );
}
