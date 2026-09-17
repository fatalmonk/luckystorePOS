import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { metadata } from '../../delivery/page';
import {
  DELIVERY_POLICY,
  DELIVERY_FAQS,
  COVERED_AREAS,
  getDeliveryShippingServiceSchema,
  getDeliveryServiceSchema,
  getDeliveryFaqSchema,
  getDeliveryBreadcrumbSchema,
} from '../../delivery/deliveryData';
import { middleware } from '../../../middleware';
import { GET as getMarkdown } from '../../api/markdown/route';

// Mock Supabase in middleware / repo
vi.mock('../../supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  },
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('../../lib/supabase/middleware', () => ({
  updateSession: vi.fn().mockResolvedValue({
    headers: new Headers(),
  }),
}));

describe('Phase 4: Authoritative Chattogram Delivery Hub Contract', () => {
  describe('Page Metadata & Canonical Hygiene', () => {
    it('provides optimized title within SERP display length (<= 60 chars)', () => {
      const title = String(metadata.title);
      expect(title).toBe('Grocery & Daily Bazaar Delivery in Chattogram | Lucky Store');
      expect(title.length).toBeLessThanOrEqual(60);
      expect(title.length).toBeGreaterThanOrEqual(40);
    });

    it('derives meta description containing core policy thresholds within 120-160 chars', () => {
      const desc = String(metadata.description);
      expect(desc).toContain(`${DELIVERY_POLICY.radiusKm} km of Chawkbazar`);
      expect(desc).toContain(`৳${DELIVERY_POLICY.freeDeliveryThresholdBdt}+`);
      expect(desc.length).toBeGreaterThanOrEqual(120);
      expect(desc.length).toBeLessThanOrEqual(160);
    });

    it('emits absolute self-canonical targeting configured canonical URL', () => {
      expect(metadata.alternates?.canonical).toBe(DELIVERY_POLICY.canonicalUrl);
    });

    it('derives matching OpenGraph and Twitter metadata', () => {
      const og = metadata.openGraph as any;
      expect(og?.url).toBe(DELIVERY_POLICY.canonicalUrl);
      expect(og?.type).toBe('website');
      expect(og?.locale).toBe('en_BD');

      const tw = metadata.twitter as any;
      expect(tw?.card).toBe('summary_large_image');
    });
  });

  describe('Operational Policy & Time Language Precision', () => {
    it('explicitly specifies delivery hours as 09:00 AM–12:30 AM daily without misleading (Midnight) wording', () => {
      expect(DELIVERY_POLICY.deliveryHours.display).toBe('09:00 AM–12:30 AM daily');
      expect(DELIVERY_POLICY.deliveryHours.start).toBe('09:00 AM');
      expect(DELIVERY_POLICY.deliveryHours.end).toBe('12:30 AM');

      // Reject (Midnight) after 12:30 AM across policy definitions and FAQ text
      const allPolicyText = JSON.stringify({ DELIVERY_POLICY, DELIVERY_FAQS });
      expect(allPolicyText).not.toMatch(/12:30\s*AM\s*\(Midnight\)/i);
      expect(allPolicyText).not.toContain('Midnight is 12:30');
    });

    it('clearly labels hours as delivery hours rather than store hours', () => {
      expect(DELIVERY_POLICY.deliveryHours.scheduleType).toMatch(/delivery hours/i);
      const timingFaq = DELIVERY_FAQS.find((f) => f.question.includes('delivery hours'));
      expect(timingFaq).toBeDefined();
      expect(timingFaq?.answer).toMatch(/delivery hours/i);
    });

    it('strictly confines coverage to the 1 km GeoCircle and qualifies neighborhood parts', () => {
      const coverageFaq = DELIVERY_FAQS.find((f) => f.question.includes('areas'));
      expect(coverageFaq?.answer).toContain(DELIVERY_POLICY.radiusLabel);
      expect(coverageFaq?.answer).toContain('Portions outside the 1 km GeoCircle are not covered');

      // Verify each covered area is qualified as parts or vicinity within 1 km
      for (const area of COVERED_AREAS) {
        expect(area.desc).toMatch(/1 km radius|storefront hub/i);
        expect(area.name).toMatch(/nearby|accessible|vicinity/i);
      }
    });

    it('enforces single-source fees and payment channels', () => {
      const feeFaq = DELIVERY_FAQS.find((f) => f.question.includes('charges'));
      expect(feeFaq?.answer).toContain(`৳${DELIVERY_POLICY.freeDeliveryThresholdBdt}`);
      expect(feeFaq?.answer).toContain(`৳${DELIVERY_POLICY.standardDeliveryFeeBdt}`);

      const paymentFaq = DELIVERY_FAQS.find((f) => f.question.includes('payment'));
      expect(paymentFaq?.answer).toContain(DELIVERY_POLICY.paymentMethods.cod);
      expect(paymentFaq?.answer).toContain(DELIVERY_POLICY.paymentMethods.bkash);
    });

    it('rejects unsupported promotional claims and speed guarantees', () => {
      const combinedText = JSON.stringify(DELIVERY_FAQS);
      expect(combinedText).not.toMatch(/10-minute|15-minute|instant delivery|fastest delivery/i);
      expect(combinedText).not.toMatch(/all over bangladesh|nationwide/i);
      expect(combinedText).not.toMatch(/unbeatable price|lowest price guaranteed/i);
    });
  });

  describe('Schema.org Precision & Validity', () => {
    it('models the basket-dependent standard policy through ShippingService conditions', () => {
      const service = getDeliveryShippingServiceSchema();
      expect(service['@type']).toBe('ShippingService');
      expect(service['@id']).toBe(`${DELIVERY_POLICY.canonicalUrl}#shipping-service`);
      expect(service.shippingConditions).toHaveLength(2);
      expect(service.shippingConditions[0].orderValue.maxValue).toBe(499);
      expect(service.shippingConditions[0].shippingRate.value).toBe(40);
      expect(service.shippingConditions[1].orderValue.minValue).toBe(500);
      expect(service.shippingConditions[1].shippingRate.value).toBe(0);
      expect(service.shippingConditions.every((condition) => condition.shippingRate['@type'] === 'MonetaryAmount')).toBe(true);
      expect(service.shippingConditions.every((condition) => condition.shippingDestination.addressCountry === 'BD')).toBe(true);
      expect(service.shippingConditions.every((condition) => condition.shippingDestination.postalCode === '4203')).toBe(true);
      expect(service.shippingConditions.every((condition) => condition.transitTime.duration.maxValue === 0)).toBe(true);
      expect(JSON.stringify(service)).not.toContain('OfferShippingDetails');
    });

    it('produces valid DeliveryService schema representing provider, 1 km GeoCircle, and delivery hours', () => {
      const schema = getDeliveryServiceSchema();
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('DeliveryService');
      expect(schema['@id']).toBe(`${DELIVERY_POLICY.canonicalUrl}#delivery-service`);

      // Provider
      expect(schema.provider['@type']).toBe('GroceryStore');
      expect(schema.provider['@id']).toBe('https://www.luckystore1947.com/#grocerystore');

      // GeoCircle areaServed
      expect(schema.areaServed['@type']).toBe('GeoCircle');
      expect(schema.areaServed.geoRadius).toBe(String(DELIVERY_POLICY.radiusMeters));
      expect(schema.areaServed.geoMidpoint['@type']).toBe('GeoCoordinates');
      expect(schema.areaServed.geoMidpoint.latitude).toBe(DELIVERY_POLICY.hubCoordinates.latitude);
      expect(schema.areaServed.geoMidpoint.longitude).toBe(DELIVERY_POLICY.hubCoordinates.longitude);

      // Delivery opening hours specification
      expect(schema.hoursAvailable['@type']).toBe('OpeningHoursSpecification');
      expect(schema.hoursAvailable.opens).toBe('09:00');
      expect(schema.hoursAvailable.closes).toBe('00:30');
    });

    it('produces valid FAQPage and BreadcrumbList schemas', () => {
      const faqSchema = getDeliveryFaqSchema();
      expect(faqSchema['@type']).toBe('FAQPage');
      expect(faqSchema.mainEntity.length).toBe(DELIVERY_FAQS.length);

      const breadcrumbSchema = getDeliveryBreadcrumbSchema();
      expect(breadcrumbSchema['@type']).toBe('BreadcrumbList');
      expect(breadcrumbSchema.itemListElement[1].item).toBe(DELIVERY_POLICY.canonicalUrl);
    });
  });

  describe('Middleware Canonical 308 Consolidation', () => {
    it('redirects /delivery/chattogram permanently to /delivery with HTTP 308', async () => {
      const req = new NextRequest('https://www.luckystore1947.com/delivery/chattogram');
      const res = await middleware(req);
      expect(res.status).toBe(308);
      expect(res.headers.get('location')).toBe('https://www.luckystore1947.com/delivery');
    });

    it('redirects trailing-slash /delivery/ permanently to /delivery with HTTP 308', async () => {
      const req = new NextRequest('https://www.luckystore1947.com/delivery/');
      const res = await middleware(req);
      expect(res.status).toBe(308);
      expect(res.headers.get('location')).toBe('https://www.luckystore1947.com/delivery');
    });

    it('preserves query parameters on 308 redirect from /delivery/chattogram', async () => {
      const req = new NextRequest('https://www.luckystore1947.com/delivery/chattogram?utm_source=facebook&campaign=chattogram');
      const res = await middleware(req);
      expect(res.status).toBe(308);
      expect(res.headers.get('location')).toBe('https://www.luckystore1947.com/delivery?utm_source=facebook&campaign=chattogram');
    });
  });

  describe('Markdown-for-Agents Content Negotiation', () => {
    it('renders structured markdown for /delivery consuming central operational constants', async () => {
      const req = new NextRequest('https://www.luckystore1947.com/api/markdown?path=/delivery');
      const res = await getMarkdown(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/markdown');

      const text = await res.text();
      expect(text).toContain('# Online Grocery & Daily Bazaar Delivery in Chattogram');
      expect(text).toContain(DELIVERY_POLICY.hubAddress);
      expect(text).toContain(`${DELIVERY_POLICY.radiusMeters} m GeoCircle`);
      expect(text).toContain(`৳${DELIVERY_POLICY.freeDeliveryThresholdBdt}`);
      expect(text).toContain(`৳${DELIVERY_POLICY.standardDeliveryFeeBdt}`);
      expect(text).toContain(DELIVERY_POLICY.deliveryHours.display);
      expect(text).not.toMatch(/12:30\s*AM\s*\(Midnight\)/i);
      expect(text).toContain(DELIVERY_POLICY.paymentMethods.bkashNumber);
    });
  });
});
