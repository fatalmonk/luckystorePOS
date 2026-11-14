import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { MODEL, providerConfig, providerRequest } from './provider.ts';
Deno.test('pins exact free model without provider or paid fallback', () => {
  assertEquals(MODEL, 'nvidia/nemotron-3-ultra-550b-a55b:free');
  assertEquals(providerConfig(undefined), null);
  assertEquals(providerConfig(' '), null);
  assertEquals(providerConfig('test')?.url, 'https://openrouter.ai/api/v1/chat/completions');
  const body = providerRequest([]);
  assertEquals(body.model, MODEL);
  assertEquals(body.provider.allow_fallbacks, false);
  assertEquals('models' in body, false);
  assertEquals('response_format' in body, false);
});
