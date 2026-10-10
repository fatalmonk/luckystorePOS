import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getBrandByName, getBrandHref, POPULAR_BRANDS } from '../brandsData';

describe('Brand Hub & Link Resolution Contract', () => {
  it('resolves known brand by canonical name', () => {
    const ispahani = getBrandByName('Ispahani');
    expect(ispahani).toBeDefined();
    expect(ispahani?.slug).toBe('ispahani');

    const radhuni = getBrandByName('Radhuni');
    expect(radhuni).toBeDefined();
    expect(radhuni?.slug).toBe('radhuni');
  });

  it('resolves brand by aliases and Bengali names', () => {
    const fromAlias = getBrandByName("Blender's Choice");
    expect(fromAlias?.slug).toBe('ispahani');

    const fromBn = getBrandByName('ইস্পাহানি');
    expect(fromBn?.slug).toBe('ispahani');

    const aarongDairy = getBrandByName('Aarong Dairy');
    expect(aarongDairy?.slug).toBe('aarong');
  });

  it('resolves brand with multi-word company or supplier name via token match', () => {
    const fromSupplier = getBrandByName('Ispahani Tea Ltd.');
    expect(fromSupplier?.slug).toBe('ispahani');

    const fromSpiceSupplier = getBrandByName('Radhuni Spices & Foods');
    expect(fromSpiceSupplier?.slug).toBe('radhuni');

    const fromNZSupplier = getBrandByName('New Zealand Dairy Ltd');
    expect(fromNZSupplier?.slug).toBe('new-zealand-dairy');
  });

  it('leaves ambiguous corporate parent brand names unresolved', () => {
    // Unilever is not an alias on Dove/Lux/Sunsilk to avoid misattribution
    const unilever = getBrandByName('Unilever');
    expect(unilever).toBeUndefined();
    expect(getBrandHref('Unilever', 'en')).toBe('/brand');
  });

  it('generates correct brand href for English and Bengali locales', () => {
    expect(getBrandHref('Ispahani', 'en')).toBe('/brand/ispahani');
    expect(getBrandHref('Ispahani', 'bn')).toBe('/bn/brand/ispahani');
    expect(getBrandHref('Radhuni', 'en')).toBe('/brand/radhuni');
    expect(getBrandHref('Radhuni', 'bn')).toBe('/bn/brand/radhuni');
  });

  it('falls back to brands directory when brand is unknown or unspecified', () => {
    expect(getBrandHref('Unknown Brand', 'en')).toBe('/brand');
    expect(getBrandHref('Unknown Brand', 'bn')).toBe('/bn/brand');
    expect(getBrandHref(undefined, 'en')).toBe('/brand');
    expect(getBrandHref(undefined, 'bn')).toBe('/bn/brand');
  });

  it('contains popular brands array with slugs, valid logos, and metadata including sameAs entity backlinks', () => {
    expect(POPULAR_BRANDS.length).toBeGreaterThanOrEqual(12);
    const publicDir = path.resolve(__dirname, '../../../public');
    for (const b of POPULAR_BRANDS) {
      expect(b.slug).toBeTruthy();
      expect(b.name).toBeTruthy();
      expect(b.bengaliName).toBeTruthy();
      expect(b.titleEn).toBeTruthy();
      expect(b.logoUrl).toBeDefined();
      expect(b.logoUrl!).toMatch(/^\/images\/brands\/[a-z0-9_-]+\.webp$/);
      const logoPath = path.join(publicDir, b.logoUrl!.replace(/^\//, ''));
      expect(fs.existsSync(logoPath)).toBe(true);
      expect(b.sameAs).toBeDefined();
      expect(b.sameAs!.length).toBeGreaterThanOrEqual(1);
      for (const url of b.sameAs!) {
        expect(url.startsWith('https://')).toBe(true);
      }
    }
  });
});
