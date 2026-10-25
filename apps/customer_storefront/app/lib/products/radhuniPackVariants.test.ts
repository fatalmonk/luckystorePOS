import { describe, expect, it } from 'vitest';
import { createProductId, type Product } from './types';
import { filterRadhuniPackVariants } from './radhuniPackVariants';

function product(id: string, name: string, stock: number): Product {
  return {
    id: createProductId(id),
    name,
    emoji: '',
    price: 1,
    unit: 'g',
    category: 'spices',
    stock,
    description: '',
  };
}

describe('filterRadhuniPackVariants', () => {
  it('keeps only in-stock packs from the same supported spice family and sorts by size', () => {
    const current = product('2c8787a2-0000-0000-0000-000000000000', 'Radhuni Dhoniya Gura 15 g', 0);
    const candidates = [
      product('6797819a-0000-0000-0000-000000000000', 'Radhuni Dhoniya Gura 200 g', 6),
      product('e0f3835d-0000-0000-0000-000000000000', 'Radhuni Dhoniya Gura 50 g', 12),
      product('15b0ac41-0000-0000-0000-000000000000', 'Radhuni Dhoniya Gura 100 g', 0),
      product('d8b54177-0000-0000-0000-000000000000', 'Radhuni Holud Gura 50 g', 13),
      product('aaaaaaaa-0000-0000-0000-000000000000', 'Radhuni Biryani Masala 40 g', 4),
      product('bbbbbbbb-0000-0000-0000-000000000000', 'Other Brand Dhoniya Gura 50 g', 4),
      product('2c8787a2-0000-0000-0000-000000000000', 'Radhuni Dhoniya Gura 15 g', 12),
    ];

    expect(filterRadhuniPackVariants(current, candidates).map(({ name }) => name)).toEqual([
      'Radhuni Dhoniya Gura 50 g',
      'Radhuni Dhoniya Gura 200 g',
    ]);
  });

  it('does not create pack links for products outside the four audited spice families', () => {
    const current = product('aaaaaaaa-0000-0000-0000-000000000000', 'Radhuni Biryani Masala 40 g', 10);
    const candidate = product('bbbbbbbb-0000-0000-0000-000000000000', 'Radhuni Biryani Masala 80 g', 5);

    expect(filterRadhuniPackVariants(current, [candidate])).toEqual([]);
  });
});
