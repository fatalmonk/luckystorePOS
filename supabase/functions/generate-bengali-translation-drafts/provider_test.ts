import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { MODEL, classifyProviderOutput, decodeSuccessfulProviderResponse, providerConfig, providerRequest } from './provider.ts';
Deno.test('pins exact free model without provider or paid fallback', () => {
  assertEquals(MODEL, 'nvidia/nemotron-3.5-super-vl:free');
  assertEquals(providerConfig(undefined), null);
  assertEquals(providerConfig(' '), null);
  assertEquals(providerConfig('test')?.url, 'https://openrouter.ai/api/v1/chat/completions');
  const body = providerRequest([]);
  assertEquals(body.model, MODEL);
  assertEquals(body.provider.allow_fallbacks, false);
  assertEquals('models' in body, false);
  assertEquals(body.response_format.type, 'json_schema');
  assertEquals(body.response_format.json_schema.strict, true);
  assertEquals(body.provider.require_parameters, true);
  assertEquals(body.reasoning.enabled, false);
  assertEquals(body.max_tokens, 6000);
});
Deno.test('provider receives only translation inputs, not previous row revision metadata', () => {
  const source = { id: 'item', name: 'Tea', description: null, previous: { id: 'private-row', updated_at: 'revision' } };
  const body = providerRequest([source]);
  const payload = JSON.parse(body.messages[1].content);
  assertEquals(payload, [{ id: 'item', name: 'Tea', description: null }]);
});


Deno.test('truncated nonempty output with no valid drafts is diagnosed as truncated', () => {
  const invalid = new Map([['product', { error: 'Model returned invalid JSON' }]]);
  assertEquals(classifyProviderOutput(invalid, 'length'), 'output_truncated');
  assertEquals(classifyProviderOutput(invalid, 'stop'), 'rejected_output');
  assertEquals(classifyProviderOutput(new Map([['product', { draft: { id: 'product' } }]]), 'length'), 'valid_output');
});

Deno.test('malformed successful HTTP provider response is not classified as a transport timeout', async () => {
  const html = await decodeSuccessfulProviderResponse({ json: async () => { throw new SyntaxError('unexpected <'); } });
  assertEquals(html.ok, false);
  const badShape = await decodeSuccessfulProviderResponse({ json: async () => ({ choices: 'not an array' }) });
  assertEquals(badShape.ok, false);
  const valid = await decodeSuccessfulProviderResponse({ json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: '{"translations":[]}' } }] }) });
  assertEquals(valid.ok, true);
});

Deno.test('system instructions forbid unsupported semantic claims and enforce exact variants and same-item evidence', () => {
  const prompt = providerRequest([]).messages[0].content;
  for (const phrase of [
    'Do not infer milk from powder', 'Never invent claims', 'unrelated product facts',
    'ONLY evidenceDescription', 'same specific item', 'exactly as written',
    'Human review',
  ]) {
    assertEquals(prompt.includes(phrase), true, phrase);
  }
});
