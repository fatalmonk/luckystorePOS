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

Deno.test('accepts official Horlicks pack evidence from the manufacturer report', () => {
  const result = resolveRegistryEvidence({
    id: '0859c07d-8b3a-4c3f-8b8b-4f09c32ccf00',
    name: 'Standard Horlicks Jar 500 g',
    description: 'Standard Horlicks, 500 g jar.',
    brand: 'Horlicks',
  });

  assertEquals(result.matched, true);
  assertEquals(result.issue, null);
  assertEquals(result.links.length, 1);
});

Deno.test('accepts the official GlucoMax D 350 g pack evidence', () => {
  const result = resolveRegistryEvidence({
    id: '12621380-1811-4f22-a618-c57a3bed39eb',
    name: 'Glucose 350 g',
    description: 'GlucoMax D 350g powder drink mix.',
    brand: 'Glucose',
  });

  assertEquals(result.matched, true);
  assertEquals(result.issue, null);
  assertEquals(result.links.length, 1);
});

Deno.test('accepts the official Igloo Vanilla 1 L page', () => {
  const result = resolveRegistryEvidence({
    id: '141eec92-0000-4b00-9000-000000000000',
    name: 'Igloo Vanilla 1 L',
    description: 'Igloo Vanilla ice cream, 1 L tub.',
    brand: 'Igloo',
  });

  assertEquals(result.matched, true);
  assertEquals(result.issue, null);
  assertEquals(result.links.length, 1);
});

Deno.test('uses the official PRAN Jhal Chanachur 300 g supplement', () => {
  const result = resolveRegistryEvidence({
    id: '17765e14-8d69-42e0-bdb6-033b6e416a21',
    name: 'PRAN Jhal Chanachur 300g',
    description: 'Spicy snack, 300 gm pouch.',
    brand: 'Pran',
  });

  assertEquals(result.matched, true);
  assertEquals(result.issue, null);
  assertEquals(result.links.length, 1);
});

Deno.test('uses the official TEER Mustard Oil 500 ml supplement', () => {
  const result = resolveRegistryEvidence({
    id: '381b771f-c545-47e0-8eaa-51a4a1ec1642',
    name: 'Teer Pure Mustard Oil 500ml',
    description: 'TEER mustard oil, 500 ml consumer pack.',
    brand: 'Teer',
  });

  assertEquals(result.matched, true);
  assertEquals(result.issue, null);
  assertEquals(result.links.length, 1);
});

Deno.test('uses the official TEER Flour 1 kg supplement for catalog Maida', () => {
  const result = resolveRegistryEvidence({
    id: '3a4d95a3-a3aa-40ec-b262-52e83a720a9f',
    name: 'Teer Premium Maida 1kg',
    description: 'TEER Maida flour, 1 kg consumer pack.',
    brand: 'Teer',
  });

  assertEquals(result.matched, true);
  assertEquals(result.issue, null);
  assertEquals(result.links.length, 1);
});
Deno.test('uses the official MGI Super Fresh 2 L oil listing for the catalog bottle', () => {
  const result = resolveRegistryEvidence({
    id: '2c6eeb8d-1d5b-40a3-8e7f-8a8d7ac0c32e',
    name: 'Fresh Fortified Soybean Oil 2L (Bottle)',
    description: 'Fresh Fortified Soybean Oil, 2L bottle.',
    brand: 'Fresh',
  });
  assertEquals(result.matched, true);
  assertEquals(result.issue, null);
  assertEquals(result.links.length, 1);
});
Deno.test('uses the official MGI Super Fresh 5 L oil listing for the catalog can', () => {
  const result = resolveRegistryEvidence({
    id: '18f5d5f1-d41e-40a6-82da-fb29ff6af175',
    name: 'Fresh Fortified Soybean Oil 5L (Can)',
    description: 'Fresh Fortified Soybean Oil, 5L can.',
    brand: 'Fresh',
  });
  assertEquals(result.matched, true);
  assertEquals(result.issue, null);
  assertEquals(result.links.length, 1);
});
Deno.test('uses the official Dettol Liquid 500 ml product page', () => {
  const result = resolveRegistryEvidence({
    id: '2c4d2729-6237-4c73-ac59-e47a96508fd3',
    name: 'Dettol Antiseptic Liquid 500ml',
    description: 'Dettol antiseptic liquid, 500ml bottle.',
    brand: 'Dettol',
  });
  assertEquals(result.matched, true);
  assertEquals(result.issue, null);
  assertEquals(result.links.length, 1);
});
Deno.test('uses the official MGI newsletter for the Fresh 500 ml water SKU', () => {
  const result = resolveRegistryEvidence({
    id: '18eb3887-1421-4cb2-a7d5-2e9685f9f55d',
    name: 'Fresh Natural Drinking Water 500ml',
    description: 'Fresh Natural Drinking Water, 500ml bottle.',
    brand: 'Fresh',
  });
  assertEquals(result.matched, true);
  assertEquals(result.issue, null);
  assertEquals(result.links.length, 1);
});
