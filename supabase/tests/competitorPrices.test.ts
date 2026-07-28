import { describe, it, expect, beforeAll } from 'vitest';
import { supabase, runSql } from './test/setup';
import { v4 as uuidv4 } from 'uuid';

/**
 * Integration tests for competitor_prices forward migration.
 *
 * Status: LIVE_REQUIRED — these tests need a running Supabase instance
 * with the 20260729 migration applied. They will fail against a blank
 * local DB or before the migration runs.
 *
 * To run against a local Supabase:
 *   cd supabase/tests && npm test -- competitorPrices.test.ts
 */
describe.skip('competitor_prices forward migration', () => {
  const storeId = '11111111-1111-1111-1111-111111111111';
  const itemId = 'e0000000-0000-0000-0000-000000000099'; // must exist in test data
  const competitorKey = 'test-competitor';

  beforeAll(async () => {
    // Ensure test data exists — requires seed data in test DB
    const { data } = await supabase.from('items').select('id, store_id').eq('id', itemId).single();
    if (!data) {
      throw new Error(`Test item ${itemId} not found — seed test data first`);
    }
  });

  it('has all new columns on competitor_prices', async () => {
    const columns = await runSql(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'competitor_prices'
       ORDER BY column_name`
    );
    const names = columns.map((r: any) => r.column_name);
    expect(names).toContain('source');
    expect(names).toContain('competitor_key');
    expect(names).toContain('is_manual_override');
    expect(names).toContain('observation_key');
    expect(names).toContain('scrape_run_id');
    expect(names).toContain('match_confidence');
    expect(names).toContain('match_method');
    expect(names).toContain('match_metadata');
    expect(names).toContain('manual_override_reason');
    expect(names).toContain('manual_override_at');
  });

  it('item_id is NOT NULL and product_id is gone', async () => {
    const cols = await runSql(
      `SELECT column_name, is_nullable FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'competitor_prices'
       AND column_name IN ('item_id', 'product_id', 'competitor_key')`
    );
    const itemIdCol = cols.find((c: any) => c.column_name === 'item_id');
    expect(itemIdCol).toBeDefined();
    expect(itemIdCol.is_nullable).toBe('NO');

    const productIdCol = cols.find((c: any) => c.column_name === 'product_id');
    expect(productIdCol).toBeUndefined();

    const competitorKeyCol = cols.find((c: any) => c.column_name === 'competitor_key');
    expect(competitorKeyCol).toBeDefined();
    expect(competitorKeyCol.is_nullable).toBe('NO');
  });

  it('set_manual_competitor_price creates an override', async () => {
    const { data, error } = await supabase.rpc('set_manual_competitor_price', {
      p_store_id: storeId,
      p_item_id: itemId,
      p_competitor_key: competitorKey,
      p_competitor_name: 'Test Competitor',
      p_price: 99.99,
      p_reason: 'integration test',
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    // Verify the override exists
    const { data: row } = await supabase
      .from('competitor_prices')
      .select('*')
      .eq('id', data)
      .single();

    expect(row.is_manual_override).toBe(true);
    expect(row.source).toBe('manual');
    expect(row.competitor_key).toBe(competitorKey);
    expect(Number(row.competitor_price)).toBe(99.99);
  });

  it('get_effective_competitor_prices returns one row per competitor', async () => {
    const { data, error } = await supabase.rpc('get_effective_competitor_prices', {
      p_store_id: storeId,
      p_item_id: itemId,
    });

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);

    // Manual override should appear
    const manualRow = data.find((r: any) => r.competitor_key === competitorKey);
    expect(manualRow).toBeDefined();
    expect(manualRow.is_manual_override).toBe(true);
    expect(manualRow.status).toBe('manual');
    expect(manualRow.item_id).toBe(itemId);
  });

  it('clear_manual_competitor_price removes the override', async () => {
    const { data, error } = await supabase.rpc('clear_manual_competitor_price', {
      p_store_id: storeId,
      p_item_id: itemId,
      p_competitor_key: competitorKey,
    });

    expect(error).toBeNull();
    expect(data).toBe(true);

    // Verify it's gone
    const { data: rows } = await supabase
      .from('competitor_prices')
      .select('id')
      .eq('store_id', storeId)
      .eq('item_id', itemId)
      .eq('competitor_key', competitorKey)
      .eq('is_manual_override', true);

    expect(rows).toHaveLength(0);
  });

  it('ingest_competitor_scrape_batch rejects wrong-store items', async () => {
    const wrongStoreId = '22222222-2222-2222-2222-222222222222';
    const runId = uuidv4();

    const { data, error } = await supabase.rpc('ingest_competitor_scrape_batch', {
      p_store_id: storeId,
      p_scrape_run_id: runId,
      p_observations: JSON.stringify([
        {
          item_id: itemId,
          competitor_key: 'chaldal',
          competitor_name: 'Chaldal',
          competitor_price: 85.0,
          scrape_status: 'success',
        },
        {
          item_id: '00000000-0000-0000-0000-000000000999', // does not belong to storeId
          competitor_key: 'shwapno',
          competitor_name: 'Shwapno',
          competitor_price: 80.0,
          scrape_status: 'success',
        },
      ]),
    });

    // The second item should be rejected because it doesn't belong to storeId
    expect(error).toBeNull();
    const result = Array.isArray(data) ? data[0] : data;
    expect(result.inserted).toBeGreaterThanOrEqual(0);
    expect(result.rejected).toBeGreaterThanOrEqual(1); // at least the wrong-store item
  });

  it('cleanup_old_competitor_prices preserves manual overrides', async () => {
    // This test would need time-travel or manual date insertion
    // Structural test only — actual behavior tested in SQL test file
    const { data, error } = await supabase.rpc('cleanup_old_competitor_prices', {
      p_retention_days: 90,
    });
    // Should not throw
    expect(error).toBeNull();
    expect(typeof data).toBe('number');
  });
});