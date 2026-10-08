import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { calculateCartTotals } from './cart-calc';

describe('cart calculations and delivery policy', () => {

  it('calculates ৳40 delivery fee for subtotal under ৳500', () => {
    const items = [{ price: 200, qty: 2 }]; // 400 BDT
    const totals = calculateCartTotals(items);
    assert.equal(totals.subtotal, 400);
    assert.equal(totals.deliveryFee, 40);
    assert.equal(totals.total, 440);
    assert.equal(totals.amountToFreeDelivery, 100);
  });

  it('calculates ৳0 free delivery for subtotal >= ৳500', () => {
    const items = [{ price: 260, qty: 2 }]; // 520 BDT
    const totals = calculateCartTotals(items);
    assert.equal(totals.subtotal, 520);
    assert.equal(totals.deliveryFee, 0);
    assert.equal(totals.total, 520);
    assert.equal(totals.amountToFreeDelivery, 0);
  });

  it('handles empty cart correctly with 0 totals and 0 delivery fee', () => {
    const totals = calculateCartTotals([]);
    assert.equal(totals.subtotal, 0);
    assert.equal(totals.deliveryFee, 0);
    assert.equal(totals.total, 0);
    assert.equal(totals.amountToFreeDelivery, 500);
  });
});
