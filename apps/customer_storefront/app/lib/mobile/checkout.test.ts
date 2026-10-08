import { describe, it, expect } from 'vitest';
import {
  calculateOrderTotals,
  validatePhone,
  generateOrderNumber,
  FREE_DELIVERY_THRESHOLD,
  STANDARD_DELIVERY_FEE,
} from './checkout';

describe('mobile checkout lib', () => {
  it('calculates totals correctly with fee for subtotal under 500', () => {
    const items = [
      { price: 100, qty: 2 },
      { price: 150, qty: 1 },
    ];
    const { subtotal, deliveryFee, total } = calculateOrderTotals(items);
    expect(subtotal).toBe(350);
    expect(deliveryFee).toBe(STANDARD_DELIVERY_FEE);
    expect(total).toBe(390);
  });

  it('calculates free delivery when subtotal meets threshold', () => {
    const items = [
      { price: 250, qty: 2 },
    ];
    const { subtotal, deliveryFee, total } = calculateOrderTotals(items);
    expect(subtotal).toBe(FREE_DELIVERY_THRESHOLD);
    expect(deliveryFee).toBe(0);
    expect(total).toBe(500);
  });

  it('validates Bangladeshi phone numbers', () => {
    expect(validatePhone('01712345678')).toBe(true);
    expect(validatePhone('+8801712345678')).toBe(true);
    expect(validatePhone('018-1234-5678')).toBe(true);
    expect(validatePhone('019 1234 5678')).toBe(true);
    expect(validatePhone('02712345678')).toBe(false);
    expect(validatePhone('12345')).toBe(false);
    expect(validatePhone('')).toBe(false);
  });

  it('generates a valid order number format', () => {
    const orderNumber = generateOrderNumber();
    expect(orderNumber).toMatch(/^LSO-\d{8}-[A-Z0-9]{8}$/);
  });
});
