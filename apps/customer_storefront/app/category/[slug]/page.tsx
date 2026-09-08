import React from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { CategoryShell } from '../CategoryShell';
import { createProductRepository } from '../../lib/products/index';
import { getCachedCategories } from '../../lib/products/getCachedCategories';
import { supabase } from '../../lib/supabase';
import { getSingleParam } from '../../lib/utils';
import { getCategoryGroup, getParentGroup, CATEGORY_GROUPS, normalizeCategorySlug } from '../../lib/types';
import { resolveCanonicalCategory } from '../../lib/categoryResolution';
import type { CategoryGroup } from '../../lib/types';
import type { Category, Product } from '../../lib/products/types';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const categorySlug = decodeURIComponent(resolvedParams.slug);
  const categories = await getCachedCategories();
  const { canonicalSlug, group, currentCatObj } = resolveCanonicalCategory(categorySlug, categories);

  if (!canonicalSlug) {
    notFound();
  }

  if (categorySlug !== canonicalSlug) {
    const p = new URLSearchParams();
    for (const [key, value] of Object.entries(resolvedSearch)) {
      if (typeof value === 'string') p.set(key, value);
      else if (Array.isArray(value) && value.length) p.set(key, value[0]);
    }
    const qs = p.toString();
    permanentRedirect(qs ? `/category/${canonicalSlug}?${qs}` : `/category/${canonicalSlug}`);
  }

  const hasFilters = Object.values(resolvedSearch).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  );
  const titleName = group?.label || currentCatObj?.name || canonicalSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return {
    title: `${titleName} in Chittagong | Lucky Store`,
    description: `Shop ${titleName} online at Lucky Store Chittagong. Quality items, fast home delivery, and cash on delivery.`,
    robots: hasFilters ? {
      index: false,
      follow: true,
    } : undefined,
    alternates: {
      canonical: `https://luckystore1947.com/category/${canonicalSlug}`,
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
  const { canonicalSlug, group: initialGroup, currentCatObj } = resolveCanonicalCategory(categorySlug, categories);

  if (!canonicalSlug) {
    notFound();
  }

  if (categorySlug !== canonicalSlug) {
    const p = new URLSearchParams();
    for (const [key, value] of Object.entries(resolvedSearch)) {
      if (typeof value === 'string') p.set(key, value);
      else if (Array.isArray(value) && value.length) p.set(key, value[0]);
    }
    const qs = p.toString();
    permanentRedirect(qs ? `/category/${canonicalSlug}?${qs}` : `/category/${canonicalSlug}`);
  }

  let group = initialGroup;

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
    parentGroup = getParentGroup(canonicalSlug);
    const parentId = currentCatObj?.parentId ?? currentCatObj?.parent_id;
    if (!parentGroup && parentId) {
      const parentCatObj = categories.find((c) => c.id === parentId);
      if (parentCatObj) {
        parentGroup = getCategoryGroup(parentCatObj.slug) || {
          slug: parentCatObj.slug,
          label: parentCatObj.name,
          emoji: parentCatObj.emoji,
          subCategories: [canonicalSlug],
        };
      }
    }
  }

  const currentCat = canonicalSlug;

  const searchTerm = getSingleParam(resolvedSearch.q) || getSingleParam(resolvedSearch.search);
  const theme = getSingleParam(resolvedSearch.theme);
  const sort = getSingleParam(resolvedSearch.sort) || 'best';

  let products: Product[] = [];
  try {
    const isGroupRoot = group && normalizeCategorySlug(group.slug) === normalizeCategorySlug(canonicalSlug);
    if (isGroupRoot) {
      // Visiting the group page itself (e.g. /category/personal-care) -> aggregate all subcategories
      const subCatIds = categories
        .filter((c) => {
          const normC = normalizeCategorySlug(c.slug);
          return group!.subCategories.some((sub) => normalizeCategorySlug(sub) === normC);
        })
        .map((c) => c.id);
      if (currentCatObj && !subCatIds.includes(currentCatObj.id)) {
        subCatIds.push(currentCatObj.id);
      }
      const result = await repo.search({
        query: searchTerm || undefined,
        categoryIds: subCatIds.length > 0 ? subCatIds : undefined,
        limit: 500,
      });
      products = result.products as any[];
    } else if (currentCatObj?.id) {
      // Visiting a specific subcategory with DB ID (e.g. /category/rice-and-grain)
      const result = await repo.search({
        query: searchTerm || undefined,
        categoryId: currentCatObj.id,
        limit: 200,
      });
      products = result.products as any[];

      // Fallback: if categoryId search yielded 0 products (e.g. legacy products tagged by name), fallback to name
      if (products.length === 0 && !searchTerm) {
        const fallbackResult = await repo.search({
          query: currentCatObj.name || canonicalSlug.replace(/-/g, ' '),
          limit: 200,
        });
        products = fallbackResult.products as any[];
      }
    } else {
      // Valid leaf category or subcategory without direct DB category row -> search by keyword
      const result = await repo.search({
        query: searchTerm || canonicalSlug.replace(/-/g, ' '),
        limit: 200,
      });
      products = result.products as any[];
    }
  } catch (err) {
    console.error('Failed to fetch category products:', err);
  }

  return (
    <CategoryShell
      categorySlug={canonicalSlug}
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
