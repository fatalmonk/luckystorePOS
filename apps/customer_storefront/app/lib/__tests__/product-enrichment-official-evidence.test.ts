import { describe, expect, it } from 'vitest';

import { PRODUCT_ENRICHMENTS } from '../products/productEnrichmentRegistry';

const expectedProducts = [
  {
    id: '16eece31',
    exactName: 'Avonee Pant-Style Baby Diaper, Large, 48 Pieces (9-14kg)',
    brand: 'Avonee',
    quantity: '48 pieces',
    sourceUrl: 'https://www.avonee.com/products',
  },
  {
    id: '4072b5b2',
    exactName: 'Bashundhara Gold Toilet Tissue',
    brand: 'Bashundhara Tissue',
    quantity: '212 sheets, 2 ply',
    sourceUrl: 'https://www.bashundharatissue.com/bashundhara-gold-toilet-tissue/',
  },
  {
    id: '454c2304',
    exactName: 'BelleAme Choco Little Cookies 240g',
    brand: 'BelleAme',
    quantity: '240g',
    sourceUrl: 'https://www.newzealanddairybd.com/brands/category/belleame-choco-little',
  },
  {
    id: '2fd8270d',
    exactName: 'BelleAme Peanut Bite Cookies 240g',
    brand: 'BelleAme',
    quantity: '240g',
    sourceUrl: 'https://www.newzealanddairybd.com/brands/category/belleame-peanut-bite',
  },
  {
    id: '94614080',
    exactName: 'Dano Daily Pushti 100g',
    brand: 'Dano',
    quantity: '100g',
    sourceUrl: 'https://www.arlafoods.com.bd/brands/dano/daily-pushti-100g/',
    verifiedAt: '2026-11-12',
  },
  {
    id: 'b9f7ef06',
    exactName: 'Dano Daily Pushti 500g',
    brand: 'Dano',
    quantity: '500g',
    sourceUrl: 'https://www.arlafoods.com.bd/brands/dano/daily-pushti-500g/',
    verifiedAt: '2026-11-12',
  },
  {
    id: 'b4e513b8',
    exactName: 'Dano Daily Pushti 200g',
    brand: 'Dano',
    quantity: '200g',
    sourceUrl: 'https://www.arlafoods.com.bd/brands/dano/daily-pushti-200g/',
    verifiedAt: '2026-11-12',
  },
  {
    id: 'bc8cac68',
    exactName: 'Dano Daily Pushti 50g',
    brand: 'Dano',
    quantity: '50g',
    sourceUrl: 'https://www.arlafoods.com.bd/brands/dano/daily-pushti-50g/',
    verifiedAt: '2026-11-12',
  },
  {
    id: 'a79ae214',
    exactName: 'Dano Delight Full Cream Milk Powder 200g',
    brand: 'Dano',
    quantity: '200g',
    sourceUrl: 'https://www.arlafoods.com.bd/brands/dano/delight-full-cream-milk-powder-200g/',
    verifiedAt: '2026-11-12',
  },
  {
    id: '31d78d91',
    exactName: 'Dano Delight Full Cream Milk Powder 500g',
    brand: 'Dano',
    quantity: '500g',
    sourceUrl: 'https://www.arlafoods.com.bd/brands/dano/delight-full-cream-milk-powder-500g/',
    verifiedAt: '2026-11-12',
  },
  {
    id: 'd5ea59ff',
    exactName: 'Dano Power Full Cream Milk Powder 200g',
    brand: 'Dano',
    quantity: '200g',
    sourceUrl: 'https://www.arlafoods.com.bd/brands/dano/power-200g/',
    verifiedAt: '2026-11-12',
  },
  {
    id: '8c09ecf8',
    exactName: 'Dano Power Full Cream Milk Powder 500g',
    brand: 'Dano',
    quantity: '500g',
    sourceUrl: 'https://www.arlafoods.com.bd/brands/dano/power-500g/',
    verifiedAt: '2026-11-12',
  },
] as const;

