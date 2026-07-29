import { CATEGORY_GROUPS, getParentGroup } from './types';
import type { Product } from './types';

const FEATURED_CATEGORY_SLUGS = [
  'cooking-essentials',
  'dairy-and-eggs',
  'noodles',
  'tea-&-coffee',
  'chocolates-and-candies',
  'baking-needs',
  'personal-care',
  'electronics',
] as const;

function normalizeCategory(category: string) {
  return category
    .toLowerCase()
    .trim()
    .replace(/\s*&\s*/g, '-&-')
    .replace(/\s+/g, '-');
}

export function selectCategoryCarousel(products: Product[]) {
  return FEATURED_CATEGORY_SLUGS.map((slug) => {
    const group = CATEGORY_GROUPS.find((candidate) => candidate.slug === slug);
    if (!group) return null;

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
  }).filter(
    (category): category is NonNullable<typeof category> => Boolean(category && category.itemCount > 0),
  );
}
