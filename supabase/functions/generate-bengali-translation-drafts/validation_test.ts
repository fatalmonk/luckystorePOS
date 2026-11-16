import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { allowedOrigin, bengaliNameRetrySources, boundedGenerationLimit, canGenerate, parseBatch, validRequest, validateDraft } from './validation.ts';

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

Deno.test('preserves canonical BelleAme brand and protected variants', () => {
  const s = { id: source.id, name: 'BelleAme Chocolate Biscuits Original 135g', brand: 'BelleAme', description: null };
  const row = { id: s.id, name: 'BelleAme চকলেট বিস্কুট Original 135g', description: null, search_terms: [] };
  assertEquals(Boolean(validateDraft(s, row).draft), true);
  assertEquals(Boolean(validateDraft(s, { ...row, name: row.name.replace('BelleAme', 'Bellame') }).error), true);
  assertEquals(Boolean(validateDraft(s, { ...row, name: row.name.replace('Original', 'অরিজিনাল') }).error), true);
});

Deno.test('unit alternatives preserve lb, litres and gm instead of prefix matching', () => {
  const onePound = { ...source, name: 'Ispahani Tea 1 lb', description: null };
  const validPound = { ...valid, name: 'Ispahani চা 1 lb', description: null };
  assertEquals(Boolean(validateDraft(onePound, validPound).draft), true);
  assertEquals(Boolean(validateDraft(onePound, { ...validPound, name: 'Ispahani চা 1 l' }).error), true);
  assertEquals(Boolean(validateDraft({ ...onePound, name: 'Ispahani Tea 1 gm' }, { ...validPound, name: 'Ispahani চা 1 g' }).draft), true);
});
Deno.test('Bengali-digit quantities are normalized and unsupported quantities rejected', () => {
  const canonical = { ...source, description: null };
  const approved = { ...valid, description: null, name: 'Ispahani চা ৫০০ গ্রাম' };
  assertEquals(Boolean(validateDraft(canonical, approved).draft), true);
  assertEquals(Boolean(validateDraft(canonical, { ...approved, name: 'Ispahani চা ৭৫০ গ্রাম' }).error), true);
  const factSource = { ...canonical, evidenceDescription: 'Pack size 500 g' };
  assertEquals(Boolean(validateDraft(factSource, { ...valid, name: approved.name,
    description: 'প্যাকেট ৭৫০ গ্রাম' }).error), true);
});
Deno.test('empty or missing canonical descriptions cannot authorize unsupported copy', () => {
  assertEquals(Boolean(validateDraft({ ...source, description: '' }, valid).error), true);
  assertEquals(Boolean(validateDraft({ ...source, description: 'Tea leaves, 500 g.' },
    { ...valid, description: null }).error), true);
  assertEquals(Boolean(validateDraft({ ...source, description: null },
    { ...valid, description: null }).draft), true);
});
Deno.test('Bengali package synonyms preserve quantities but reject changes', () => {
  for (const [english, bengali] of [['6 pcs', '৬ পিস'], ['2 pack', '২ প্যাক']]) {
    const product = { ...source, name: `Ispahani Tea ${english}`, description: null };
    const row = { ...valid, name: `Ispahani চা ${bengali}`, description: null };
    assertEquals(Boolean(validateDraft(product, row).draft), true);
    assertEquals(Boolean(validateDraft(product, { ...row, name: row.name.replace('২', '৩').replace('৬', '৭') }).error), true);
  }
  assertEquals(Boolean(validateDraft({ ...source, name: 'Ispahani Tea 2 pack', description: null },
    { ...valid, name: 'Ispahani চা ২ প্যাকেট', description: null }).error), true);
});
Deno.test('manufacturer evidence cannot authorize a description absent from the catalog', () => {
  const product = { ...source, description: null, evidenceDescription: 'Pack size: 500 g' };
  assertEquals(Boolean(validateDraft(product, { ...valid, description: null }).draft), true);
  assertEquals(validateDraft(product, { ...valid, description: 'চা পাতা, 500 g।' }).error, 'Description lacks canonical source text');
});

