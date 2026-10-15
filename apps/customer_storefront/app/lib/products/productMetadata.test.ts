import { describe, expect, it } from 'vitest';
import { formatProductMetaDescription, formatProductMetaTitle } from './productMetadata';
import { getEnrichedProductData } from './productEnrichment';

describe('Product metadata identity', () => {
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
});
