import { describe, it, expect } from 'vitest';
import {
  getDiscountBadgePercentage,
  getDiscountPercentage,
  getDealOfTheWeekProducts,
  getNextSundayDeadline,
  toWeeklyDealProduct,
  hasWeeklyEvidence,
  formatEditionPeriod,
  loadWeeklyDeals,
} from './deals';

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
  {
    id: 'p5',
    name: 'Product 5',
    emoji: '🍪',
    price: 95,
    originalPrice: 100, // 5% discount
    unit: '1 pack',
    category: 'snacks',
    stock: 8,
    description: 'Discounted snack',
  },
];

describe('deals logic', () => {
  it('calculates correct discount percentage', () => {
    expect(getDiscountPercentage(mockProducts[0])).toBe(20);
    expect(getDiscountPercentage(mockProducts[1])).toBe(50);
  });

  it('shows a percentage badge only at the 10% boundary or above', () => {
    const productAt = (price: number): Product => ({
      ...mockProducts[0],
      price,
      originalPrice: 100,
    });

    expect(getDiscountBadgePercentage(productAt(90.01))).toBeNull();
    expect(getDiscountBadgePercentage(productAt(90))).toBe(10);
    expect(getDiscountBadgePercentage(productAt(89.99))).toBe(10);
  });

  it('selects highest-discount in-stock product as lead, excludes out of stock', () => {
    const result = getDealOfTheWeekProducts(mockProducts);
    expect(result).not.toBeNull();
    expect(result?.leadProduct.id).toBe('p2'); // 50% discount
    expect(result?.supportingProducts.map((p) => p.id)).toEqual(['p4', 'p1']); // ranked discounts; out-of-stock and sub-10% products excluded
  });

  it('respects limit parameter for supporting products', () => {
    const result = getDealOfTheWeekProducts(mockProducts, 2);
    expect(result).not.toBeNull();
    expect(result?.leadProduct.id).toBe('p2');
    expect(result?.supportingProducts.map((p) => p.id)).toEqual(['p4', 'p1']);
    expect(result?.supportingProducts).toHaveLength(2);
  });

  it('returns null if no in-stock discounted products exist', () => {
    const noDeals: Product[] = [
      {
        id: 'p6',
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

  describe('toWeeklyDealProduct', () => {
    it('creates product when valid price, mrp and sellable_qty exist', () => {
      const prod = toWeeklyDealProduct({
        id: 'item-1',
        name: 'Choco Biscuit',
        price: 80,
        mrp: 100,
        sellable_qty: 5,
        category: 'Biscuits',
        image_url: 'https://example.com/biscuit.jpg',
      });
      expect(prod).not.toBeNull();
      expect(prod?.id).toBe('item-1');
      expect(prod?.price).toBe(80);
      expect(prod?.originalPrice).toBe(100);
      expect(prod?.stock).toBe(5);
    });

    it('returns null if sellable_qty is 0 even if qty_on_hand is positive', () => {
      const prod = toWeeklyDealProduct({
        id: 'item-2',
        name: 'Reserved Item',
        price: 80,
        mrp: 100,
        qty_on_hand: 10,
        sellable_qty: 0,
      });
      expect(prod).toBeNull();
    });

    it('returns null if mrp is equal or lower than price', () => {
      const prod = toWeeklyDealProduct({
        id: 'item-3',
        name: 'Full Price Item',
        price: 100,
        mrp: 100,
        sellable_qty: 5,
      });
      expect(prod).toBeNull();
    });
  });

  describe('hasWeeklyEvidence & formatEditionPeriod', () => {
    it('validates weekly promotion evidence criteria', () => {
      const valid = hasWeeklyEvidence({
        item_id: 'i1',
        expected_name: 'Name',
        discount_percent: 5,
        expected_price: 90,
        expected_mrp: 100,
        starts_at: '2026-10-18T18:00:00Z',
        ends_at: '2026-10-25T18:00:00Z',
        selection_reason: 'Top deal',
        offer_terms: 'Online only',
        evidence_source: 'Catalogue snapshot',
        evidence_checked_at: '2026-10-15T12:00:00Z',
      });
      expect(valid).toBe(true);

      const staleEvidence = hasWeeklyEvidence({
        item_id: 'i1',
        expected_name: 'Name',
        discount_percent: 5,
        expected_price: 90,
        expected_mrp: 100,
        starts_at: '2026-10-18T18:00:00Z',
        ends_at: '2026-10-25T18:00:00Z',
        selection_reason: 'Top deal',
        offer_terms: 'Online only',
        evidence_source: 'Catalogue snapshot',
        evidence_checked_at: '2026-10-19T12:00:00Z', // checked after starts_at
      });
      expect(staleEvidence).toBe(false);
    });

    it('formats campaign edition period in Asia/Dhaka', () => {
      const rows = [
        {
          item_id: 'i1',
          expected_name: 'Item 1',
          discount_percent: 5,
          expected_price: 90,
          expected_mrp: 100,
          starts_at: '2026-10-18T18:00:00Z',
          ends_at: '2026-10-25T18:00:00Z',
        },
      ];
      expect(formatEditionPeriod(rows)).toContain('19 October 2026–25 October 2026 (Asia/Dhaka)');
    });
  });

  describe('loadWeeklyDeals', () => {
    it('loads bounded fallback deals when no campaign is active', async () => {
      const mockClient = {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                gt: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        }),
        rpc: async (name: string, args: any) => {
          expect(name).toBe('search_storefront_catalog');
          expect(args.p_limit).toBeLessThanOrEqual(100);
          return {
            data: [
              {
                id: 'deal-1',
                name: 'Fallback Item 1',
                price: 90,
                mrp: 100,
                sellable_qty: 10,
                category: 'Grocery',
              },
            ],
            error: null,
          };
        },
      };

      const result = await loadWeeklyDeals(mockClient, new Date('2026-10-17T10:00:00Z'));
      expect(result.activeEdition).toBe(false);
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Fallback Item 1');
      expect(result.products[0].verifiedDiscountPercent).toBe(10);
    });
  });
});