Deno.test('safe fenced JSON is accepted but unrelated prose is rejected', () => {
  const content = '```json\n' + JSON.stringify({ translations: [valid] }) + '\n```';
  assertEquals(Boolean(parseBatch(content, [source]).get(source.id)?.draft), true);
  assertEquals(Boolean(parseBatch('Here is JSON ' + JSON.stringify({translations:[valid]}), [source]).get(source.id)?.error), true);
});
Deno.test('partial batch preserves valid product but flags missing and duplicates separately', () => {
  const second = { ...source, id: '10000000-0000-4000-8000-000000000002',
    name: 'Ispahani Tea 250 g', description: 'Tea leaves, 250 g.' };
  const third = { ...source, id: '10000000-0000-4000-8000-000000000003',
    name: 'Ispahani Tea 150 g', description: 'Tea leaves, 150 g.' };
  const response = parseBatch(JSON.stringify({ translations:[valid, { ...valid, id: third.id }, { ...valid, id: third.id }] }), [source, second, third]);
  assertEquals(Boolean(response.get(source.id)?.draft), true);
  assertEquals(Boolean(response.get(second.id)?.error), true);
  assertEquals(Boolean(response.get(third.id)?.error), true);
});
Deno.test('malformed product cannot replace a different product even if output count matches', () => {
  const second = { ...source, id: '10000000-0000-4000-8000-000000000002' };
  const response = parseBatch(JSON.stringify({translations:[{...valid,id:'unknown'},valid]}),[source,second]);
  assertEquals(Boolean(response.get(source.id)?.draft),true);
  assertEquals(Boolean(response.get(second.id)?.error),true);
});

Deno.test('server caps generations at ten rows per request', () => {
  assertEquals(boundedGenerationLimit(20), 10);
  assertEquals(boundedGenerationLimit(10), 10);
  assertEquals(boundedGenerationLimit(1), 1);
});


Deno.test('English-only names and names with only Bengali digits are rejected as missing Bengali letters', () => {
  const variants = ['Ispahani Tea 500 g', 'Ispahani Tea ৫০০ g'];
  for (const name of variants) {
    assertEquals(
      validateDraft(source, { ...valid, name }).error,
      'Bengali product name missing Bengali letters',
    );
  }
  assertEquals(validateDraft(source, valid).draft?.id, source.id);
});

Deno.test('retry selection isolates Bengali-letter failures without weakening other guards', () => {
  const second = { ...source, id: '10000000-0000-4000-8000-000000000002' };
  const third = { ...source, id: '10000000-0000-4000-8000-000000000003' };
  const rows = new Map([
    [source.id, { error: 'Bengali product name missing Bengali letters' }],
    [second.id, { error: 'Numeric or package identity changed' }],
    [third.id, { error: 'Description contains unverified claims' }],
  ]);
  assertEquals(bengaliNameRetrySources([source, second, third], rows).map(s => s.id), [source.id]);
  assertEquals(bengaliNameRetrySources([source, second, third], new Map()), []);
});


Deno.test('name-only correction never retries a row that also violates a protected check', () => {
  const nameOnly = { ...valid, name: source.name };
  const cases: Array<{ label: string; source: typeof source; row: typeof valid; expected: string }> = [
    { label: 'number', source, row: { ...nameOnly, name: 'Ispahani Tea 250 g' }, expected: 'Numeric or package identity changed' },
    { label: 'brand', source, row: { ...nameOnly, name: 'Tea 500 g', description: 'চা পাতা, 500 g।' }, expected: 'Brand was not preserved' },
    { label: 'search aliases', source, row: { ...nameOnly, search_terms: [''] }, expected: 'Invalid search aliases' },
  ];
  for (const testCase of cases) {
    const result = validateDraft(testCase.source, testCase.row);
    assertEquals(result.error, testCase.expected, testCase.label);
    assertEquals(bengaliNameRetrySources([testCase.source], new Map([[testCase.source.id, result]])).length, 0, testCase.label);
  }
});

Deno.test('an empty catalog description cannot trigger Bengali name retry for unsupported copy', () => {
  const evidenceOnly = { ...source, description: null, evidenceDescription: 'Manufacturer fact 500 g' };
  const wrong = { ...valid, name: source.name, description: 'ভুল দাবি, 500 g।' };
  const result = validateDraft(evidenceOnly, wrong);
  assertEquals(result.error, 'Description lacks canonical source text');
  assertEquals(bengaliNameRetrySources([evidenceOnly], new Map([[source.id, result]])).length, 0);
});


Deno.test('known free-model rows envelope is accepted only with full per-product validation', () => {
  const alternative = JSON.stringify({ rows: [valid] });
  assertEquals(Boolean(parseBatch(alternative, [source]).get(source.id)?.draft), true);
  const wrongId = JSON.stringify({ rows: [{ ...valid, id: 'different' }] });
  assertEquals(parseBatch(wrongId, [source]).get(source.id)?.error, 'Model omitted or duplicated this product');
  const wrongQuantity = JSON.stringify({ rows: [{ ...valid, name: 'Ispahani চা 250 g' }] });
  assertEquals(parseBatch(wrongQuantity, [source]).get(source.id)?.error, 'Numeric or package identity changed');
  for (const invalid of [
    { rows: [valid], translations: [valid] }, { data: [valid] },
    { rows: [valid], unrelated: true }, [valid],
  ]) {
    assertEquals(parseBatch(JSON.stringify(invalid), [source]).get(source.id)?.error, 'Invalid structured model response');
  }
});
