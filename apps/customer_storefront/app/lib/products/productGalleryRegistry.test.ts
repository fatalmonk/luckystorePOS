import { describe, expect, it } from 'vitest';
import { getProductGalleryImages } from './productGalleryRegistry';

describe('product gallery registry', () => {
  it('uses the verified local Chocolate Cup image', () => {
    expect(getProductGalleryImages('f6d581d5-0000-0000-0000-000000000000')).toEqual([
      {
        url: '/products/polar/chocolate-cup-front.webp',
        alt: 'Polar Chocolate Cup ice cream, 100 ml package',
      },
      {
        url: '/products/polar/chocolate-cup-back.webp',
        alt: 'Polar Chocolate Cup ingredients and product information',
      },
      {
        url: '/products/polar/chocolate-cup-side.webp',
        alt: 'Polar Chocolate Cup packaging side view',
      },
    ]);
  });

  it('distinguishes known broken source images from products with no curated entry', () => {
    expect(getProductGalleryImages('70a322a1-0000-0000-0000-000000000000')).toEqual([]);
    expect(getProductGalleryImages('79e0ece1-0000-0000-0000-000000000000')).toEqual([]);
    expect(getProductGalleryImages('aaaaaaaa-0000-0000-0000-000000000000')).toBeUndefined();
  });

  it('uses flavor-specific catalogue images for existing Polar product records', () => {
    expect(getProductGalleryImages('1ba3a780-0000-0000-0000-000000000000')?.[0]?.url)
      .toBe('/products/polar/carnival-hazelnut.webp');
    expect(getProductGalleryImages('604e6bb0-0000-0000-0000-000000000000')?.[0]?.url)
      .toBe('/products/polar/ice-lolly-lemon.webp');
    expect(getProductGalleryImages('2c367e44-0000-0000-0000-000000000000')?.[0]?.alt)
      .toContain('Salted Caramel');
    expect(getProductGalleryImages('aaaaaaaa-0000-0000-0000-000000000000')).toBeUndefined();
  });

  it('keeps Chocolate Cup package views in one gallery', () => {
    expect(getProductGalleryImages('f6d581d5-0000-0000-0000-000000000000')).toHaveLength(3);
  });
});
