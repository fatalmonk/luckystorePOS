import { describe, expect, it } from 'vitest';
import { getActiveWeeklyDealEdition, getPromotionalPrice, type StorefrontItemPromotion } from './storefront-promotions';

const promotion: StorefrontItemPromotion = {
  item_id: 'product-1',
  expected_name: 'Product 1',
  discount_percent: 5,
  expected_price: 19,
  expected_mrp: 24,
  starts_at: '2026-10-18T18:00:00.000Z',
  ends_at: '2026-10-25T18:00:00.000Z',
};

describe('storefront item promotions', () => {
  it('applies 5% to the current selling price and rounds to two decimals', () => {
    expect(getPromotionalPrice(
      { id: 'product-1', name: 'Product 1', price: 19, originalPrice: 24, stock: 2 },
      [promotion],
      new Date('2026-10-20T12:00:00.000Z'),
    )).toBe(18.05);
  });

  it('is inactive outside the inclusive Dhaka week window', () => {
    expect(getPromotionalPrice(
      { id: 'product-1', name: 'Product 1', price: 19, originalPrice: 24, stock: 2 },
      [promotion],
      new Date('2026-10-18T17:59:59.999Z'),
    )).toBe(19);
    expect(getPromotionalPrice(
      { id: 'product-1', name: 'Product 1', price: 19, originalPrice: 24, stock: 2 },
      [promotion],
      new Date('2026-10-25T18:00:00.000Z'),
    )).toBe(19);
  });

  it('stops applying the offer when the selling price, MRP, or stock no longer qualifies', () => {
    const now = new Date('2026-10-20T12:00:00.000Z');
    expect(getPromotionalPrice({ id: 'product-1', price: 20, originalPrice: 24, stock: 2 }, [promotion], now)).toBe(20);
    expect(getPromotionalPrice({ id: 'product-1', price: 19, originalPrice: 25, stock: 2 }, [promotion], now)).toBe(19);
    expect(getPromotionalPrice({ id: 'product-1', price: 19, originalPrice: 24, stock: 0 }, [promotion], now)).toBe(19);
    expect(getPromotionalPrice({ id: 'product-1', name: 'Renamed product', price: 19, originalPrice: 24, stock: 2 }, [promotion], now)).toBe(19);
  });

  it('activates only a complete, currently valid 12–16 product weekly edition', () => {
    const now = new Date('2026-10-19T00:00:00.000Z');
    const rows = Array.from({ length: 12 }, (_, index) => ({
      ...promotion,
      item_id: `product-${index}`,
      campaign_key: 'week-1',
    }));
    expect(getActiveWeeklyDealEdition(rows, now)).toHaveLength(12);
    expect(getActiveWeeklyDealEdition(rows.slice(1), now)).toHaveLength(0);
    expect(getActiveWeeklyDealEdition(rows.map((row, index) => ({ ...row, starts_at: index === 0 ? '2026-10-20T00:00:00.000Z' : row.starts_at })), now)).toHaveLength(0);
  });
});
