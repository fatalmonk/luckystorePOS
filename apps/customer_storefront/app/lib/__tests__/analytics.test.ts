// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_CONSENT_KEY,
  sendAnalyticsEvent,
  toAnalyticsItem,
  trackPurchase,
  trackAddToCart,
  trackAddPaymentInfo,
} from '../analytics';
import type { CartItem, Product } from '../types';

const product: Product = {
  id: 'prod-1',
  name: 'Test Rice 1kg',
  emoji: '',
  price: 120,
  unit: '1kg',
  category: 'Rice & Grain',
  stock: 10,
  description: 'Test product',
};

const cartItem: CartItem = { ...product, qty: 2 };

describe('commerce analytics', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.gtag = vi.fn();
    delete window.zaraz;
  });

  it('does not send events before analytics consent', () => {
    expect(sendAnalyticsEvent('view_item', { value: 120 })).toBe(false);
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('uses the direct Google tag when Zaraz is unavailable', () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');

    expect(sendAnalyticsEvent('view_item', { value: 120 })).toBe(true);
    expect(window.gtag).toHaveBeenCalledWith('event', 'view_item', { value: 120 });
  });

  it('uses Zaraz as the single path when it is active', () => {
    const track = vi.fn();
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
    window.zaraz = { track };

    expect(sendAnalyticsEvent('view_item', { value: 120 })).toBe(true);
    expect(track).toHaveBeenCalledWith('view_item', { value: 120 });
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it('uses Zaraz ecommerce events for product additions', () => {
    const ecommerce = vi.fn();
    const track = vi.fn();
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
    window.zaraz = { track, ecommerce };

    expect(trackAddToCart(product, 2)).toBe(true);
    expect(ecommerce).toHaveBeenCalledWith('Product Added', expect.objectContaining({
      product_id: 'prod-1',
      name: 'Test Rice 1kg',
      price: 120,
      quantity: 2,
      currency: 'BDT',
      value: 240,
    }));
    expect(track).not.toHaveBeenCalled();
  });

  it('normalizes products to GA4 item parameters without personal data', () => {
    expect(toAnalyticsItem(cartItem)).toEqual({
      item_id: 'prod-1',
      item_name: 'Test Rice 1kg',
      item_category: 'Rice & Grain',
      item_variant: '1kg',
      price: 120,
      quantity: 2,
      index: undefined,
      item_list_id: undefined,
      item_list_name: undefined,
    });
  });

  it('sends a purchase exactly once per transaction in the session', () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');

    const purchase = {
      transactionId: 'LSO-123',
      items: [cartItem],
      value: 280,
      shipping: 40,
    };

    expect(trackPurchase(purchase)).toBe(true);
    expect(trackPurchase(purchase)).toBe(false);
    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith(
      'event',
      'purchase',
      expect.objectContaining({
        transaction_id: 'LSO-123',
        currency: 'BDT',
        value: 280,
        shipping: 40,
      }),
    );
  });

  it('sends only the selected payment type with payment information', () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');

    expect(trackAddPaymentInfo([cartItem], 280, 'bkash')).toBe(true);
    expect(window.gtag).toHaveBeenCalledWith(
      'event',
      'add_payment_info',
      expect.objectContaining({ payment_type: 'bkash', currency: 'BDT', value: 280 }),
    );
  });
});
