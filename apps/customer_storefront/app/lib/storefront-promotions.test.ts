import { describe, expect, it } from 'vitest';
import { getPromotionalPrice, type StorefrontItemPromotion } from './storefront-promotions';

const promotion: StorefrontItemPromotion = {
  item_id: 'product-1',
  discount_percent: 5,
  expected_price: 19,
  expected_mrp: 24,
  starts_at: '2026-10-18T18:00:00.000Z',
  ends_at: '2026-10-25T18:00:00.000Z',
};

describe('storefront item promotions', () => {
  it('applies 5% to the current selling price and rounds to two decimals', () => {
    expect(getPromotionalPrice(
      { id: 'product-1', price: 19, originalPrice: 24, stock: 2 },
      [promotion],
      new Date('2026-10-20T12:00:00.000Z'),
    )).toBe(18.05);
  });

  it('is inactive outside the inclusive Dhaka week window', () => {
    expect(getPromotionalPrice(
      { id: 'product-1', price: 19, originalPrice: 24, stock: 2 },
      [promotion],
      new Date('2026-10-18T17:59:59.999Z'),
    )).toBe(19);
    expect(getPromotionalPrice(
      { id: 'product-1', price: 19, originalPrice: 24, stock: 2 },
      [promotion],
      new Date('2026-10-25T18:00:00.000Z'),
    )).toBe(19);
  });

  it('stops applying the offer when the selling price, MRP, or stock no longer qualifies', () => {
    const now = new Date('2026-10-20T12:00:00.000Z');
    expect(getPromotionalPrice({ id: 'product-1', price: 20, originalPrice: 24, stock: 2 }, [promotion], now)).toBe(20);
    expect(getPromotionalPrice({ id: 'product-1', price: 19, originalPrice: 25, stock: 2 }, [promotion], now)).toBe(19);
    expect(getPromotionalPrice({ id: 'product-1', price: 19, originalPrice: 24, stock: 0 }, [promotion], now)).toBe(19);
  });
});
