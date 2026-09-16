import React from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { CategoryShell } from '../../../category/CategoryShell';
import { createProductRepository } from '../../../lib/products/index';
import { getCachedCategories } from '../../../lib/products/getCachedCategories';
import { supabase } from '../../../lib/supabase';
import { getSingleParam } from '../../../lib/utils';
import { getCategoryGroup, getParentGroup, normalizeCategorySlug } from '../../../lib/types';
import { resolveCanonicalCategory } from '../../../lib/categoryResolution';
import type { CategoryGroup } from '../../../lib/types';
import type { Product } from '../../../lib/products/types';
import { BENGALI_CATEGORY_NAMES } from '../../../lib/products/getHomePageData';

export const dynamic = 'force-dynamic';

const BENGALI_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'rice-and-grain': 'মিনিকেট, নাজিরশাইল ও চিনিগুঁড়া চালের বর্তমান বাজারদর দেখুন।',
  'oil-and-ghee': 'সয়াবিন তেল, সরিষার তেল ও ঘি অনলাইনে কিনুন।',
  'cooking-essentials': 'ডাল, মসলা, আটা, ময়দা, লবণ ও চিনির সেরা পণ্য।',
  'tea-and-coffee': 'ইস্পাহানি, তাজা চা ও কফির আসল পণ্য।',
  breakfast: 'ডিম, দুধ ও সকালের পুষ্টিকর নাস্তার পণ্য।',
  snacks: 'নাস্তা, বিস্কুট ও চানাচুরের সেরা কালেকশন।',
  'personal-care': 'সাবান, শ্যাম্পু ও ব্যক্তিগত পরিচ্ছন্নতার প্রসাধন।',
  'cleaning-supplies': 'ঘরের পরিষ্কার-পরিচ্ছন্নতার নিত্যপ্রয়োজনীয় জিনিস।',
  household: 'ঘরের টুকিটাকি সামগ্রী ও গৃহস্থালি পণ্য।',
  'baby-care': 'শিশুর খাবার ও ডায়াপারের যত্নশীল কালেকশন।',
};

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  let categorySlug: string;
  try {
    categorySlug = decodeURIComponent(resolvedParams.slug);
  } catch {
    notFound();
  }
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
    permanentRedirect(qs ? `/bn/category/${canonicalSlug}?${qs}` : `/bn/category/${canonicalSlug}`);
  }

  const hasFilters = Object.values(resolvedSearch).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  );

  const rawTitleName = group?.label || currentCatObj?.name || canonicalSlug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const titleName = BENGALI_CATEGORY_NAMES[canonicalSlug] || (group?.slug && BENGALI_CATEGORY_NAMES[group.slug]) || rawTitleName;
  const description = BENGALI_CATEGORY_DESCRIPTIONS[canonicalSlug] || `${titleName} অনলাইনে কিনুন লাকি স্টোর চট্টগ্রাম থেকে। ক্যাশ অন ডেলিভারি এবং দ্রুত হোম ডেলিভারি।`;

  return {
    title: `${titleName} | লাকি স্টোর চট্টগ্রাম`,
    description,
    openGraph: {
      title: `${titleName} | লাকি স্টোর`,
      description,
      url: `https://www.luckystore1947.com/bn/category/${canonicalSlug}`,
      siteName: 'লাকি স্টোর',
      locale: 'bn_BD',
      type: 'website',
    },
    robots: hasFilters ? {
      index: false,
      follow: true,
    } : undefined,
    alternates: {
      canonical: `https://www.luckystore1947.com/bn/category/${canonicalSlug}`,
      languages: {
        'en-BD': `https://www.luckystore1947.com/category/${canonicalSlug}`,
        'bn-BD': `https://www.luckystore1947.com/bn/category/${canonicalSlug}`,
        'x-default': `https://www.luckystore1947.com/category/${canonicalSlug}`,
      },
    },
  };
}

export default async function BengaliCategorySlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const rawCategories = await getCachedCategories();
  const { repo } = createProductRepository(supabase);
  let categorySlug: string;
  try {
    categorySlug = decodeURIComponent(resolvedParams.slug);
  } catch {
    notFound();
  }
  const { canonicalSlug, group: initialGroup, currentCatObj } = resolveCanonicalCategory(categorySlug, rawCategories);

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
    permanentRedirect(qs ? `/bn/category/${canonicalSlug}?${qs}` : `/bn/category/${canonicalSlug}`);
  }

  let group = initialGroup;

  // Dynamically treat root categories with child categories as groups
  if (!group && currentCatObj) {
    const childCats = rawCategories.filter((c) => (c.parentId ?? c.parent_id) === currentCatObj.id);
    if (childCats.length > 0) {
      group = {
        slug: currentCatObj.slug,
        label: BENGALI_CATEGORY_NAMES[currentCatObj.slug] || currentCatObj.name,
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
      const parentCatObj = rawCategories.find((c) => c.id === parentId);
      if (parentCatObj) {
        parentGroup = getCategoryGroup(parentCatObj.slug) || {
          slug: parentCatObj.slug,
          label: BENGALI_CATEGORY_NAMES[parentCatObj.slug] || parentCatObj.name,
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

  let rawProducts: Product[] = [];
  try {
    const isGroupRoot = group && normalizeCategorySlug(group.slug) === normalizeCategorySlug(canonicalSlug);
    if (isGroupRoot) {
      const subCatIds = rawCategories
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
      rawProducts = result.products as any[];
    } else if (currentCatObj?.id) {
      const result = await repo.search({
        query: searchTerm || undefined,
        categoryId: currentCatObj.id,
        limit: 200,
      });
      rawProducts = result.products as any[];

      if (rawProducts.length === 0 && !searchTerm) {
        const fallbackResult = await repo.search({
          query: currentCatObj.name || canonicalSlug.replace(/-/g, ' '),
          limit: 200,
        });
        rawProducts = fallbackResult.products as any[];
      }
    } else {
      const result = await repo.search({
        query: searchTerm || canonicalSlug.replace(/-/g, ' '),
        limit: 200,
      });
      rawProducts = result.products as any[];
    }
  } catch (err) {
    console.error('Failed to fetch Bengali category products:', err);
  }

  // Overlay Bengali translations
  const productIds = rawProducts.map((product) => product.id);
  const { data: translations } = productIds.length
    ? await (supabase as any)
        .from('item_translations')
        .select('item_id, name, description')
        .in('item_id', productIds)
        .eq('locale', 'bn')
        .eq('review_status', 'published')
    : { data: [] };

  const translationMap = new Map((translations ?? []).map((t: any) => [t.item_id, t]));
  const products = rawProducts.map((product) => {
    const translation: any = translationMap.get(product.id);
    return translation
      ? { ...product, name: translation.name?.trim() || product.name, description: translation.description?.trim() || product.description }
      : product;
  });

  const categories = (rawCategories ?? []).map((c) => ({
    ...c,
    name: BENGALI_CATEGORY_NAMES[c.slug] || c.name,
  }));

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
      locale="bn"
    />
  );
}
