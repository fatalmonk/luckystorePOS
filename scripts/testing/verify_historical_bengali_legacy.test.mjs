import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url);
const migration = readFileSync(new URL('../../supabase/migrations/20261114205845_preserve_historical_bengali_approvals.sql', import.meta.url), 'utf8');
const auditMigration = readFileSync(new URL('../../supabase/migrations/20261116100000_add_bengali_translation_audit_trail.sql', import.meta.url), 'utf8');
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

test('all 100 historical Bengali names and descriptions are captured in Git independently of database state', () => {
  const snapshot = JSON.parse(readFileSync(new URL('../../supabase/data/historical-bengali-publications-2026-09-15.json', import.meta.url),'utf8'));
  assert.equal(snapshot.schema, 'luckystore.bengali-legacy-content/v1');
  const records = snapshot.records;
  assert.equal(records.length,100);
  assert.equal(new Set(records.map(x=>x.translation_id)).size,100);
  assert.deepEqual(records.map(x=>x.translation_id).sort(),extractManifest(migration).map(x=>x[0]).sort());
  for(const row of records){
    assert.equal(row.locale, 'bn');
    assert.equal(row.review_status, 'published');
    assert.ok(row.name.trim());
    assert.ok(row.description.trim());
    assert.ok(row.created_at.startsWith('2026-09-15'));
    assert.ok(row.updated_at.startsWith('2026-09-15'));
  }
});

test('Bengali mobile catalog v2 filters before pagination and preserves strict and legacy publication checks', () => {
  const sql = readFileSync(new URL('../../supabase/migrations/20261114212128_enforce_bengali_mobile_catalog_locale.sql',import.meta.url),'utf8');
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.search_storefront_mobile_catalog_v2/);
  assert.match(sql, /p_locale\s+text\s+DEFAULT 'en'/);
  assert.match(sql, /v_locale = 'en' OR tr\.id IS NOT NULL/);
  assert.equal((sql.match(/translation_private\.is_legacy_item_publication_eligible\(tr\.id,tr\.item_id,tr\.tenant_id\)/g)||[]).length,2);
  assert.equal((sql.match(/translation_private\.is_publication_eligible\(/g)||[]).length,2);
  assert.match(sql, /\^https:\/\//);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.search_storefront_mobile_catalog_v2/);
});

test('forward migration shares the public-store rule and sorts Bengali pages by eligible translation name', () => {
  const sql = readFileSync(new URL('../../supabase/migrations/20261115090000_align_bengali_mobile_public_store_and_sort.sql', import.meta.url), 'utf8');
  assert.match(sql, /CREATE OR REPLACE FUNCTION translation_private\.is_public_storefront\(p_metadata jsonb\)/);
  assert.match(sql, /p_metadata @> '[\{]\"is_public_storefront\":true[\}]'::jsonb/);
  assert.equal((sql.match(/translation_private\.is_public_storefront\(s\.metadata\)/g) || []).length, 3,
    'legacy eligibility and both mobile RPCs use the same predicate');
  assert.doesNotMatch(sql, /is_public_storefront'\)::boolean/);
  const v2 = sql.split('CREATE OR REPLACE FUNCTION public.search_storefront_mobile_catalog_v2(')[1];
  assert.ok(v2, 'v2 is redefined in the forward migration');
  assert.match(v2, /WITH matching_items AS MATERIALIZED \([\s\S]*?tr\.name AS bengali_name/);
  assert.equal((v2.match(/CASE WHEN v_sort = 'name-asc' AND v_locale = 'bn' THEN m\.bengali_name END ASC/g) || []).length, 2,
    'row number and page selection use the same Bengali sort key');
  assert.equal((v2.match(/translation_private\.is_publication_eligible\(/g) || []).length, 2);
  assert.equal((v2.match(/translation_private\.is_legacy_item_publication_eligible\(/g) || []).length, 2);
});

test('translation workflow records immutable per-record audit events without granting direct writes', () => {
  assert.match(auditMigration, /CREATE TABLE IF NOT EXISTS public\.translation_review_audit/);
  assert.match(auditMigration, /CREATE POLICY translation_review_audit_staff_select/);
  assert.match(auditMigration, /record_translation_audit/);
  assert.match(auditMigration, /prevent_translation_audit_mutation/);
  assert.match(auditMigration, /AFTER INSERT OR UPDATE ON public\.item_translations/);
  assert.match(auditMigration, /AFTER INSERT OR UPDATE ON public\.category_translations/);
  assert.doesNotMatch(auditMigration, /GRANT INSERT[^;]*translation_review_audit/);
  assert.doesNotMatch(auditMigration, /GRANT UPDATE[^;]*translation_review_audit/);
  assert.doesNotMatch(auditMigration, /GRANT DELETE[^;]*translation_review_audit/);
});
