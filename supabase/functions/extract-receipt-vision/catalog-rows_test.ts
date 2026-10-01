import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { reconcileCatalogRows } from './catalog-rows.ts';

const purchased = { name: 'Cooking Oil', isPurchased: true, quantity: 2, unitPrice: 60, total: 120 };

Deno.test('an empty catalog detection cannot supply purchased rows', () => {
  assertEquals(reconcileCatalogRows([purchased], []), { items: [], reviewRequired: true });
});

Deno.test('catalog rows require agreement between detector and extractor', () => {
  const unmatched = { ...purchased, name: 'Other Product' };
  assertEquals(reconcileCatalogRows([purchased, unmatched], ['Cooking Oil']), {
    items: [purchased], reviewRequired: true,
  });
  assertEquals(reconcileCatalogRows([purchased], ['  COOKING   OIL ']), {
    items: [purchased], reviewRequired: false,
  });
});
