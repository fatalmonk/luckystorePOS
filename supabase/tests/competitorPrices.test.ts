import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  import.meta.dirname,
  '../migrations/20260729000000_competitor_prices_converge_item_id_and_enrich.sql',
);
const migration = readFileSync(migrationPath, 'utf8');

const runtimeSqlPath = resolve(
  import.meta.dirname,
  'competitor_prices_forward_migration_test.sql',
);
const runtimeSql = readFileSync(runtimeSqlPath, 'utf8');

describe('competitor pricing migration contract', () => {
  it('copies product_id before dropping it and keeps unmatched item_id nullable', () => {
    const copyPosition = migration.indexOf('SET item_id = product_id');
    const dropPosition = migration.indexOf('DROP COLUMN IF EXISTS product_id');

    expect(copyPosition).toBeGreaterThan(-1);
    expect(dropPosition).toBeGreaterThan(copyPosition);
    expect(migration).not.toContain('ALTER COLUMN item_id SET NOT NULL');
    expect(migration).not.toContain('00000000-0000-0000-0000-000000000000');
  });

  it('implements the frozen ingestion signature and jsonb result', () => {
    expect(migration).toMatch(
      /CREATE FUNCTION public\.ingest_competitor_scrape_batch\(\s*p_run_key text,\s*p_scheduled_at timestamptz,\s*p_competitor text,\s*p_store_id uuid,\s*p_observations jsonb,\s*p_summary jsonb\s*\)\s*RETURNS jsonb/s,
    );
    expect(migration).toContain("v_observation ->> 'observation_key'");
    expect(migration).toContain("v_observation ->> 'matcher_version'");
    expect(migration).toContain("v_observation ->> 'match_confidence'");
  });

  it('locks privileged functions down explicitly', () => {
    expect(migration).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.ingest_competitor_scrape_batch\([\s\S]*?\) FROM PUBLIC, anon, authenticated;/,
    );
    expect(migration).toContain("auth.jwt() ->> 'role'");
    expect(migration).toContain("SET search_path = ''");
  });

  it('preserves manual history and enforces one active override', () => {
    expect(migration).toContain('is_override_active');
    expect(migration).toContain('competitor_prices_active_override_uniq');
    expect(migration).not.toMatch(
      /DELETE FROM public\.competitor_prices[\s\S]{0,200}source = 'manual'/,
    );
  });

  it('uses exact 8-day stale and 30-day hidden boundaries', () => {
    expect(migration).toContain(
      "WHEN ranked.scraped_at > now() - interval '8 days' THEN 'fresh'",
    );
    expect(migration).toContain(
      "cp.scraped_at > now() - interval '30 days'",
    );
  });

  it('invokes automatic cleanup from ingestion with strict older-than-90 semantics', () => {
    // Ingestion must call cleanup_old_competitor_prices after processing
    expect(migration).toMatch(
      /v_cleaned\s*:=\s*public\.cleanup_old_competitor_prices\(90\)/,
    );
    // Cleanup uses strict older-than (not older-or-equal) via `<` comparison
    expect(migration).toContain(
      "AND scraped_at < now() - make_interval(days => p_retention_days)",
    );
  });

  it('does not expose cleanup count in the frozen ingestion response', () => {
    // The response must contain exactly: run_id, inserted, duplicates, rejected
    expect(migration).toContain("'run_id', v_run_id");
    expect(migration).toContain("'inserted', v_inserted");
    expect(migration).toContain("'duplicates', v_duplicates");
    expect(migration).toContain("'rejected', v_rejected");
    expect(migration).not.toContain("'cleaned', v_cleaned");
  });

  it('ensures manual rows are never deleted by cleanup', () => {
    // The cleanup function filters on source = 'scraper'
    expect(migration).toMatch(
      /DELETE FROM public\.competitor_prices\s+WHERE source = 'scraper'/,
    );
    expect(migration).not.toMatch(
      /DELETE FROM public\.competitor_prices[\s\S]{0,200}source = 'manual'/,
    );
  });

  it('creates a retention index for scraper rows', () => {
    expect(migration).toContain('idx_competitor_prices_scraper_retention');
    expect(migration).toMatch(
      /CREATE INDEX IF NOT EXISTS idx_competitor_prices_scraper_retention[\s\S]*?ON public\.competitor_prices\s*\(\s*scraped_at\s*\)[\s\S]*?WHERE source = 'scraper'/,
    );
  });

  it('runtime SQL contains no literal backslash-n sequences', () => {
    // A regression guard: the runtime test file must be real SQL, not escaped text
    expect(runtimeSql).not.toContain('\\n');
  });
});