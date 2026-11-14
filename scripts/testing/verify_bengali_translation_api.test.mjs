import test from 'node:test';
import assert from 'node:assert/strict';
import { TEST_REF, targetFromEnv, probes, verifyApi } from './verify_bengali_translation_api.mjs';

const approved = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://' + TEST_REF + '.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder',
  E2E_SUPABASE_PROJECT_REF: TEST_REF,
};
test('only explicit Testing/Security project is accepted', () => {
  assert.equal(targetFromEnv(approved).origin, approved.NEXT_PUBLIC_SUPABASE_URL);
  for (const candidate of [
    'https://hvmyxyccfnkrbxqbhlnm.supabase.co',
    'https://' + TEST_REF + '.supabase.co.evil.test',
    'http://' + TEST_REF + '.supabase.co',
    'https://' + TEST_REF + '.supabase.co:8443',
    'https://' + TEST_REF + '.supabase.co/extra',
    'https://user:password@' + TEST_REF + '.supabase.co',
  ]) assert.throws(() => targetFromEnv({ ...approved, NEXT_PUBLIC_SUPABASE_URL: candidate }));
  assert.throws(() => targetFromEnv({ ...approved, E2E_SUPABASE_PROJECT_REF: 'hvmyxyccfnkrbxqbhlnm' }));
  assert.throws(() => targetFromEnv({ ...approved, NEXT_PUBLIC_SUPABASE_ANON_KEY: '' }));
});
test('14 probes cover two tables with no actual-row writes', () => {
  let i=0;
  const checks = probes(() => '00000000-0000-4000-8000-' + (++i).toString().padStart(12,'0'));
  assert.equal(checks.length, 14);
  assert.equal(checks.filter(x => x.method === 'GET').length, 8);
  assert.equal(checks.filter(x => x.method !== 'GET').length, 6);
  assert.ok(checks.every(x => x.path.startsWith('/rest/v1/item_translations') || x.path.startsWith('/rest/v1/category_translations')));
  assert.ok(checks.filter(x => x.method !== 'GET').every(x => x.expected.every(s => s === 401 || s === 403)));
});
test('server response 204 to anonymous UPDATE is a hard failure', async () => {
  const checks = probes(() => '00000000-0000-4000-8000-000000000000');
  const fetcher = async (url,opts) => ({ status: opts.method === 'GET' && url.includes('select=id,name') ? 200 : opts.method === 'PATCH' ? 204 : 401 });
  const results = await verifyApi({origin: approved.NEXT_PUBLIC_SUPABASE_URL,key:'placeholder'},{fetcher,checks});
  assert.equal(results.filter(x => !x.pass).length,2);
  assert.ok(results.filter(x => !x.pass).every(x => x.label.endsWith('UPDATE')));
});
test('network failures fail closed', async () => {
  const results = await verifyApi({origin: approved.NEXT_PUBLIC_SUPABASE_URL,key:'placeholder'},{
    checks: probes(() => '00000000-0000-4000-8000-000000000000'),
    fetcher: async () => { throw new Error('unreachable'); },
  });
  assert.ok(results.every(r => !r.pass && r.status === null));
});
