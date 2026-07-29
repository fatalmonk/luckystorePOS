import { describe, expect, it } from 'vitest';
import { selectCategoryCarousel } from './categoryCarousel';
import type { Product } from './types';

function product(
  id: string,
  category: string,
  overrides: Partial<Product> = {},
): Product {
  return {
    id,
    category,
    name: `Product ${id}`,
    emoji: '🛒',
    price: 100,
    unit: 'pc',
    stock: 10,
    description: 'Catalog product',
    ...overrides,
  };
}

describe('selectCategoryCarousel', () => {
  it('returns one catalog-backed category collection with in-stock counts', () => {
    const products = [
      product('milk-a', 'Dairy & Eggs'),
      product('milk-b', 'Milk'),
      product('tea', 'Tea & Coffee'),
      product('baking', 'Baking Needs'),
      product('sold-out', 'Tea & Coffee', { stock: 0 }),
      product('unfeatured', 'Air Freshner'),
    ];

    const categories = selectCategoryCarousel(products);

    expect(categories.map((category) => category.slug)).toEqual([
      'dairy-and-eggs',
      'tea-&-coffee',
      'baking-needs',
    ]);
    expect(categories.find((category) => category.slug === 'dairy-and-eggs')?.itemCount).toBe(2);
    expect(categories.find((category) => category.slug === 'tea-&-coffee')?.itemCount).toBe(1);
  });
});
