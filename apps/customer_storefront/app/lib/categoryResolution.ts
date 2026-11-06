import { getCategoryGroup, getParentGroup, normalizeCategorySlug, getCanonicalCategorySlug } from './types';
import type { CategoryGroup } from './types';
import type { Category } from './products/types';

export interface ResolvedCanonicalCategory {
  canonicalSlug: string | null;
  group?: CategoryGroup;
  currentCatObj?: Category;
}

export type CategoryRouteLocale = 'en' | 'bn';

export function getCanonicalCategoryRedirectPath(
  locale: CategoryRouteLocale,
  requestedSlug: string,
  canonicalSlug: string,
  searchParams: Record<string, string | string[] | undefined>,
): string | null {
  if (requestedSlug === canonicalSlug) return null;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') params.set(key, value);
    else if (Array.isArray(value) && value.length > 0) params.set(key, value[0]);
  }

  const query = params.toString();
  const prefix = locale === 'bn' ? '/bn/category' : '/category';
  return `${prefix}/${canonicalSlug}${query ? `?${query}` : ''}`;
}

/**
 * Resolves the canonical category slug and matched object or group.
 * Guarantees a single source of truth across category routing, metadata, and sitemap.
 */
export function resolveCanonicalCategory(
  categorySlug: string,
  categories: Category[],
): ResolvedCanonicalCategory {
  const normalizedInput = normalizeCategorySlug(categorySlug);
  if (!normalizedInput) return { canonicalSlug: null, group: undefined, currentCatObj: undefined };

  const group = getCategoryGroup(normalizedInput);
  const currentCatObj = categories.find((c) => {
    const normSlug = normalizeCategorySlug(c.slug);
    const normName = normalizeCategorySlug(c.name);
    return normSlug === normalizedInput || normName === normalizedInput;
  });
  const parentGroup = getParentGroup(normalizedInput);

  const isKnown = Boolean(group || currentCatObj || parentGroup);
  if (!isKnown) {
    return { canonicalSlug: null, group: undefined, currentCatObj: undefined };
  }

  const rawCandidate = group?.slug || currentCatObj?.slug || currentCatObj?.name || normalizedInput;
  const canonicalSlug = getCanonicalCategorySlug(rawCandidate);

  return {
    canonicalSlug,
    group,
    currentCatObj,
  };
}
