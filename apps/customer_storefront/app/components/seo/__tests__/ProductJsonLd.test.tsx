import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ProductJsonLd } from '../ProductJsonLd';
import type { Product } from '../../../lib/products/types';
import { createProductId } from '../../../lib/products/types';

function createBaseProduct(overrides?: Partial<Product>): Product {
  return {
    id: createProductId('ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4'),
    name: 'Nescafe Classic 90g Jar',
    emoji: '☕',
    price: 475,
    unit: 'pc',
    category: 'Tea & Coffee',
    stock: 5,
    description: '100% pure instant coffee.',
    brand: 'Nestle',
    ...overrides,
  };
}

function extractJsonLd(container: HTMLElement): any {
  const script = container.querySelector('script[type="application/ld+json"]');
  if (!script || !script.textContent) return null;
  return JSON.parse(script.textContent);
}

describe('ProductJsonLd Identifier & GTIN Correctness Contract', () => {
  it('emits gtin13 property when barcode is a valid GTIN-13 with valid GS1 check digit', () => {
    // 8901058841114 is verified Nestlé Bangladesh Nescafe 90g EAN-13
    const product = createBaseProduct({ barcode: '8901058841114', sku: 'TC-NCF-GEN-90G' });
    const { container } = render(<ProductJsonLd product={product} />);
    const jsonLd = extractJsonLd(container);

    expect(jsonLd.gtin13).toBe('8901058841114');
    expect(jsonLd.gtin).toBeUndefined();
    expect(jsonLd.gtin8).toBeUndefined();
    expect(jsonLd.gtin12).toBeUndefined();
    expect(jsonLd.gtin14).toBeUndefined();
  });

  it('emits gtin12 property when barcode is a valid 12-digit UPC-A with valid check digit', () => {
    // 012345678905: valid GTIN-12
    const product = createBaseProduct({ barcode: '012345678905' });
    const { container } = render(<ProductJsonLd product={product} />);
    const jsonLd = extractJsonLd(container);

    expect(jsonLd.gtin12).toBe('012345678905');
    expect(jsonLd.gtin13).toBeUndefined();
  });

  it('emits gtin8 property when barcode is a valid 8-digit EAN-8 with valid check digit', () => {
    // 96385074: valid GTIN-8
    const product = createBaseProduct({ barcode: '96385074' });
    const { container } = render(<ProductJsonLd product={product} />);
    const jsonLd = extractJsonLd(container);

    expect(jsonLd.gtin8).toBe('96385074');
    expect(jsonLd.gtin13).toBeUndefined();
  });

  it('emits gtin14 property when barcode is a valid 14-digit ITF-14 with valid check digit', () => {
    // 10890105884110: valid GTIN-14 (check digit 0)
    const product = createBaseProduct({ barcode: '10890105884110' });
    const { container } = render(<ProductJsonLd product={product} />);
    const jsonLd = extractJsonLd(container);

    expect(jsonLd.gtin14).toBe('10890105884110');
    expect(jsonLd.gtin13).toBeUndefined();
  });

  it('rejects barcode when check digit is mathematically invalid', () => {
    // 8901058841119 has correct 13-digit length but invalid check digit (expected 4)
    const product = createBaseProduct({ barcode: '8901058841119' });
    const { container } = render(<ProductJsonLd product={product} />);
    const jsonLd = extractJsonLd(container);

    expect(jsonLd.gtin13).toBeUndefined();
    expect(jsonLd.gtin).toBeUndefined();
  });

  it('rejects arbitrary alphanumeric store barcode codes from any GTIN property', () => {
    // Lucky Store POS internal barcode format
    const product = createBaseProduct({ barcode: 'TC-NCF-GEN-90G', sku: 'TC-NCF-GEN-90G' });
    const { container } = render(<ProductJsonLd product={product} />);
    const jsonLd = extractJsonLd(container);

    expect(jsonLd.gtin).toBeUndefined();
    expect(jsonLd.gtin13).toBeUndefined();
    expect(jsonLd.gtin12).toBeUndefined();
    expect(jsonLd.gtin8).toBeUndefined();
    expect(jsonLd.gtin14).toBeUndefined();
  });

  it('omits all GTIN properties when product has no barcode', () => {
    const product = createBaseProduct({ barcode: undefined });
    const { container } = render(<ProductJsonLd product={product} />);
    const jsonLd = extractJsonLd(container);

    expect(jsonLd.gtin).toBeUndefined();
    expect(jsonLd.gtin13).toBeUndefined();
  });

  it('strictly isolates internal SKU to sku property and never emits mpn', () => {
    const product = createBaseProduct({
      sku: 'TC-NCF-GEN-90G',
      barcode: '8901058841114',
    });
    const { container } = render(<ProductJsonLd product={product} />);
    const jsonLd = extractJsonLd(container);

    // SKU is preserved
    expect(jsonLd.sku).toBe('TC-NCF-GEN-90G');
    // MPN is never synthesized
    expect(jsonLd.mpn).toBeUndefined();
    // GTIN is strictly the verified EAN-13, never the SKU
    expect(jsonLd.gtin13).toBe('8901058841114');
  });

  it('falls back to product.id for sku when product.sku is not set', () => {
    const product = createBaseProduct({ sku: undefined });
    const { container } = render(<ProductJsonLd product={product} />);
    const jsonLd = extractJsonLd(container);

    expect(jsonLd.sku).toBe('ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4');
    expect(jsonLd.mpn).toBeUndefined();
  });
});
