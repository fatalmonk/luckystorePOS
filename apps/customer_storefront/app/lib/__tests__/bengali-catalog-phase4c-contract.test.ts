// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isProductSitemapEligible } from '../../sitemap';
import {
  ANALYTICS_CONSENT_KEY,
  trackPurchase,
  trackAddToCart,
  trackViewItem,
  trackBeginCheckout,
} from '../analytics';
import type { CartItem, Product } from '../types';

const mockProduct: Product = {
  id: 'prod-4c-1' as any,
  name: 'Radhuni Turmeric 100g',
  emoji: '🧂',
  price: 65,
  unit: '100g',
  category: 'daily-bazaar',
  stock: 25,
  description: 'Pure turmeric powder for everyday cooking.',
};

const mockCartItem: CartItem = {
  ...mockProduct,
  qty: 2,
};

describe('Phase 4C: Bengali Catalog Data & Routing Contract Tests', () => {
  describe('Sitemap Qualification & Translation Gate', () => {
    it('validates product sitemap eligibility correctly', () => {
      expect(
        isProductSitemapEligible({
          id: 'test-uuid-1',
          name: 'Radhuni Turmeric 100g',
          price: 65,
          is_active: true,
        }),
      ).toBe(true);

      expect(
        isProductSitemapEligible({
          id: 'test-uuid-2',
          name: '',
          price: 65,
          is_active: true,
        }),
      ).toBe(false);

      expect(
        isProductSitemapEligible({
          id: 'test-uuid-3',
          name: 'Invalid Price Item',
          price: 0,
          is_active: true,
        }),
      ).toBe(false);

      expect(
        isProductSitemapEligible({
          id: 'test-uuid-4',
          name: 'Inactive Item',
          price: 100,
          is_active: false,
        }),
      ).toBe(false);
    });
  });

  describe('Locale Telemetry Contract', () => {
    beforeEach(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
      window.gtag = vi.fn();
      delete (window as any).zaraz;
    });

    it('emits locale parameter in purchase events', () => {
      trackPurchase({
        transactionId: 'TXN-BN-9988',
        items: [mockCartItem],
        value: 130,
        shipping: 0,
        locale: 'bn',
      });

      expect(window.gtag).toHaveBeenCalledWith(
        'event',
        'purchase',
        expect.objectContaining({
          locale: 'bn',
          transaction_id: 'TXN-BN-9988',
          currency: 'BDT',
          value: 130,
          shipping: 0,
          items: [
            expect.objectContaining({
              item_id: 'prod-4c-1',
              item_name: 'Radhuni Turmeric 100g',
              price: 65,
              quantity: 2,
            }),
          ],
        }),
      );
    });

    it('emits locale in view_item and add_to_cart events', () => {
      trackViewItem(mockProduct, { locale: 'bn' });
      expect(window.gtag).toHaveBeenCalledWith(
        'event',
        'view_item',
        expect.objectContaining({
          locale: 'bn',
          currency: 'BDT',
          value: 65,
          items: [
            expect.objectContaining({
              item_id: 'prod-4c-1',
              price: 65,
            }),
          ],
        }),
      );

      trackAddToCart(mockProduct, 3, { locale: 'bn' });
      expect(window.gtag).toHaveBeenCalledWith(
        'event',
        'add_to_cart',
        expect.objectContaining({
          locale: 'bn',
          currency: 'BDT',
          value: 195,
          items: [
            expect.objectContaining({
              item_id: 'prod-4c-1',
              quantity: 3,
            }),
          ],
        }),
      );
    });

    it('emits locale in begin_checkout events', () => {
      trackBeginCheckout([mockCartItem], 130, { locale: 'bn' });
      expect(window.gtag).toHaveBeenCalledWith(
        'event',
        'begin_checkout',
        expect.objectContaining({
          locale: 'bn',
          currency: 'BDT',
          value: 130,
          items: [
            expect.objectContaining({
              item_id: 'prod-4c-1',
              quantity: 2,
            }),
          ],
        }),
      );
    });
  });
});
