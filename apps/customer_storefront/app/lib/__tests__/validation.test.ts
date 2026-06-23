import { describe, it, expect } from 'vitest';
import { checkoutSchema } from '../validation';

const validBase = {
  orderNumber: 'LSO-20260101-ABCD1234',
  tenantId: '00000000-0000-0000-0000-000000000001',
  storeId: '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd',
  customerName: 'Karim Ahmed',
  customerPhone: '01712345678',
  customerAddress: '123 Test Road, Chittagong',
  items: [{ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Milk', price: 80, qty: 2 }],
  subtotal: 160,
  deliveryFee: 40,
  total: 200,
};

describe('checkoutSchema', () => {
  it('accepts a valid order', () => {
    const result = checkoutSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('rejects empty items array', () => {
    const result = checkoutSchema.safeParse({ ...validBase, items: [] });
    expect(result.success).toBe(false);
  });

  it('rejects negative total', () => {
    const result = checkoutSchema.safeParse({ ...validBase, total: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects empty order number', () => {
    const result = checkoutSchema.safeParse({ ...validBase, orderNumber: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name shorter than 2 chars', () => {
    const result = checkoutSchema.safeParse({ ...validBase, customerName: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 100 chars', () => {
    const result = checkoutSchema.safeParse({ ...validBase, customerName: 'A'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid Bangladeshi phone (too short)', () => {
    const result = checkoutSchema.safeParse({ ...validBase, customerPhone: '017123' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid Bangladeshi phone (wrong prefix)', () => {
    const result = checkoutSchema.safeParse({ ...validBase, customerPhone: '02712345678' });
    expect(result.success).toBe(false);
  });

  it('accepts +880 format phone', () => {
    const result = checkoutSchema.safeParse({ ...validBase, customerPhone: '+8801712345678' });
    expect(result.success).toBe(true);
  });

  it('rejects address shorter than 10 chars', () => {
    const result = checkoutSchema.safeParse({ ...validBase, customerAddress: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects non-uuid tenantId', () => {
    const result = checkoutSchema.safeParse({ ...validBase, tenantId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects negative delivery fee', () => {
    const result = checkoutSchema.safeParse({ ...validBase, deliveryFee: -10 });
    expect(result.success).toBe(false);
  });

  it('rejects zero qty in items', () => {
    const result = checkoutSchema.safeParse({
      ...validBase,
      items: [{ ...validBase.items[0], qty: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative price in items', () => {
    const result = checkoutSchema.safeParse({
      ...validBase,
      items: [{ ...validBase.items[0], price: -5 }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts zero delivery fee (free delivery)', () => {
    const result = checkoutSchema.safeParse({ ...validBase, deliveryFee: 0 });
    expect(result.success).toBe(true);
  });

  it('accepts optional notes field', () => {
    const result = checkoutSchema.safeParse({ ...validBase, notes: 'Ring bell twice' });
    expect(result.success).toBe(true);
  });

  it('accepts optional deliverySlot field', () => {
    const result = checkoutSchema.safeParse({ ...validBase, deliverySlot: 'morning' });
    expect(result.success).toBe(true);
  });
});