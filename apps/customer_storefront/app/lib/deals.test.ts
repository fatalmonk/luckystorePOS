import { describe, it, expect } from 'vitest';
import { getDiscountPercentage, getDealOfTheWeekProducts, getNextSundayDeadline } from './deals';
import type { Product } from './types';

const mockProducts: Product[] = [
  {
    id: 'p1',
    name: 'Product 1',
    emoji: '🍎',
    price: 80,
    originalPrice: 100, // 20% discount
    unit: '1 kg',
    category: 'cooking-essentials',
    stock: 10,
    description: 'Fresh item',
  },
  {
    id: 'p2',
    name: 'Product 2',
    emoji: '🍌',
    price: 50,
    originalPrice: 100, // 50% discount - highest discount
    unit: '1 dozen',
    category: 'cooking-essentials',
    stock: 5,
    description: 'Fresh item',
  },
  {
    id: 'p3',
    name: 'Product 3',
    emoji: '🍇',
    price: 90,
    originalPrice: 100, // 10% discount
    unit: '500g',
    category: 'snacks',
    stock: 0, // out of stock
    description: 'Out of stock item',
  },
  {
    id: 'p4',
    name: 'Product 4',
    emoji: '🥛',
    price: 70,
    originalPrice: 100, // 30% discount
    unit: '1 L',
    category: 'breakfast',
    stock: 15,
    description: 'Fresh milk',
  },
];

describe('deals logic', () => {
  it('calculates correct discount percentage', () => {
    expect(getDiscountPercentage(mockProducts[0])).toBe(20);
    expect(getDiscountPercentage(mockProducts[1])).toBe(50);
  });

  it('selects highest-discount in-stock product as lead, excludes out of stock', () => {
    const result = getDealOfTheWeekProducts(mockProducts);
    expect(result).not.toBeNull();
    expect(result?.leadProduct.id).toBe('p2'); // 50% discount
    expect(result?.supportingProducts.map((p) => p.id)).toEqual(['p4', 'p1']); // 30%, 20% (p3 excluded because stock 0)
  });

  it('returns null if no in-stock discounted products exist', () => {
    const noDeals: Product[] = [
      {
        id: 'p5',
        name: 'Regular',
        emoji: '📦',
        price: 100,
        unit: '1 pc',
        category: 'snacks',
        stock: 10,
        description: 'No discount',
      },
    ];
    expect(getDealOfTheWeekProducts(noDeals)).toBeNull();
  });

  it('calculates Sunday deadline in Dhaka timezone (UTC+6)', () => {
    // Wednesday 2026-07-22 10:00:00 UTC (16:00:00 Dhaka)
    const fixedNow = new Date('2026-07-22T10:00:00Z');
    const deadline = getNextSundayDeadline(fixedNow);
    
    // Target Sunday is 2026-07-26
    // 23:59:59 Dhaka (UTC+6) is 17:59:59 UTC
    expect(deadline.toISOString()).toBe('2026-07-26T17:59:59.999Z');
  });
});
