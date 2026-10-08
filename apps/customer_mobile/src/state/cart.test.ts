import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('cart calculations and delivery policy', () => {
  const FREE_DELIVERY_THRESHOLD = 500;
  const STANDARD_DELIVERY_FEE = 40;

  function calculateTotals(items: { price: number; qty: number }[]) {
    const subtotal = items.reduce((acc, item) => acc + item.price * item.qty, 0);
    const deliveryFee = items.length === 0 ? 0 : subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
    const total = items.length === 0 ? 0 : subtotal + deliveryFee;
    const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
    return { subtotal, deliveryFee, total, amountToFreeDelivery };
  }

  it('calculates ৳40 delivery fee for subtotal under ৳500', () => {
    const items = [{ price: 200, qty: 2 }]; // 400 BDT
    const totals = calculateTotals(items);
    assert.equal(totals.subtotal, 400);
    assert.equal(totals.deliveryFee, 40);
    assert.equal(totals.total, 440);
    assert.equal(totals.amountToFreeDelivery, 100);
  });

  it('calculates ৳0 free delivery for subtotal >= ৳500', () => {
    const items = [{ price: 260, qty: 2 }]; // 520 BDT
    const totals = calculateTotals(items);
    assert.equal(totals.subtotal, 520);
    assert.equal(totals.deliveryFee, 0);
    assert.equal(totals.total, 520);
    assert.equal(totals.amountToFreeDelivery, 0);
  });

  it('handles empty cart correctly with 0 totals and 0 delivery fee', () => {
    const totals = calculateTotals([]);
    assert.equal(totals.subtotal, 0);
    assert.equal(totals.deliveryFee, 0);
    assert.equal(totals.total, 0);
    assert.equal(totals.amountToFreeDelivery, 500);
  });
});
