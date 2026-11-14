import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { evidenceFallbackDraft } from './evidenceFallback.ts';
import { resolveRegistryEvidence } from '../_shared/translation-registry-evidence.ts';
const base = { id: '5361dd0a-258e-4fb8-aca8-869450ba7c6a', name: 'Samyang Buldak Ramen Original Cup 70g',
  sku: 'CANVA-TEST-4bbb76d4', brand: null, description: null };
Deno.test('exact manufacturer-backed Samyang Original has a nonempty Bengali description', () => {
  const draft = evidenceFallbackDraft(base);
  assertEquals(draft?.name, 'Samyang Buldak রামেন Original কাপ 70g');
  assertStringIncludes(draft?.description ?? '', 'উমামি');
});
Deno.test('exact manufacturer-backed Samyang 2X preserves variant and 70g', () => {
  const row = { ...base, id: '1aafa29f-07ca-4f04-a702-549c1720bd6a',
    name: 'Samyang Buldak Ramen 2X Cup 70g', sku: 'CANVA-TEST-b79a6606' };
  const draft = evidenceFallbackDraft(row);
  assertStringIncludes(draft?.name ?? '', '2X');
  assertStringIncludes(draft?.description ?? '', '70g');
});
Deno.test('products without verified templates do not receive fallback copy', () => {
  const rows = [
    { id:'29e60fea-429c-4b7d-b639-406471a6623b', name:'BelleAme Chocolate Digestive Biscuits 135g', sku:'CANVA-TEST-4d20b020',brand:'BelleAme' },
    { id:'7e9c8b3c-a299-47f7-950d-3866b9931ae2', name:'Chupa Chups Best of Lollipops (6Pcs Bundle) - 72g', sku:'CANVA-TEST-a73e0ab5',brand:null },
    { id:'58d3f6c1-5fb8-4328-814d-42d491ce2dd7', name:'Marks Powder 1000gm',sku:'CANVA-TEST-b8c7c186',brand:null },
  ];
  for (const row of rows) assertEquals(evidenceFallbackDraft({ ...row, description: null }), null);
});
Deno.test('a matching template with packaging-only evidence cannot produce a fallback', () => {
  const actual = resolveRegistryEvidence(base);
  assertEquals(actual.matched, true);
  assertEquals(Boolean(actual.supportedFacts), true);
  assertEquals(evidenceFallbackDraft(base, () => ({ ...actual, links: [], supportedFacts: null })), null);
  assertEquals(evidenceFallbackDraft(base, () => ({ ...actual, links: [] })), null);
});
Deno.test('variant, size and SKU substitution cannot use a verified template', () => {
  for (const row of [
    { ...base, name: 'Samyang Buldak Ramen 2X Cup 70g' },
    { ...base, name: 'Samyang Buldak Ramen Original Cup 140g' },
    { ...base, sku: 'CANVA-TEST-deadbeef' },
  ]) assertEquals(evidenceFallbackDraft(row), null);
});

Deno.test('manufacturer-backed fallback ignores unrelated numeric claims in English copy', () => {
  const enriched = { ...base, description: 'Imported summary with an unrelated claim about 40 percent.' };
  assertEquals(Boolean(evidenceFallbackDraft(enriched)?.description), true);
});
