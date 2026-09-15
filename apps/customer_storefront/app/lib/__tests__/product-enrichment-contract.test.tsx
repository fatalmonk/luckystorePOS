import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import {
  formatProductMetaTitle,
  formatProductMetaDescription,
} from '../../lib/products/productMetadata';
import {
  getEnrichedProductData,
  PILOT_ENRICHED_PRODUCTS,
} from '../../lib/products/productEnrichment';
import { RuleBasedBrandParser } from '../../lib/products/parsers/BrandParser';
import { ProductJsonLd } from '../../components/seo/ProductJsonLd';
import { TrustStrip } from '../../components/product/TrustStrip';
import { createProductId } from '../../lib/products/types';
import type { Product } from '../../lib/products/types';

describe('Phase 4A: Product Page SEO and Content Enrichment Contract', () => {
  const brandParser = new RuleBasedBrandParser();

  describe('Brand Extraction for GSC-Demonstrated Queries', () => {
    it('extracts Fortune brand from oil names and aliases', () => {
      expect(brandParser.parse('Fortune Kachi Ghani Mustard Oil 5L')).toBe('Fortune');
      expect(brandParser.parse('fortune mustard oil')).toBe('Fortune');
    });

    it('extracts Radhuni brand from spices', () => {
      expect(brandParser.parse('Radhuni Holud Gura 100gm')).toBe('Radhuni');
      expect(brandParser.parse('Radhuni Dhoniya Gura 500gm')).toBe('Radhuni');
    });

    it('extracts Bellame brand from biscuits', () => {
      expect(brandParser.parse('Bellame Chocolate Digestive Biscuits 135g')).toBe('Bellame');
      expect(brandParser.parse('bellame digestive')).toBe('Bellame');
    });

    it('extracts Ama brand from instant coffee', () => {
      expect(brandParser.parse('Ama Classic Instant Coffee Sachet 1g')).toBe('Ama');
      expect(brandParser.parse('ama classic coffee')).toBe('Ama');
    });

    it('extracts Aril brand from confectionery', () => {
      expect(brandParser.parse('Aril Assorted Fruit Lollipops')).toBe('Aril');
      expect(brandParser.parse('aril lollipop')).toBe('Aril');
    });

    it('extracts Polar brand from ice cream', () => {
      expect(brandParser.parse('Polar Double Sundae Ice Cream 1L')).toBe('Polar');
    });
  });

  describe('Search Snippet & Metadata Formatting Contract', () => {
    it('formats title within SERP display limit (<= 60 chars) for diverse product names', () => {
      const titles = [
        formatProductMetaTitle('Fortune Kachi Ghani Mustard Oil 5L', 1150),
        formatProductMetaTitle('Radhuni Turmeric 100g', 65),
        formatProductMetaTitle('Ama Classic Instant Coffee Sachet 1g', 10),
        formatProductMetaTitle('A Very Long Name For A Premium Imported Organic Sunflower Oil 5000ml Bottle', 1800),
      ];

      for (const title of titles) {
        expect(title.length).toBeLessThanOrEqual(60);
        expect(title).toMatch(/Lucky Store|৳/);
      }
    });

    it('formats description between 120 and 160 chars strictly adhering to verified store policies', () => {
      const descriptions = [
        formatProductMetaDescription('Fortune Kachi Ghani Mustard Oil 5L', 1150),
        formatProductMetaDescription('Radhuni Holud Gura 100g', 65),
        formatProductMetaDescription('Ama Classic Coffee 1g', 10),
        formatProductMetaDescription('Aril Assorted Lollipops', 10),
        formatProductMetaDescription('A Very Long Product Name Exceeding Standard Single Line Constraints In Full Display', 250),
      ];

      for (const desc of descriptions) {
        expect(desc.length).toBeGreaterThanOrEqual(120);
        expect(desc.length).toBeLessThanOrEqual(160);
        // Strict policy adherence: Chattogram, 1 km, ৳500+, doorstep inspection
        expect(desc).toContain('Chattogram');
        expect(desc).toContain('1 km');
        expect(desc).toContain('৳500+');
        expect(desc).toContain('doorstep inspection');
        // Reject generic unsupported fluff
        expect(desc).not.toMatch(/fast home delivery/i);
        expect(desc).not.toMatch(/cheapest/i);
        expect(desc).not.toMatch(/guaranteed #1/i);
      }
    });
  });

  describe('Structured Data Schema Parity & Brand Protection', () => {
    it('omits brand property when product brand is unknown and NEVER defaults to Lucky Store', () => {
      const unbrandedProduct: Product = {
        id: createProductId('unbranded-test-item-123'),
        name: 'Fresh Local Potato',
        emoji: '🥔',
        price: 45,
        unit: '1 kg',
        category: 'fresh-produce',
        stock: 50,
        description: 'Fresh local potatoes from market',
      };

      const { container } = render(<ProductJsonLd product={unbrandedProduct} />);
      const script = container.querySelector('script[type="application/ld+json"]');
      expect(script).not.toBeNull();

      const json = JSON.parse(script!.textContent || '{}');
      expect(json['@type']).toBe('Product');
      expect(json.name).toBe('Fresh Local Potato');
      // Critical Master Plan rule: Never fall back to 'Lucky Store' as brand
      expect(json.brand).toBeUndefined();
    });

    it('correctly includes verified brand when present', () => {
      const brandedProduct: Product = {
        id: createProductId('fortune-oil-test-item-123'),
        name: 'Fortune Kachi Ghani Mustard Oil 5L',
        brand: 'Fortune',
        emoji: '🛢️',
        price: 1150,
        unit: '5 L',
        category: 'oil-and-ghee',
        stock: 12,
        description: 'Cold-pressed pure mustard oil',
      };

      const { container } = render(<ProductJsonLd product={brandedProduct} />);
      const script = container.querySelector('script[type="application/ld+json"]');
      const json = JSON.parse(script!.textContent || '{}');

      expect(json.brand).toBeDefined();
      expect(json.brand['@type']).toBe('Brand');
      expect(json.brand.name).toBe('Fortune');
    });

    it('emits valid shippingDetails and hasMerchantReturnPolicy matching store delivery policies', () => {
      const product: Product = {
        id: createProductId('radhuni-test-item-123'),
        name: 'Radhuni Holud Gura 100g',
        brand: 'Radhuni',
        emoji: '🧂',
        price: 65,
        unit: '100g',
        category: 'cooking-essentials',
        stock: 30,
        description: '100% pure turmeric powder',
      };

      const { container } = render(<ProductJsonLd product={product} />);
      const script = container.querySelector('script[type="application/ld+json"]');
      const json = JSON.parse(script!.textContent || '{}');

      const offers = json.offers;
      expect(offers).toBeDefined();
      expect(offers.priceCurrency).toBe('BDT');
      expect(offers.price).toBe(65);
      expect(offers.availability).toBe('https://schema.org/InStock');

      // Shipping details validation
      expect(offers.shippingDetails).toBeDefined();
      expect(offers.shippingDetails['@type']).toBe('OfferShippingDetails');
      expect(offers.shippingDetails.shippingRate.shippingRate.value).toBe('40');
      expect(offers.shippingDetails.shippingRate.freeShippingThreshold.price).toBe('500');

      // Return policy validation
      expect(offers.hasMerchantReturnPolicy).toBeDefined();
      expect(offers.hasMerchantReturnPolicy['@type']).toBe('MerchantReturnPolicy');
      expect(offers.hasMerchantReturnPolicy.description).toContain('doorstep inspection');
      expect(offers.hasMerchantReturnPolicy.returnFees).toBe('https://schema.org/FreeReturn');
    });
  });

  describe('Product Enrichment Registry', () => {
    it('returns enrichment data by 8-character UUID prefix', () => {
      const fortune = getEnrichedProductData('b8a7c6c6');
      expect(fortune).toBeDefined();
      expect(fortune?.brand).toBe('Fortune');
      expect(fortune?.netQuantity).toBe('5 Litres');
      expect(fortune?.specifications.length).toBeGreaterThan(3);
      expect(fortune?.faqs.length).toBeGreaterThan(0);
    });

    it('returns enrichment data from full slug containing the prefix', () => {
      const radhuni = getEnrichedProductData('radhuni-holud-gura-100gm--029b62d8');
      expect(radhuni).toBeDefined();
      expect(radhuni?.brand).toBe('Radhuni');
      expect(radhuni?.netQuantity).toBe('100g');
    });

    it('ensures all pilot items have complete, verified content contracts', () => {
      const pilotKeys = Object.keys(PILOT_ENRICHED_PRODUCTS);
      expect(pilotKeys.length).toBeGreaterThanOrEqual(7);

      for (const key of pilotKeys) {
        const item = PILOT_ENRICHED_PRODUCTS[key];
        expect(item.exactName).toBeTruthy();
        expect(item.brand).toBeTruthy();
        expect(item.netQuantity).toBeTruthy();
        expect(item.category).toBeTruthy();
        expect(item.summary).toBeTruthy();
        expect(item.specifications.length).toBeGreaterThanOrEqual(3);
        expect(item.faqs.length).toBeGreaterThanOrEqual(1);

        // Verify FAQs contain factual answers without fluff
        for (const faq of item.faqs) {
          expect(faq.question).toBeTruthy();
          expect(faq.answer).toBeTruthy();
        }
      }
    });
  });

  describe('TrustStrip Reassurance & Internal Linking', () => {
    it('renders active link to /delivery with policy thresholds and doorstep inspection', () => {
      const { container } = render(<TrustStrip />);
      const links = container.querySelectorAll('a[href="/delivery"]');
      expect(links.length).toBeGreaterThanOrEqual(1);

      const text = container.textContent || '';
      expect(text).toContain('Free delivery ৳500+');
      expect(text).toContain('Cash on delivery');
      expect(text).toContain('Doorstep inspection');
    });
  });
});
