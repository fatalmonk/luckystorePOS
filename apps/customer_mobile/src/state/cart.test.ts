import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { calculateCartTotals } from './cart-calc';
import { getAvailableCartStock, getEditableCartStockLimit, UNVERIFIED_CART_STOCK_LIMIT } from '../domain/cart-stock';

describe('cart calculations and delivery policy', () => {

  it('calculates ৳40 delivery fee for subtotal under ৳500', () => {
    const items = [{ price: 200, qty: 2 }];
    const totals = calculateCartTotals(items);
    assert.equal(totals.subtotal, 400);
    assert.equal(totals.deliveryFee, 40);
    assert.equal(totals.total, 440);
    assert.equal(totals.amountToFreeDelivery, 100);
  });

  it('calculates ৳0 free delivery for subtotal >= ৳500', () => {
    const items = [{ price: 260, qty: 2 }];
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

  it('uses one default for unknown stock during add and quantity updates', () => {
    assert.equal(getAvailableCartStock(undefined), UNVERIFIED_CART_STOCK_LIMIT);
    assert.equal(getEditableCartStockLimit(undefined), UNVERIFIED_CART_STOCK_LIMIT);
  });

  it('preserves known stock limits and treats non-positive editable stock as unverified', () => {
    assert.equal(getAvailableCartStock(4), 4);
    assert.equal(getEditableCartStockLimit(4), 4);
    assert.equal(getEditableCartStockLimit(0), UNVERIFIED_CART_STOCK_LIMIT);
  });
});
