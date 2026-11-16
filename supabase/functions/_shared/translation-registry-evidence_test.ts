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

Deno.test('accepts the verified Unilever LUX source for exact catalog sizes', () => {
  const result = resolveRegistryEvidence({
    id: '22cb1b54-6d27-42ed-95d9-df32f3709ec3',
    name: 'Lux Soap Velvet Touch 150g',
    description: 'Lux Velvet Touch Soap, 150g.',
    brand: 'Lux',
  });

  assertEquals(result.matched, true);
  assertEquals(result.links.length, 1);
  assertEquals(result.issue, null);
});
