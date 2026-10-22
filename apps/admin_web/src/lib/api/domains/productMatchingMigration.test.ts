import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(__dirname, '../../../../../../supabase/migrations/20261022120000_conservative_competitor_matching.sql'),
  'utf8',
);

describe('conservative competitor matcher migration contract', () => {
  it('classifies dimensions, normalized amounts, and multipack counts', () => {
    expect(migration).toContain('extract_product_pack_signature');
    expect(migration).toContain('measurement_dimension');
    expect(migration).toContain('pack_count');
    expect(migration).toContain('pieces?)\\s*[x×]\\s*(\\d+)');
  });

  it('keeps only verified matcher outcomes actionable', () => {
    expect(migration).toContain('safe-v2:VERIFIED:');
    expect(migration).toContain('safe-v2:PROBABLE:');
    expect(migration).toContain('safe-v2:AMBIGUOUS:');
    expect(migration).toContain('safe-v2:REJECTED:');
    expect(migration).toContain("LIKE 'safe-v2:VERIFIED:%'");
    expect(migration).toContain("cp.matcher_version = 'url-direct-user-v2'");
    expect(migration).not.toContain("cp.match_metadata ->> 'match_status' = 'VERIFIED'");
  });

  it('does not promote a title prefix to verified brand evidence', () => {
    expect(migration).toContain('v_observed_brand_explicit boolean');
    expect(migration).toContain("cp.raw_data ->> 'brand' AS scraped_brand");
    expect(migration).toContain("IF v_observed_brand_explicit THEN RETURN 'VERIFIED'");
  });

  it('uses the tenant-scoped catalog schema and current item price column', () => {
    expect(migration).toContain('i.tenant_id = v_tenant_id');
    expect(migration).toContain('it.tenant_id = (SELECT s.tenant_id FROM public.stores s');
    expect(migration).toContain('SELECT i.price');
    expect(migration).not.toContain('i.store_id');
    expect(migration).not.toContain('i.selling_price');
    expect(migration).toContain('JOIN public.items i ON i.id = cp.item_id AND i.tenant_id = s.tenant_id');
    expect(migration).toContain(") = 'VERIFIED'");
  });

  it('requires explicit confirmation for an otherwise unverified manual link', () => {
    expect(migration).toContain('p_confirmed_product_identity boolean');
    expect(migration).toContain('product identity confirmation required');
    expect(migration).toContain('product attributes conflict');
  });

  it('retains store authorization on replaced security-definer RPCs', () => {
    expect(migration).toContain('public.get_current_user_store_id() IS DISTINCT FROM p_store_id');
    expect(migration).toContain('SET search_path =');
    expect(migration).toContain('REVOKE EXECUTE');
    expect(migration).toContain('GRANT EXECUTE');
  });
});
