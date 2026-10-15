import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ANALYTICS_CONSENT_KEY, rememberBuyingGuide, trackBuyingGuideView, trackAddToCart, trackBeginCheckout, trackPurchase } from '../analytics';
import type { CartItem } from '../types';
const product: CartItem = { id: 'test-product', name: 'Synthetic product', price: 30, qty: 1, stock: 1, unit: '150g', category: 'Test', description: '', emoji: '' };

describe('buying-guide attribution on existing analytics', () => {
  beforeEach(() => { vi.useRealTimers(); window.localStorage.clear(); window.sessionStorage.clear(); window.gtag = vi.fn(); delete window.zaraz; });
  it('neither stores nor tracks a guide without consent', () => {
    expect(trackBuyingGuideView('biscuits-bangladesh', 1)).toBe(false);
    expect(window.sessionStorage.length).toBe(0);
    expect(window.gtag).not.toHaveBeenCalled();
  });
  it('attaches guide context to existing commerce events without another purchase', () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
    trackBuyingGuideView('biscuits-bangladesh', 1);
    trackAddToCart(product);
    trackBeginCheckout([product], 30);
    trackPurchase({ transactionId: 'synthetic-order', items: [product], value: 30, shipping: 0 });
    trackPurchase({ transactionId: 'synthetic-order', items: [product], value: 30, shipping: 0 });
    for (const event of ['add_to_cart', 'begin_checkout', 'purchase']) expect(window.gtag).toHaveBeenCalledWith('event', event, expect.objectContaining({ buying_guide_slug: 'biscuits-bangladesh', buying_guide_revision: 1 }));
    expect(vi.mocked(window.gtag!).mock.calls.filter(c => c[1] === 'purchase')).toHaveLength(1);
  });
  it('retains the single Zaraz ecommerce path', () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
    const ecommerce = vi.fn(); window.zaraz = { ecommerce };
    rememberBuyingGuide('biscuits-bangladesh', 1);
    trackAddToCart(product);
    expect(ecommerce).toHaveBeenCalledWith('Product Added', expect.objectContaining({ buying_guide_slug: 'biscuits-bangladesh' }));
    expect(window.gtag).not.toHaveBeenCalled();
  });
  it('drops expired context and clears it after consent revocation', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-15T10:00:00Z'));
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted'); rememberBuyingGuide('biscuits-bangladesh', 1);
    vi.advanceTimersByTime(31 * 60 * 1000); trackAddToCart(product);
    expect(window.gtag).toHaveBeenLastCalledWith('event', 'add_to_cart', expect.not.objectContaining({ buying_guide_slug: expect.anything() }));
    rememberBuyingGuide('biscuits-bangladesh', 1); window.localStorage.removeItem(ANALYTICS_CONSENT_KEY); trackAddToCart(product);
    expect(window.sessionStorage.getItem('lucky-buying-guide')).toBeNull(); vi.useRealTimers();
  });
});
