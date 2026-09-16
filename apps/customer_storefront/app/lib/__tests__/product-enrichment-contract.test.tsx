import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import {
  formatProductMetaTitle,
  formatProductMetaDescription,
} from '../../lib/products/productMetadata';
import {
  getEnrichedProductData,
  PRODUCT_ENRICHMENTS,
  PILOT_ENRICHED_PRODUCTS,
  EVIDENCE_SOURCES,
  type EvidenceSource,
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
      expect(offers.hasMerchantReturnPolicy.returnFees).toBeUndefined();
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

    it('normalizes legacy enrichment lookup inputs', () => {
      expect(getEnrichedProductData('  B8A7C6C6  ')).toBe(PRODUCT_ENRICHMENTS.b8a7c6c6);
      expect(getEnrichedProductData('legacy-b8a7c6c6-product')).toBe(PRODUCT_ENRICHMENTS.b8a7c6c6);
    });

    it('ensures all enriched items have complete, verified content contracts with referential integrity', () => {
      const enrichmentKeys = Object.keys(PRODUCT_ENRICHMENTS);
      expect(enrichmentKeys.length).toBeGreaterThanOrEqual(85);
      expect(PILOT_ENRICHED_PRODUCTS).toBe(PRODUCT_ENRICHMENTS);

      for (const key of enrichmentKeys) {
        const item = PRODUCT_ENRICHMENTS[key];
        expect(item.exactName).toBeTruthy();
        expect(item.brand).toBeTruthy();
        expect(item.netQuantity).toBeTruthy();
        expect(item.category).toBeTruthy();
        expect(item.summary).toBeTruthy();
        expect(item.specifications.length).toBeGreaterThanOrEqual(3);
        expect(item.faqs.length).toBeGreaterThanOrEqual(1);

        // 1. Normalized evidenceManifest validation
        expect(item.evidenceManifest).toBeDefined();
        const manifestKeys = Object.keys(item.evidenceManifest);
        expect(manifestKeys.length).toBeGreaterThanOrEqual(2);

        for (const mKey of manifestKeys) {
          const rec = item.evidenceManifest[mKey];
          expect(EVIDENCE_SOURCES).toContain(rec.source);
          expect(rec.evidenceRef).toBeTruthy();
          expect(rec.sourceTitle).toBeTruthy();
        }

        // 2. Referential integrity on ProductSpecification
        for (const spec of item.specifications) {
          expect(spec.label).toBeTruthy();
          expect(spec.value).toBeTruthy();
          expect(spec.evidenceRefs).toBeDefined();
          expect(spec.evidenceRefs.length).toBeGreaterThanOrEqual(1);
          for (const ref of spec.evidenceRefs) {
            expect(manifestKeys).toContain(ref);
          }
        }

        // 3. Referential integrity and mandatory evidence on ProductFaq
        for (const faq of item.faqs) {
          expect(faq.question).toBeTruthy();
          expect(faq.answer).toBeTruthy();
          expect(faq.evidenceRefs).toBeDefined();
          expect(faq.evidenceRefs.length).toBeGreaterThanOrEqual(1);
          for (const ref of faq.evidenceRefs) {
            expect(manifestKeys).toContain(ref);
          }
        }

        // 4. Referential integrity on fieldEvidence
        expect(item.fieldEvidence).toBeDefined();
        expect(item.fieldEvidence.exactName.length).toBeGreaterThanOrEqual(1);
        expect(item.fieldEvidence.brand.length).toBeGreaterThanOrEqual(1);
        expect(item.fieldEvidence.netQuantity.length).toBeGreaterThanOrEqual(1);
        expect(item.fieldEvidence.category.length).toBeGreaterThanOrEqual(1);
        expect(item.fieldEvidence.summary.length).toBeGreaterThanOrEqual(1);
        for (const ref of item.fieldEvidence.exactName) {
          expect(manifestKeys).toContain(ref);
        }
        for (const ref of item.fieldEvidence.brand) {
          expect(manifestKeys).toContain(ref);
        }
        for (const ref of item.fieldEvidence.netQuantity) {
          expect(manifestKeys).toContain(ref);
        }
        for (const ref of item.fieldEvidence.category) {
          expect(manifestKeys).toContain(ref);
        }
        for (const ref of item.fieldEvidence.summary) {
          expect(manifestKeys).toContain(ref);
        }
        if (item.fieldEvidence.usageDirections) {
          for (const ref of item.fieldEvidence.usageDirections) {
            expect(manifestKeys).toContain(ref);
          }
        }
        if (item.fieldEvidence.storageInstructions) {
          for (const ref of item.fieldEvidence.storageInstructions) {
            expect(manifestKeys).toContain(ref);
          }
        }
        if (item.fieldEvidence.highlights) {
          for (const group of item.fieldEvidence.highlights) {
            for (const ref of group) {
              expect(manifestKeys).toContain(ref);
            }
          }
        }
      }
    });

    it('verifies Nescafe Classic 90g Jar (ae09a3ef) evidence pack contract', () => {
      const nescafe = getEnrichedProductData('ae09a3ef');
      expect(nescafe).toBeDefined();
      expect(nescafe?.slugPrefix).toBe('ae09a3ef');
      expect(nescafe?.exactName).toBe('Nescafé Classic Instant Coffee 90g Jar');
      expect(nescafe?.brand).toBe('Nescafé');
      expect(nescafe?.netQuantity).toBe('90g');

      // Canonical slug resolution
      const fromSlug = getEnrichedProductData('nescafe-classic-90g-jar--ae09a3ef');
      expect(fromSlug).toBe(nescafe);

      // Identifier separation: ProductEnrichment MUST NOT contain gtin, mpn, or sku
      // Catalog data (items.barcode, items.sku) and PR #367 own identifier schema generation
      const nescafeRecord = nescafe as unknown as Record<string, unknown>;
      expect(nescafeRecord.gtin).toBeUndefined();
      expect(nescafeRecord.mpn).toBeUndefined();
      expect(nescafeRecord.sku).toBeUndefined();

      // Word count budget: strictly 40-220 words
      const wordCount = nescafe!.summary.trim().split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(40);
      expect(wordCount).toBeLessThanOrEqual(220);

      // Field-by-field verified claims (PACKAGING / LUCKY_STORE_POLICY)
      expect(nescafe?.summary).toContain('100% Pure Instant Coffee');
      expect(nescafe?.summary).toContain('Nestlé Bangladesh PLC');
      expect(nescafe?.summary).toContain('doorstep inspection');
      expect(nescafe?.usageDirections).toContain('1 teaspoon');
      expect(nescafe?.usageDirections).toContain('150ml');

      // Hard gate exclusions: no unverified varietal, roast, brewing temp, serving count calculations, or negative claims
      expect(nescafe?.summary).not.toContain('Robusta');
      expect(nescafe?.summary).not.toContain('medium-dark');
      expect(nescafe?.summary).not.toContain('80–85°C');
      expect(nescafe?.summary).not.toContain('richest crema');
      expect(nescafe?.summary).not.toContain('zero preservatives');
      expect(nescafe?.summary).not.toContain('50 to 60');
      expect(nescafe?.summary).not.toContain('serving estimate');

      // Specifications field-by-field verification (editorial only; SKU is not in enrichment)
      const specMap = new Map(nescafe?.specifications.map((s) => [s.label, s.value]));
      expect(specMap.has('Store SKU')).toBe(false);
      expect(specMap.has('Serving Estimate')).toBe(false);
      expect(specMap.get('Product Type')).toBe('100% Pure Soluble Coffee');
      expect(specMap.get('Marketer')).toBe('Nestlé Bangladesh PLC');
      expect(specMap.get('Packaging Form')).toBe('Glass Jar with Plastic Screw Cap & Inner Seal');
      expect(specMap.get('Preparation Guideline')).toBe('1 teaspoon in 150ml hot water');

      // FAQs cover verified packaging facts
      expect(nescafe?.faqs.some((f) => f.question.toLowerCase().includes('ingredient') && f.answer.includes('100% Pure Instant Coffee'))).toBe(true);
      expect(nescafe?.faqs.some((f) => f.question.toLowerCase().includes('preparation') && f.answer.includes('150ml'))).toBe(true);
      expect(nescafe?.faqs.some((f) => f.question.toLowerCase().includes('market') && f.answer.includes('Nestlé Bangladesh PLC'))).toBe(true);
    });

    it('verifies Ispahani Blender’s Choice and Mirzapore enrichments contract', () => {
      const ispahani200g = getEnrichedProductData('8058c111');
      expect(ispahani200g).toBeDefined();
      expect(ispahani200g?.brand).toBe('Ispahani');
      expect(ispahani200g?.netQuantity).toBe('200g');
      expect(ispahani200g?.summary).toContain('Ispahani Tea Ltd.');
      expect(ispahani200g?.summary).toContain('Chattogram');

      const ispahani400g = getEnrichedProductData('4d004a30');
      expect(ispahani400g).toBeDefined();
      expect(ispahani400g?.brand).toBe('Ispahani');
      expect(ispahani400g?.netQuantity).toBe('400g');

      const mirzapore50 = getEnrichedProductData('1dd3e411');
      expect(mirzapore50).toBeDefined();
      expect(mirzapore50?.brand).toBe('Ispahani');
      expect(mirzapore50?.netQuantity).toBe('50 Tea Bags');
    });

    it('verifies expanded Nescafe line (180g, 45g, 200g Pouch) contract', () => {
      const n180 = getEnrichedProductData('be803387');
      expect(n180).toBeDefined();
      expect(n180?.netQuantity).toBe('180g');
      expect(n180?.summary).toContain('Nestlé Bangladesh PLC');

      const n45 = getEnrichedProductData('6dbf8f0e');
      expect(n45).toBeDefined();
      expect(n45?.netQuantity).toBe('45g');

      const n200p = getEnrichedProductData('b8d96d50');
      expect(n200p).toBeDefined();
      expect(n200p?.netQuantity).toBe('200g');
      expect(n200p?.summary).toContain('refill pouch');
    });

    it('verifies Cohort 2 Cooking Essentials (Rupchanda, Radhuni, Maggi) contracts', () => {
      const rupchanda5L = getEnrichedProductData('b3e78fa4');
      expect(rupchanda5L).toBeDefined();
      expect(rupchanda5L?.brand).toBe('Rupchanda');
      expect(rupchanda5L?.netQuantity).toBe('5 Litres');
      expect(rupchanda5L?.summary).toContain('Bangladesh Edible Oil Limited');

      const rupchanda1L = getEnrichedProductData('b39aa5cc');
      expect(rupchanda1L).toBeDefined();
      expect(rupchanda1L?.brand).toBe('Rupchanda');
      expect(rupchanda1L?.netQuantity).toBe('1 Litre');

      const radhuniChilli = getEnrichedProductData('c0fe29c0');
      expect(radhuniChilli).toBeDefined();
      expect(radhuniChilli?.brand).toBe('Radhuni');
      expect(radhuniChilli?.netQuantity).toBe('100g');

      const radhuniJira = getEnrichedProductData('045df58d');
      expect(radhuniJira).toBeDefined();
      expect(radhuniJira?.brand).toBe('Radhuni');
      expect(radhuniJira?.netQuantity).toBe('100g');

      const maggiMagic = getEnrichedProductData('7d931484');
      expect(maggiMagic).toBeDefined();
      expect(maggiMagic?.brand).toBe('Maggi');
      expect(maggiMagic?.netQuantity).toBe('4g');
    });

    it('verifies Cohort 4 Noodles (Samyang Buldak lines) brand parsing and enrichments', () => {
      expect(brandParser.parse('Buldak Ramen Original')).toBe('Samyang');
      expect(brandParser.parse('Buldak Ramen 2x Spicy')).toBe('Samyang');
      expect(brandParser.parse('Buldak Ramen Cream Carbonara')).toBe('Samyang');

      const buldakOrig = getEnrichedProductData('8169739f');
      expect(buldakOrig).toBeDefined();
      expect(buldakOrig?.brand).toBe('Samyang');
      expect(buldakOrig?.netQuantity).toBe('140g');
      expect(buldakOrig?.summary).toContain('Samyang Foods Co., Ltd.');

      const buldak2x = getEnrichedProductData('f49fa080');
      expect(buldak2x).toBeDefined();
      expect(buldak2x?.brand).toBe('Samyang');
      expect(buldak2x?.netQuantity).toBe('140g');

      const buldakCarb = getEnrichedProductData('e04a2efd');
      expect(buldakCarb).toBeDefined();
      expect(buldakCarb?.brand).toBe('Samyang');
      expect(buldakCarb?.netQuantity).toBe('130g');
    });

    it('verifies Trident Pineapple Twist manufacturer evidence contract', () => {
      const trident = getEnrichedProductData('5b214258');
      expect(trident).toBeDefined();
      expect(trident?.exactName).toBe('Trident Pineapple Twist Sugar Free Gum 14 Pieces');
      expect(trident?.brand).toBe('Trident');
      expect(trident?.netQuantity).toBe('14 pieces');
      expect(trident?.summary).toContain('sweetened with xylitol');
      expect(trident?.specifications.find((s) => s.label === 'Allergen Declaration')?.value).toContain('soy');
      expect(trident?.evidenceManifest.MFR_PRODUCT_PAGE.sourceUrl).toBe(
        'https://www.tridentgum.com/products/trident-pineapple-twist-14-pieces',
      );
    });

    it('verifies Buldak Quattro Cheese and 2X Cup manufacturer evidence contracts', () => {
      const quattro = getEnrichedProductData('7fd83cfc');
      expect(quattro).toBeDefined();
      expect(quattro?.brand).toBe('Samyang');
      expect(quattro?.netQuantity).toBe('145g');
      expect(quattro?.summary).toContain('Gouda, Cheddar, Camembert, and Mozzarella');
      expect(quattro?.evidenceManifest.MFR_PRODUCT_PAGE.sourceUrl).toBe(
        'https://buldak.com/us/product/buldak-ramen-quattro-cheese/',
      );

      const cup = getEnrichedProductData('b79a6606');
      expect(cup).toBeDefined();
      expect(cup?.brand).toBe('Samyang');
      expect(cup?.netQuantity).toBe('70g');
      expect(cup?.specifications.find((s) => s.label === 'Calories')?.value).toBe('300 per 70g cup');
      expect(cup?.evidenceManifest.PACK_NUTRITION.evidenceRef).toContain('640mg sodium');
    });

    it('verifies additional Buldak cups and Rose pouch manufacturer evidence contracts', () => {
      const cheeseCup = getEnrichedProductData('0c815bf1');
      expect(cheeseCup).toBeDefined();
      expect(cheeseCup?.brand).toBe('Samyang');
      expect(cheeseCup?.netQuantity).toBe('70g');
      expect(cheeseCup?.summary).toContain('creamy cheese');
      expect(cheeseCup?.evidenceManifest.MFR_PRODUCT_PAGE.sourceUrl).toBe(
        'https://buldak.com/us/product/buldak-ramen-cheese-cup/',
      );

      const origCup = getEnrichedProductData('4bbb76d4');
      expect(origCup).toBeDefined();
      expect(origCup?.brand).toBe('Samyang');
      expect(origCup?.netQuantity).toBe('70g');
      expect(origCup?.evidenceManifest.MFR_PRODUCT_PAGE.sourceUrl).toBe(
        'https://buldak.com/us/product/buldak-ramen-original-cup/',
      );

      const rose = getEnrichedProductData('841b013d');
      expect(rose).toBeDefined();
      expect(rose?.brand).toBe('Samyang');
      expect(rose?.netQuantity).toBe('140g');
      expect(rose?.summary).toContain('gochujang');
      expect(rose?.evidenceManifest.MFR_PRODUCT_PAGE.sourceUrl).toBe(
        'https://buldak.com/us/product/buldak-ramen-rose/',
      );
    });

    it('verifies Polar Ice Cream cohort manufacturer evidence contracts', () => {
      const butterscotch = getEnrichedProductData('5830390b');
      expect(butterscotch).toBeDefined();
      expect(butterscotch?.brand).toBe('Polar');
      expect(butterscotch?.netQuantity).toBe('120 ml');
      expect(butterscotch?.specifications.find((s) => s.label === 'Energy')?.value).toBe('320.53 kcal per 100g');
      expect(butterscotch?.evidenceManifest.MFR_PRODUCT_PAGE.sourceUrl).toBe(
        'https://polarbd.com/en/product/cone-carnival-butterscotch/',
      );

      const vanillaCone = getEnrichedProductData('e8771528');
      expect(vanillaCone).toBeDefined();
      expect(vanillaCone?.brand).toBe('Polar');
      expect(vanillaCone?.netQuantity).toBe('120 ml');

      const chocobar = getEnrichedProductData('fc6d963a');
      expect(chocobar).toBeDefined();
      expect(chocobar?.brand).toBe('Polar');
      expect(chocobar?.netQuantity).toBe('72 ml');

      const coffee = getEnrichedProductData('2e948079');
      expect(coffee).toBeDefined();
      expect(coffee?.brand).toBe('Polar');
      expect(coffee?.netQuantity).toBe('1 Litre');

      const doi = getEnrichedProductData('54a7520e');
      expect(doi).toBeDefined();
      expect(doi?.brand).toBe('Polar');
      expect(doi?.summary).toContain('Doi');

      const robusto = getEnrichedProductData('2c367e44');
      expect(robusto).toBeDefined();
      expect(robusto?.brand).toBe('Polar');
      expect(robusto?.specifications.find((s) => s.label === 'Energy')?.value).toBe('301 kcal per piece');
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
