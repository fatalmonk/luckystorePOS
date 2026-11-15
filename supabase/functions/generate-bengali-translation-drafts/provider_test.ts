import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { MODEL, providerConfig, providerRequest } from './provider.ts';
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
  assertEquals(body.max_tokens, 5000);
});
Deno.test('provider receives only translation inputs, not previous row revision metadata', () => {
  const source = { id: 'item', name: 'Tea', description: null, previous: { id: 'private-row', updated_at: 'revision' } };
  const body = providerRequest([source]);
  const payload = JSON.parse(body.messages[1].content);
  assertEquals(payload, [{ id: 'item', name: 'Tea', description: null }]);
});
