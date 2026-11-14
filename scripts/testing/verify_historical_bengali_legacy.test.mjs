import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url);
const migration = readFileSync(new URL('../../supabase/migrations/20261114205845_preserve_historical_bengali_approvals.sql', import.meta.url), 'utf8');
const bridge = readFileSync(new URL('../../system-docs/runbooks/bengali-legacy-prehardening-bridge.sql', import.meta.url), 'utf8');
const extractManifest = source => {
  const marker = 'INSERT INTO legacy_bengali_manifest(translation_id,item_id,tenant_id,fingerprint) VALUES';
  assert.equal(source.split(marker).length, 2, 'one immutable exact cohort declaration');
  const values = source.split(marker)[1].split(';')[0];
  const pattern = /\('([0-9a-f-]{36})'::uuid, '([0-9a-f-]{36})'::uuid, '([0-9a-f-]{36})'::uuid, '([0-9a-f]{64})'\)/gi;
  const results = [...values.matchAll(pattern)].map(m => m.slice(1));
  assert.equal(results.length, 100, 'exactly 100 records in manifest');
  return results;
};

test('the Git-anchored manifest and one-time bridge contain identical 100 immutable identity-fingerprint tuples', () => {
  const a = extractManifest(migration);
  const b = extractManifest(bridge);
  assert.deepEqual(a,b);
  assert.equal(new Set(a.map(x => x[0])).size,100,'no duplicate translation IDs');
  assert.equal(new Set(a.map(x => x[1])).size,100,'no duplicate item IDs');
  assert.equal(new Set(a.map(x => x[2])).size,1,'historical cohort has one tenant');
});
test('legacy exemption never replaces the modern review/publish evidence gate', () => {
  assert.match(migration,/translation_private\.is_publication_eligible\('item',item_id/);
  assert.match(migration,/OR translation_private\.is_legacy_item_publication_eligible\(id,item_id,tenant_id\)/);
  assert.equal((migration.match(/OR translation_private\.is_legacy_item_publication_eligible\(tr\.id,tr\.item_id,tr\.tenant_id\)/g)||[]).length,2,
    'both privileged mobile catalog joins require the same eligibility exception');
  assert.match(migration,/t\.review_status='published'/);
  assert.match(migration,/t\.evidence_snapshot IS NULL/);
  assert.match(migration,/l\.fingerprint=encode\(sha256/);
  assert.match(migration,/i\.is_active IS TRUE/);
  assert.match(migration,/translation_private\.is_product_details\(t\.details\)/);
  assert.match(migration,/DROP POLICY IF EXISTS item_translations_legacy_transition_public/);
  assert.match(migration,/DROP FUNCTION IF EXISTS translation_private\.pre_migration_legacy_eligible/);
});
test('no mass review, fabricated evidence, or update of existing translated descriptions',()=>{
  assert.doesNotMatch(migration,/UPDATE\s+public\.item_translations\s+SET/i);
  assert.doesNotMatch(bridge,/UPDATE\s+public\.item_translations\s+SET/i);
  assert.doesNotMatch(migration,/INSERT\s+INTO\s+public\.item_translations/i);
  assert.match(bridge,/legacy_bengali_manifest/);
});