describe('official product evidence enrichment batch', () => {
  it.each(expectedProducts)('binds $id to exact official product evidence', (expected) => {
    const enrichment = PRODUCT_ENRICHMENTS[expected.id];

    expect(enrichment).toMatchObject({
      exactName: expected.exactName,
      brand: expected.brand,
      netQuantity: expected.quantity,
    });
    expect(enrichment.evidenceManifest.MFR_PRODUCT_PAGE).toMatchObject({
      source: 'MANUFACTURER',
      sourceUrl: expected.sourceUrl,
      verifiedAt: 'verifiedAt' in expected ? expected.verifiedAt : '2026-11-10',
    });
    expect(enrichment.evidenceManifest).not.toHaveProperty('PACK_FRONT');
    expect(enrichment.evidenceManifest).not.toHaveProperty('PACK_DESC');
    expect(enrichment.evidenceManifest).not.toHaveProperty('MFR_SPEC');
  });

  it.each(expectedProducts)('keeps $id local purchase copy and evidence explicit', ({ id }) => {
    const enrichment = PRODUCT_ENRICHMENTS[id];

    expect(enrichment.summary.length).toBeGreaterThanOrEqual(120);
    expect(enrichment.summary.length).toBeLessThanOrEqual(160);
    expect(enrichment.summary).toContain('1 km');
    expect(enrichment.summary).toContain('Chawkbazar, Chattogram');
    expect(enrichment.summary).toContain('100% doorstep inspection before payment');
    expect(enrichment.fieldEvidence.exactName).toEqual(['MFR_PRODUCT_PAGE']);
    expect(enrichment.fieldEvidence.brand).toEqual(['MFR_PRODUCT_PAGE']);
    expect(enrichment.fieldEvidence.netQuantity).toEqual(['MFR_PRODUCT_PAGE']);
    expect(enrichment.fieldEvidence.category).toEqual(['CATALOG_RECORD']);
    expect(enrichment.fieldEvidence.summary).toEqual([
      'MFR_PRODUCT_PAGE',
      'STORE_DELIVERY_POLICY',
      'STORE_INSPECTION_POLICY',
    ]);
  });

  it('publishes exact per-100g manufacturer nutrition without converting missing values to zero', () => {
    const expectedNutrition = {
      d5ea59ff: ['2070 kJ / 495 kcal', 'fat 26g', 'saturated fat 17g', 'carbohydrate 41g', 'protein 24g'],
      '8c09ecf8': ['2070 kJ / 495 kcal', 'fat 26g', 'saturated fat 17g', 'carbohydrate 41g', 'protein 24g'],
      b4e513b8: ['2090 kJ / 500 kcal', 'fat 28g', 'saturated fat 14g', 'carbohydrate 41g', 'sugars 5g', 'protein 22g'],
      bc8cac68: ['2090 kJ / 500 kcal', 'fat 28g', 'saturated fat 14g', 'carbohydrate 41g', 'sugars 5g', 'protein 22g'],
      b9f7ef06: ['2090 kJ / 500 kcal', 'fat 28g', 'saturated fat 14g', 'carbohydrate 41g', 'sugars 5g', 'protein 22g'],
      '94614080': ['2090 kJ / 500 kcal', 'fat 28g', 'saturated fat 14g', 'carbohydrate 41g', 'sugars 5g', 'protein 22g'],
      a79ae214: ['fat 28.4g', 'saturated fat 18.8g', 'carbohydrate 39g', 'protein 24g'],
      '31d78d91': ['2120 kJ / 510 kcal', 'fat 28.4g', 'saturated fat 18.8g', 'carbohydrate 39g', 'protein 24g'],
    } as const;

    for (const [id, facts] of Object.entries(expectedNutrition)) {
      const nutrition = PRODUCT_ENRICHMENTS[id].nutrition;
      expect(nutrition?.basis).toBe('Per 100 g');
      expect(nutrition?.sourceLabel).toBe('Source: Arla Foods Bangladesh');
      for (const fact of facts) expect(nutrition?.text?.toLowerCase()).toContain(fact);
      expect(nutrition?.text).toContain('not supplied');
      expect(nutrition?.text).not.toMatch(/(?:sugars|salt)\W*0(?:\.0+)?\s*g/i);
      expect(nutrition?.evidenceRefs).toEqual(['MFR_PRODUCT_PAGE']);
    }
  });

  it.each(['94614080', 'b4e513b8', 'bc8cac68', 'b9f7ef06'])('preserves Arla’s published Daily Pushti ingredients for %s', (id) => {
    expect(PRODUCT_ENRICHMENTS[id].specifications).toContainEqual({
      label: 'Ingredients',
      value: 'Milk [Skimmed milk, Butter Milk], Vegetable oil [Palm Oil], Sucrose, Calcium Carbonate, Soy lecithin, Vitamin A and D3',
      evidenceRefs: ['MFR_PRODUCT_PAGE'],
    });
  });

  it('corrects the Avonee identity and does not treat the child weight range as pack quantity', () => {
    const enrichment = PRODUCT_ENRICHMENTS['16eece31'];
    const serialized = JSON.stringify(enrichment);

    expect(enrichment.specifications).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Size', value: 'Large (L)' }),
      expect.objectContaining({ label: 'Recommended Weight Range', value: '9-14kg' }),
      expect.objectContaining({ label: 'Pack Count', value: '48 pieces' }),
    ]));
    expect(serialized).not.toContain('"brand":"Avon"');
    expect(serialized).not.toContain('14Kg consumer packaging');
    expect(serialized).not.toContain('up to 12 hours');
  });

  it('uses exact manufacturer tissue specifications rather than invented gram weights', () => {
    const enrichment = PRODUCT_ENRICHMENTS['4072b5b2'];

    expect(enrichment.specifications).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Material', value: 'Recycled pulp' }),
      expect.objectContaining({ label: 'Sheet Size', value: '114mm x 100mm' }),
      expect.objectContaining({ label: 'Format', value: '212 sheets x 2 ply' }),
    ]));
    expect(JSON.stringify(enrichment)).not.toContain('200g consumer packaging');
  });

  it('corrects BelleAme spelling and preserves source-scoped food claims', () => {
    const chocoLittle = PRODUCT_ENRICHMENTS['454c2304'];
    const peanutBite = PRODUCT_ENRICHMENTS['2fd8270d'];

    expect(chocoLittle.highlights).toContain('Officially listed 240g pack with liquid chocolate filling');
    expect(peanutBite.highlights).toContain('Officially listed 240g pack with whole roasted peanuts');
    expect(JSON.stringify([chocoLittle, peanutBite])).not.toContain('Bellame');
  });
});
