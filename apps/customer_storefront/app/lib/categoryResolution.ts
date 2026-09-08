import { getCategoryGroup, getParentGroup, normalizeCategorySlug, getCanonicalCategorySlug } from './types';
import type { CategoryGroup } from './types';
import type { Category } from './products/types';

export interface ResolvedCanonicalCategory {
  canonicalSlug: string | null;
  group?: CategoryGroup;
  currentCatObj?: Category;
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
