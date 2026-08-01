import { CATEGORY_GROUPS, getParentGroup } from './types';
import type { Product } from './types';

function normalizeCategory(category: string) {
  return category
    .toLowerCase()
    .trim()
    .replace(/\s*&\s*/g, '-&-')
    .replace(/\s+/g, '-');
}

export function selectCategoryCarousel(products: Product[]) {
  return CATEGORY_GROUPS.map((group) => {
    const itemCount = products.filter((product) => {
      if (product.stock <= 0) return false;
      const normalized = normalizeCategory(product.category);
      const parent = getParentGroup(normalized);
      return (
        normalized === group.slug ||
        group.subCategories.includes(normalized) ||
        parent?.slug === group.slug
      );
    }).length;

    return {
      ...group,
      itemCount,
      href: `/category/${group.slug}`,
    };
  }).filter((category) => category.itemCount > 0);
}
