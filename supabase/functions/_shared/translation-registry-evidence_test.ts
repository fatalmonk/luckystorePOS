import { assertEquals } from 'https://deno.land/std@0.224.0/assert/assert_equals.ts';
import { resolveRegistryEvidence } from './translation-registry-evidence.ts';

Deno.test('uses the item description when the catalog name omits package size', () => {
  const result = resolveRegistryEvidence({
    id: '39fb96e9-8717-4b0b-b05a-cfd673cb7727',
    name: 'Igloo Shell & Core',
    description: 'Perfectly portioned at 58ml.',
    brand: 'Igloo',
  });

  assertEquals(result.matched, true);
  assertEquals(result.issue, null);
  assertEquals(result.links.length, 1);
});

Deno.test('parses fractional litres and tea-bag counts from descriptions', () => {
  const halfLiter = resolveRegistryEvidence({
    id: '1cbf6c50-1acc-4452-843f-f1207d0ddbdc',
    name: 'Igloo Strawberry (1/2 L)',
    description: 'This 500ml pack is smooth and creamy.',
    brand: 'Igloo',
  });
  const teaBags = resolveRegistryEvidence({
    id: '1602b5c7-b4cc-4a29-8f0c-992bdbff6aeb',
    name: 'Twinings Green Tea & lemon - 25 Bags',
    description: 'Each box contains 25 individually wrapped tea bags.',
    brand: 'Twinings',
  });

  assertEquals(halfLiter.matched, true);
  assertEquals(halfLiter.issue, null);
  assertEquals(halfLiter.links.length, 1);
  assertEquals(teaBags.matched, true);
  assertEquals(teaBags.links.length, 0);
  assertEquals(teaBags.missing[0], 'No product-specific manufacturer or packaging source link is available. Keep this item in draft.');
});

Deno.test('keeps LUX blocked until a product-specific manufacturer page is verified', () => {
  const result = resolveRegistryEvidence({
    id: '22cb1b54-6d27-42ed-95d9-df32f3709ec3',
    name: 'Lux Soap Velvet Touch 150g',
    description: 'Lux Velvet Touch Soap, 150g.',
    brand: 'Lux',
  });

  assertEquals(result.matched, true);
  assertEquals(result.links.length, 0);
  assertEquals(result.missing[0], 'No product-specific manufacturer or packaging source link is available. Keep this item in draft.');
  assertEquals(result.issue, null);
});

Deno.test('accepts shortened catalog names when the verified source and package size match', () => {
  const result = resolveRegistryEvidence({
    id: '2c367e44-91b4-4fcf-84a3-09e9dcecdbc7',
    name: 'Polar Robusto (Salted Caramel)',
    description: 'Polar Robusto Salted Caramel, 92 ml stick.',
    brand: 'Polar',
  });

  assertEquals(result.matched, true);
  assertEquals(result.issue, null);
  assertEquals(result.links.length, 1);
});

Deno.test('accepts an exact manufacturer page added for a missing-url record', () => {
  const result = resolveRegistryEvidence({
    id: '2254bebd-d1d3-46a9-98e6-56d8e94d887d',
    name: 'Igloo French Vanilla 1 L',
    description: 'This 1L tub is smooth and creamy.',
    brand: 'Igloo',
  });

  assertEquals(result.matched, true);
  assertEquals(result.issue, null);
  assertEquals(result.links.length, 1);
});

Deno.test('uses a verified supplement for a catalog item missing from the generated registry', () => {
  const result = resolveRegistryEvidence({
    id: '35fdd44a-0f43-49dc-aeeb-1899d0e05db9',
    name: 'Radhuni Biryani Masala 40g',
    description: 'Radhuni Biryani Masala 40g.',
    brand: 'Radhuni',
  });

  assertEquals(result.matched, true);
  assertEquals(result.issue, null);
  assertEquals(result.links.length, 1);
});

Deno.test('parses sheet-count packaging from a tissue-box name', () => {
  const result = resolveRegistryEvidence({
    id: '1d95d6ed-6ce1-4cb7-8d91-8aa65d83114f',
    name: 'Bashundhara Facial Tissue Box (100x2 Sheets)',
    description: 'Bashundhara facial tissue, 100x2 Sheets.',
    brand: 'Bashundhara',
  });

  assertEquals(result.matched, true);
  assertEquals(result.issue, null);
  assertEquals(result.links.length, 1);
});

Deno.test('accepts the verified Fortune mustard-oil source', () => {
  const result = resolveRegistryEvidence({
    id: '1465d07a-3dd8-4d56-9d0e-0f0e10ab00a0',
    name: 'Fortune Mustard Oil 1 L',
    description: 'Fortune mustard oil, 1 L bottle.',
    brand: 'Fortune',
  });

  assertEquals(result.matched, true);
  assertEquals(result.issue, null);
  assertEquals(result.links.length, 1);
});

Deno.test('uses the verified Dano Daily Pushti supplement', () => {
  const result = resolveRegistryEvidence({
    id: '1d87fe8d-8739-484f-acbc-f17235a15aa6',
    name: 'Dano Daily Pushti Milk Powder 1kg',
    description: 'Dano Daily Pushti milk powder, 1kg.',
    brand: 'Arla',
  });

  assertEquals(result.matched, true);
  assertEquals(result.issue, null);
  assertEquals(result.links.length, 1);
});
