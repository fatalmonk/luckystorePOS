import { describe, expect, it } from 'vitest';
import {
  buildProductMetaKeywords,
  buildProductMetadata,
  formatProductMetaDescription,
  formatProductMetaTitle,
} from './productMetadata';
import { getEnrichedProductData } from './productEnrichment';

describe('Product metadata identity', () => {
  it.each([
    ['e8771528', 'Polar Carnival Vanilla Cone Ice Cream 120ml'],
    ['6df59696', 'Polar Carnival Strawberry Cone Ice Cream 120ml'],
    ['94c748e3', 'Polar Vanilla 1 Liter'],
    ['eca88367', 'Polar Tub Regular Vanilla 1/2 Liter'],
    ['236b5858', 'Polar Mango Cup'],
    ['39d85f5f', 'Polar Chocolate Premium Cup'],
    ['d6b58fa7', 'Polar 2 in 1 Vanilla-Chocolate 1 Liter'],
    ['cd267d71', 'Polar 2 in 1 Vanilla-Mango 1 Liter'],
    ['eae60c9b', 'Polar Choco Bar Chocolate'],
    ['f6d581d5', 'Polar Chocolate Cup'],
    ['0fa0e76e', 'Polar Essora Banana'],
    ['0aa0a385', 'Polar Essora Mixed Berry'],
    ['46bd4ccc', 'Polar Ice Lolly Orange 62ml'],
    ['c00f9f4b', 'Polar Robusto Chocolate 92ml'],
    ['0611e651', 'Polar Robusto Vanilla 92ml'],
    ['38befb1a', 'Polar Tornado Green Apple 55ml'],
    ['93930edd', 'Polar Tornado Mango 55ml'],
  ])('uses the approved identity for Polar record %s', (id, expectedName) => {
    expect(getEnrichedProductData(id)?.exactName).toBe(expectedName);
  });

  it.each([
    ['fc6d963a', 'Polar Chocobar Vanilla Ice Cream 72ml'],
    ['604e6bb0', 'Polar Ice Lolly Lemon 62ml'],
    ['2c367e44', 'Polar Robusto Salted Caramel Ice Cream 92ml'],
    ['fcefa591', 'Polar Tornado Strawberry Ice Cream Stick 55ml'],
  ])('keeps existing variant-specific enrichment for %s without creating sibling products', (id, expectedName) => {
    expect(getEnrichedProductData(id)?.exactName).toBe(expectedName);
  });

  it('removes the old Vanilla claims from the Carnival Strawberry enrichment', () => {
    const item = getEnrichedProductData('6df59696')!;
    expect(item.summary).toContain('Strawberry');
    expect(item.summary).not.toContain('vanilla');
    expect(item.specifications).toContainEqual(expect.objectContaining({ label: 'Energy', value: '326.34 kcal per 100g' }));
  });

  it('uses the confirmed half-liter quantity and a storefront badge with authentic 500ml packshot', () => {
    const item = getEnrichedProductData('eca88367')!;
    expect(item.netQuantity).toBe('500 ml');
    expect(item.specifications).toContainEqual(expect.objectContaining({ label: 'Net Quantity', value: '500 ml (1/2 L)' }));
    expect(item.galleryImages?.[0]).toMatchObject({ badge: '1/2 L', alt: 'Polar Vanilla 1/2 Liter tub packaging' });
    expect(item.galleryImages?.[0]?.url).toContain('IC-POL-VAN-500.png');
    expect(item.highlights?.join(' ')).not.toContain('2 L consumer packaging');
  });

  it('creates product-specific search and social metadata with canonical alternatives and chosen images', () => {
    const metadata = buildProductMetadata({
      name: 'Polar Chocolate Cup',
      price: 30,
      unit: 'pc',
      description: 'Polar Chocolate Cup 100 ml from Lucky Store.',
      canonicalUrl: 'https://www.luckystore1947.com/product/polar-chocolate-cup--f6d581d5',
      imageUrl: '/products/polar/chocolate-cup-front.webp',
      images: [{ url: '/products/polar/chocolate-cup-front.webp', alt: 'Chocolate cup package' }],
      brand: 'Polar',
      category: 'Ice-Cream',
    });

    expect(metadata.title).toEqual({ absolute: expect.stringContaining('Polar Chocolate Cup') });
    expect(metadata.description).toBe('Polar Chocolate Cup 100 ml from Lucky Store.');
    expect(metadata.keywords).toEqual(expect.arrayContaining(['Polar Chocolate Cup', 'Polar ice cream', 'Ice-Cream']));
    expect(metadata.alternates).toMatchObject({
      canonical: 'https://www.luckystore1947.com/product/polar-chocolate-cup--f6d581d5',
      languages: {
        'en-BD': 'https://www.luckystore1947.com/product/polar-chocolate-cup--f6d581d5',
        'bn-BD': 'https://www.luckystore1947.com/bn/product/polar-chocolate-cup--f6d581d5',
      },
    });
    expect(metadata.openGraph).toMatchObject({
      type: 'website',
      url: 'https://www.luckystore1947.com/product/polar-chocolate-cup--f6d581d5',
      images: [{ url: '/products/polar/chocolate-cup-front.webp', alt: 'Chocolate cup package' }],
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      images: ['/products/polar/chocolate-cup-front.webp'],
    });
    expect(buildProductMetaKeywords('Polar Chocolate Cup', 'Polar', 'Ice-Cream')).toHaveLength(6);
  });

  it.each(['029b62d8', 'bdcf65f2'])('keeps the full %s product identity before delivery prose', (id) => {
    const item = getEnrichedProductData(id)!;
    const description = formatProductMetaDescription(item.exactName, 83, 'pc');
    expect(description).toContain(item.exactName);
    expect(description).toContain('৳83');
    expect(description.length).toBeLessThanOrEqual(160);
    expect(formatProductMetaTitle(item.exactName, 83)).toContain('৳83');
    expect(formatProductMetaTitle(item.exactName, 83)).toContain(item.exactName);
  });

  it('preserves complete meaningful sentences from the long turmeric enrichment', () => {
    const item = getEnrichedProductData('029b62d8')!;
    const description = formatProductMetaDescription(item.exactName, 83, 'pc', item.summary);
    expect(description).toContain('Turmeric Powder');
    expect(description).toContain('100g pouch.');
    expect(description).toContain('Produced in Bangladesh');
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it('preserves short complete enriched copy without padding', () => {
    const item = getEnrichedProductData('bdcf65f2')!;
    expect(formatProductMetaDescription(item.exactName, 83, 'pc', item.summary)).toBe(item.summary);
  });

  it('does not replace identity with a generic enriched summary', () => {
    expect(formatProductMetaDescription('Radhuni Jira Gura 50gm', 83, 'pc', 'Shop groceries in Chattogram.')).toContain('Radhuni Jira Gura 50gm');
  });

  it('bounds extreme names while retaining their ending pack size and live price', () => {
    const description = formatProductMetaDescription(`Radhuni ${'premium spice '.repeat(30)}100g`, 83, 'pc');
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description).toContain('Radhuni');
    expect(description).toContain('100g');
    expect(description).toContain('৳83');
    expect(description).toContain('…');
  });

  it.each([
    ['5830390b', 'Polar Carnival Butterscotch Cone Ice Cream 120ml', 33],
    ['6df59696', 'Polar Carnival Strawberry Cone Ice Cream 120ml', 56],
    ['e8771528', 'Polar Carnival Vanilla Cone Ice Cream 120ml', 56],
  ])('retains Lucky Store brand suffix for Polar Carnival title %s', (id, name, price) => {
    const title = formatProductMetaTitle(name, price);
    expect(title).toContain('| Lucky Store');
    expect(title).toContain(name);
    expect(title.length).toBeLessThanOrEqual(68);
  });

  it('augments short excerpt descriptions from long enrichments with Lucky Store delivery policy', () => {
    const item = getEnrichedProductData('8f7ce150')!; // Polar Crunchy (Sentence 1 is only 45 chars)
    const description = formatProductMetaDescription(item.exactName, 45, 'pc', item.summary);
    expect(description).toContain('Polar Crunchy');
    expect(description).toContain('Free delivery on ৳500+');
    expect(description.length).toBeGreaterThanOrEqual(110);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it('strictly bounds titles to <= 60 characters when long price and unit leaves little room', () => {
    // Suffix: "… – ৳150,000/24x1000ml bulk case | Lucky Store" -> leaves < 5 chars for name
    const longName = 'Radhuni Pure Premium Spice Blend Extra Hot';
    const title = formatProductMetaTitle(longName, 150000, '24x1000ml bulk case');
    expect(title.length).toBeLessThanOrEqual(60);
  });
});


