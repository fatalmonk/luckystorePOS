import { describe, expect, it } from 'vitest';
import { getProductGalleryImages } from './productGalleryRegistry';

const R2_BASE = 'https://images.luckystore1947.com/products/polar';

describe('product gallery registry', () => {
  it('uses the verified studio and package views for Chocolate Cup hosted in R2', () => {
    expect(getProductGalleryImages('f6d581d5-0000-0000-0000-000000000000')).toEqual([
      {
        url: `${R2_BASE}/chocolate-cup.webp`,
        alt: 'Polar Chocolate Cup ice cream, 100 ml cup',
      },
      {
        url: `${R2_BASE}/chocolate-cup-front.webp`,
        alt: 'Polar Chocolate Cup ice cream, 100 ml package',
      },
      {
        url: `${R2_BASE}/chocolate-cup-back.webp`,
        alt: 'Polar Chocolate Cup ingredients and product information',
      },
      {
        url: `${R2_BASE}/chocolate-cup-side.webp`,
        alt: 'Polar Chocolate Cup packaging side view',
      },
    ]);
  });

  it('keeps Chocolate Cup studio and package views in one gallery', () => {
    expect(getProductGalleryImages('f6d581d5-0000-0000-0000-000000000000')).toHaveLength(4);
  });

  it('uses the 1/2L overlay image for Kheer and keeps Double Sundae unresolved', () => {
    expect(getProductGalleryImages('70a322a1-0000-0000-0000-000000000000')).toEqual([]);
    expect(getProductGalleryImages('79e0ece1-0000-0000-0000-000000000000')).toEqual([
      {
        url: `${R2_BASE}/kheer-500ml-1-2l.webp`,
        alt: 'Polar Kheer ice cream tub with a 1/2L size label',
      },
    ]);
    expect(getProductGalleryImages('aaaaaaaa-0000-0000-0000-000000000000')).toBeUndefined();
  });

  it('uses flavor-specific catalogue images for existing Polar product records', () => {
    expect(getProductGalleryImages('1ba3a780-0000-0000-0000-000000000000')?.[0]?.url)
      .toBe(`${R2_BASE}/carnival-hazelnut.webp`);
    expect(getProductGalleryImages('604e6bb0-0000-0000-0000-000000000000')?.[0]?.url)
      .toBe(`${R2_BASE}/ice-lolly-lemon.webp`);
    expect(getProductGalleryImages('2c367e44-0000-0000-0000-000000000000')?.[0]?.alt)
      .toContain('Salted Caramel');
    expect(getProductGalleryImages('aaaaaaaa-0000-0000-0000-000000000000')).toBeUndefined();
  });

  it('maps authentic front packshots and multi-view sets for Polar products', () => {
    // Mango Cup has authentic studio front packshot
    expect(getProductGalleryImages('236b5858-0000-0000-0000-000000000000')?.[0]?.url)
      .toBe(`${R2_BASE}/mango-cup-front.webp`);
    // Coffee 1L has hero front packshot
    expect(getProductGalleryImages('2e948079-0000-0000-0000-000000000000')?.[0]?.url)
      .toBe(`${R2_BASE}/coffee-tub-front.webp`);
    // Red Velvet 1L has hero front packshot
    expect(getProductGalleryImages('bc7de70f-0000-0000-0000-000000000000')?.[0]?.url)
      .toBe(`${R2_BASE}/red-velvet-tub-front.webp`);
    // Shell N Core, Shor Malai, Tornado Strawberry have 3-view sets (front, stick, duo)
    expect(getProductGalleryImages('fe31ca90-0000-0000-0000-000000000000')).toHaveLength(3);
    expect(getProductGalleryImages('fe31ca90-0000-0000-0000-000000000000')?.[0]?.url)
      .toBe(`${R2_BASE}/cool-shell-n-core-front.webp`);
    expect(getProductGalleryImages('2233c416-0000-0000-0000-000000000000')).toHaveLength(3);
    expect(getProductGalleryImages('2233c416-0000-0000-0000-000000000000')?.[0]?.url)
      .toBe(`${R2_BASE}/shor-malai-front.webp`);
    expect(getProductGalleryImages('fcefa591-0000-0000-0000-000000000000')).toHaveLength(3);
    expect(getProductGalleryImages('fcefa591-0000-0000-0000-000000000000')?.[0]?.url)
      .toBe(`${R2_BASE}/tornado-strawberry-front.webp`);
  });

  it('uses clean transparent tub images for 2 in 1 products', () => {
    expect(getProductGalleryImages('d6b58fa7-85ae-4934-8c81-4235c369fc63')).toEqual([
      {
        url: `${R2_BASE}/2-in-1-vanilla-chocolate-tub.webp`,
        alt: 'Polar 2 in 1 Vanilla-Chocolate ice cream tub, 1 liter',
      },
    ]);
    expect(getProductGalleryImages('cd267d71-9dfc-4cb0-9e45-1b03378b88d8')).toEqual([
      {
        url: `${R2_BASE}/2-in-1-vanilla-mango-tub.webp`,
        alt: 'Polar 2 in 1 Vanilla-Mango ice cream tub, 1 liter',
      },
    ]);
  });

  it('maps Vanilla 1/2L and Royal Sundae Cup curated packshots', () => {
    expect(getProductGalleryImages('eca88367-4d03-4562-b7e8-88ef2eea38c7')).toEqual([
      {
        url: `${R2_BASE}/IC-POL-VAN-500.png`,
        alt: 'Polar Tub Regular Vanilla ice cream tub, 1/2 liter (500 ml)',
        badge: '1/2 L',
      },
    ]);
    expect(getProductGalleryImages('d132ec9d-3175-440b-b1ac-d4cbfea8e55b')).toHaveLength(4);
    expect(getProductGalleryImages('d132ec9d-3175-440b-b1ac-d4cbfea8e55b')?.[0]?.url)
      .toBe(`${R2_BASE}/IC-POL-ROY-front.webp`);
  });
});
