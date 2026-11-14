import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { allowedOrigin, canGenerate, parseBatch, validRequest, validateDraft } from './validation.ts';

const source = { id: '10000000-0000-4000-8000-000000000001', name: 'Ispahani Tea 500 g', description: 'Tea leaves, 500 g.', brand: 'Ispahani' };
const valid = { id: source.id, name: 'Ispahani চা 500 g', description: 'চা পাতা, 500 g।', search_terms: ['চা'] };

Deno.test('accepts a bounded Bengali draft and retains canonical search alias', () => {
  assertEquals(validateDraft(source, valid).draft?.search_terms.includes(source.name), true);
});
Deno.test('rejects altered identity, quantities, brand and invented description', () => {
  for (const row of [
    { ...valid, id: 'other' }, { ...valid, name: 'Ispahani চা 250 g' },
    { ...valid, name: 'চা 500 g' }, { ...valid, description: 'চা পাতা, 500 g এবং 2 প্যাক।' },
  ]) assertEquals(Boolean(validateDraft(source, row).error), true);
  assertEquals(Boolean(validateDraft({ ...source, description: null }, { ...valid, description: 'নতুন বিবরণ' }).error), true);
});
Deno.test('rejects duplicate, missing and unexpected model entities', () => {
  for (const translations of [[valid, valid], [], [{ ...valid, id: 'other' }]]) {
    assertEquals(Boolean(parseBatch(JSON.stringify({ translations }), [source]).get(source.id)?.error), true);
  }
  assertEquals(Boolean(parseBatch('invalid', [source]).get(source.id)?.error), true);
});
Deno.test('rejects unauthorized origins, roles, tenants and oversized batches', () => {
  assertEquals(allowedOrigin('https://evil.example'), false);
  assertEquals(allowedOrigin('https://admin.luckystore1947.com.evil.example'), false);
  assertEquals(canGenerate('staff', 'tenant-a', 'tenant-a'), false);
  assertEquals(canGenerate('manager', 'tenant-a', 'tenant-b'), false);
  assertEquals(validRequest('item', 11), false);
  assertEquals(validRequest('category', 10), true);
  assertEquals(Boolean(validateDraft(source, { ...valid, claims: ['unverified'] }).error), true);
});
