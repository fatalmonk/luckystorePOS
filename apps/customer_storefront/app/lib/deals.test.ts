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
    it('loads deals via get_storefront_deals RPC when no campaign is active', async () => {
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
          if (name === 'get_storefront_deals') {
            expect(args.p_min_discount_percent).toBe(10);
            expect(args.p_limit).toBeLessThanOrEqual(100);
            return {
              data: [
                {
                  id: 'deal-rpc-1',
                  name: 'Postgres Filtered Deal',
                  price: 80,
                  mrp: 100,
                  sellable_qty: 15,
                  category: 'Beverages',
                  discount_percent: 20,
                },
              ],
              error: null,
            };
          }
          throw new Error(`Unexpected RPC: ${name}`);
        },
      };

      const result = await loadWeeklyDeals(mockClient, new Date('2026-10-17T10:00:00Z'));
      expect(result.activeEdition).toBe(false);
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Postgres Filtered Deal');
      expect(result.products[0].verifiedDiscountPercent).toBe(20);
      expect(result.degradedReason).toBe('none');
    });

    it('degrades to catalogue_outage and empty products when get_storefront_deals fails', async () => {
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
        rpc: async (name: string, _args: any) => {
          if (name === 'get_storefront_deals') {
            throw new Error('RPC network timeout');
          }
          throw new Error(`Unexpected RPC call: ${name}`);
        },
      };

      const result = await loadWeeklyDeals(mockClient, new Date('2026-10-17T10:00:00Z'));
      expect(result.activeEdition).toBe(false);
      expect(result.degradedReason).toBe('catalogue_outage');
      expect(result.products).toHaveLength(0);
      expect(result.error).toContain('RPC network timeout');
    });

    it('enforces MIN_CAMPAIGN_ELIGIBLE_PRODUCTS threshold and degrades if fewer items qualify', async () => {
      // 12 campaign rows exist
      const campaignRows = Array.from({ length: 12 }, (_, index) => ({
        item_id: `camp-item-${index}`,
        expected_name: `Camp Item ${index}`,
        expected_price: 90,
        expected_mrp: 100,
        discount_percent: 5,
        starts_at: '2026-10-18T18:00:00.000Z',
        ends_at: '2026-10-25T18:00:00.000Z',
        campaign_key: 'dealoftheweek-2026-10-19',
        is_current: true,
        selection_reason: 'Deal',
        offer_terms: 'Online only',
        evidence_source: 'Snapshot',
        evidence_checked_at: '2026-10-15T10:00:00.000Z',
      }));

      // Only 6 products qualify in the catalogue (less than MIN_CAMPAIGN_ELIGIBLE_PRODUCTS = 8)
      const catalogItems = Array.from({ length: 6 }, (_, index) => ({
        id: `camp-item-${index}`,
        name: `Camp Item ${index}`,
        price: 90,
        mrp: 100,
        sellable_qty: 5,
        category: 'Grocery',
      }));

      const mockClient = {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                gt: async () => ({ data: campaignRows, error: null }),
              }),
            }),
          }),
        }),
        rpc: async (name: string, _args: any) => {
          if (name === 'search_storefront_catalog_v2') {
            return { data: catalogItems, error: null };
          }
          if (name === 'get_storefront_deals') {
            return {
              data: [
                {
                  id: 'fallback-deal-1',
                  name: 'Fallback Item 1',
                  price: 90,
                  mrp: 100,
                  sellable_qty: 10,
                  category: 'Grocery',
                },
              ],
              error: null,
            };
          }
          return { data: [], error: null };
        },
      };

      const result = await loadWeeklyDeals(mockClient, new Date('2026-10-20T12:00:00.000Z'));
      expect(result.activeEdition).toBe(false);
      expect(result.degradedReason).toBe('insufficient_eligible_products');
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Fallback Item 1');
    });

    it('sets degradedReason to campaign_lookup_failed when campaign table query fails', async () => {
      const mockClient = {
        from: () => {
          throw new Error('Database connection timeout');
        },
        rpc: async (name: string) => {
          if (name === 'get_storefront_deals') {
            return {
              data: [
                {
                  id: 'fallback-1',
                  name: 'Fallback Deal',
                  price: 90,
                  mrp: 100,
                  sellable_qty: 10,
                  category: 'Grocery',
                },
              ],
              error: null,
            };
          }
          return { data: [], error: null };
        },
      };

      const result = await loadWeeklyDeals(mockClient, new Date('2026-10-20T12:00:00.000Z'));
      expect(result.activeEdition).toBe(false);
      expect(result.degradedReason).toBe('campaign_lookup_failed');
      expect(result.products).toHaveLength(1);
    });

    it('sets degradedReason to catalogue_outage when both campaign and catalogue fail', async () => {
      const mockClient = {
        from: () => {
          throw new Error('Database down');
        },
        rpc: async () => {
          throw new Error('RPC unavailable');
        },
      };

      const result = await loadWeeklyDeals(mockClient, new Date('2026-10-20T12:00:00.000Z'));
      expect(result.activeEdition).toBe(false);
      expect(result.degradedReason).toBe('catalogue_outage');
      expect(result.products).toHaveLength(0);
      expect(result.error).toBe('RPC unavailable');
    });
  });
});

