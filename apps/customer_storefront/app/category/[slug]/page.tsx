import { CategoryShell } from '../CategoryShell';
import { createProductRepository } from '../../lib/products/index';
import { getCachedCategories } from '../../lib/products/getCachedCategories';
import { supabase } from '../../lib/supabase';
import { getSingleParam } from '../../lib/utils';
import { getCategoryGroup, getParentGroup, CATEGORY_GROUPS, normalizeCategorySlug } from '../../lib/types';
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
  const categories = await getCachedCategories();
  const group = getCategoryGroup(categorySlug);
  const currentCatObj = categories.find((c) => c.slug === categorySlug);
  const titleName = group?.label || currentCatObj?.name || categorySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return {
    title: `${titleName} in Chittagong | Lucky Store`,
    description: `Shop ${titleName} online at Lucky Store Chittagong. Quality items, fast home delivery, and cash on delivery.`,
    alternates: {
      canonical: `https://luckystore1947.com/category/${categorySlug}`,
    },
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
  const categories = await getCachedCategories();
  const { repo } = createProductRepository(supabase);
  const categorySlug = decodeURIComponent(resolvedParams.slug);
  
  let group = getCategoryGroup(categorySlug);
  const currentCatObj = categories.find((c) => c.slug === categorySlug);

  // Dynamically treat root categories with child categories as groups
  if (!group && currentCatObj) {
    const childCats = categories.filter((c) => (c.parentId ?? c.parent_id) === currentCatObj.id);
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
    const parentId = currentCatObj?.parentId ?? currentCatObj?.parent_id;
    if (!parentGroup && parentId) {
      const parentCatObj = categories.find((c) => c.id === parentId);
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
    const isGroupRoot = group && normalizeCategorySlug(group.slug) === normalizeCategorySlug(categorySlug);
    if (isGroupRoot) {
      // Visiting the group page itself (e.g. /category/personal-care) -> aggregate all subcategories
      const subCatIds = categories
        .filter((c) => {
          const normC = normalizeCategorySlug(c.slug);
          return group!.subCategories.some((sub) => normalizeCategorySlug(sub) === normC);
        })
        .map((c) => c.id);
      const result = await repo.search({
        query: searchTerm || undefined,
        categoryIds: subCatIds.length > 0 ? subCatIds : undefined,
        limit: 500,
      });
      products = result.products as any[];
    } else if (currentCatObj) {
      // Visiting a specific subcategory (e.g. /category/facial) -> fetch only products for this subcategory
      const result = await repo.search({
        query: searchTerm || undefined,
        categoryId: currentCatObj.id,
        limit: 200,
      });
      products = result.products as any[];
    } else if (group) {
      // Recognized static subcategory without exact DB category row -> filter by slug term
      const result = await repo.search({
        query: searchTerm || categorySlug.replace(/-/g, ' '),
        limit: 200,
      });
      products = result.products as any[];
    } else {
      const result = await repo.search({
        query: searchTerm || undefined,
        limit: 200,
      });
      products = result.products as any[];
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
