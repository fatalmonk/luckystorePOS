import { describe, expect, it } from 'vitest';
import {
  calculateVerifiedPriceGap,
  classifyCompetitorProductMatch,
  resolveProductMatchStatus,
} from './productMatching';

const catalog = (overrides: Record<string, unknown> = {}) => ({
  name: 'Acme Laundry Powder 1kg Original',
  brand: 'Acme',
  barcode: null,
  ...overrides,
});

describe('conservative competitor product matching', () => {
  it('does not let stale metadata override a rejected matcher result', () => {
    expect(resolveProductMatchStatus(
      'safe-v2:REJECTED:attribute-conflict',
      { match_status: 'VERIFIED' },
      'item-1',
      'scraper',
    )).toBe('REJECTED');
  });

  it('verifies identical valid GTINs when product attributes do not conflict', () => {
    expect(classifyCompetitorProductMatch(
      { name: 'Acme Laundry Powder 1kg Original', brand: 'Acme', barcode: '4006381333931' },
      catalog({ barcode: '4006381333931' }),
    ).status).toBe('VERIFIED');
  });

  it('verifies an exact brand, product family, variant and normalized size', () => {
    expect(classifyCompetitorProductMatch(
      { name: 'Acme Laundry Powder 1000g Original', brand: 'Acme' },
      catalog(),
    ).status).toBe('VERIFIED');
  });

  it('does not treat the first word of a scraped title as verified brand evidence', () => {
    expect(classifyCompetitorProductMatch(
      { name: 'Acme Laundry Powder 1kg Original' },
      catalog(),
    ).status).toBe('PROBABLE');
  });

  it('normalizes equivalent units within the same measurement dimension', () => {
    expect(classifyCompetitorProductMatch(
      { name: 'Acme Laundry Powder 1kg Original', brand: 'Acme' },
      catalog({ name: 'Acme Laundry Powder 1000g Original' }),
    ).status).toBe('VERIFIED');
  });

  it('rejects different package sizes', () => {
    expect(classifyCompetitorProductMatch(
      { name: 'Acme Laundry Powder 500g Original', brand: 'Acme' },
      catalog(),
    ).status).toBe('REJECTED');
  });

  it('rejects different measurement dimensions', () => {
    expect(classifyCompetitorProductMatch(
      { name: 'Acme Laundry Powder 1L Original', brand: 'Acme' },
      catalog(),
    ).status).toBe('REJECTED');
  });

  it('rejects single items compared with multipacks', () => {
    expect(classifyCompetitorProductMatch(
      { name: 'Acme Laundry Powder 2 x 1kg Original', brand: 'Acme' },
      catalog(),
    ).status).toBe('REJECTED');
  });

  it('rejects reversed quantity-first multipack notation', () => {
    expect(classifyCompetitorProductMatch(
      { name: 'Acme Laundry Powder 500g x 2 Original', brand: 'Acme' },
      { name: 'Acme Laundry Powder 500g Original', brand: 'Acme' },
    ).status).toBe('REJECTED');
  });

  it('rejects conflicting product variants', () => {
    expect(classifyCompetitorProductMatch(
      { name: 'Acme Laundry Powder 1kg Lemon', brand: 'Acme' },
      catalog(),
    ).status).toBe('REJECTED');
  });

  it('does not let a product-family word mask a later conflicting variant', () => {
    expect(classifyCompetitorProductMatch(
      { name: 'Acme Chocolate Mint 500g', brand: 'Acme' },
      { name: 'Acme Chocolate Original 500g', brand: 'Acme' },
    ).status).toBe('REJECTED');
  });

  it('allows a previously verified mapping when the observation omits a variant qualifier', () => {
    expect(classifyCompetitorProductMatch(
      { name: 'Acme Chocolate' },
      { name: 'Acme Chocolate Original 500g', brand: 'Acme' },
      { previouslyVerified: true },
    ).status).toBe('VERIFIED');
  });

  it('marks missing package quantity as ambiguous without independent identity evidence', () => {
    expect(classifyCompetitorProductMatch(
      { name: 'Acme Laundry Powder Original', brand: 'Acme' },
      catalog(),
    ).status).toBe('AMBIGUOUS');
  });

  it('marks similar but insufficiently specific product names as ambiguous', () => {
    expect(classifyCompetitorProductMatch(
      { name: 'Acme Powder 1kg', brand: 'Acme' },
      catalog(),
    ).status).toBe('AMBIGUOUS');
  });

  it('marks compatible but non-identical product names as probable', () => {
    expect(classifyCompetitorProductMatch(
      { name: 'Acme Laundry Powder Washing Machine Detergent 1kg Original', brand: 'Acme' },
      { name: 'Acme Laundry Powder Washing Machine 1kg Original', brand: 'Acme' },
    ).status).toBe('PROBABLE');
  });

  it('rejects an exact barcode when package attributes conflict', () => {
    expect(classifyCompetitorProductMatch(
      { name: 'Acme Laundry Powder 500g Original', brand: 'Acme', barcode: '4006381333931' },
      catalog({ barcode: '4006381333931' }),
    ).status).toBe('REJECTED');
  });

  it('preserves a previously verified mapping when optional quantity data is absent', () => {
    expect(classifyCompetitorProductMatch(
      { name: 'Acme Laundry Powder Original', brand: 'Acme' },
      catalog(),
      { previouslyVerified: true },
    ).status).toBe('VERIFIED');
  });

  it('allows only VERIFIED matches to produce actionable price gaps', () => {
    expect(calculateVerifiedPriceGap('VERIFIED', 945, 1300)).toBeCloseTo(-0.2730769, 6);
    expect(calculateVerifiedPriceGap('PROBABLE', 945, 1300)).toBeNull();
    expect(calculateVerifiedPriceGap('AMBIGUOUS', 945, 1300)).toBeNull();
    expect(calculateVerifiedPriceGap('REJECTED', 945, 1300)).toBeNull();
  });
});
