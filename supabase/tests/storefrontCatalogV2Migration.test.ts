import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  import.meta.dirname,
  '../migrations/20261017100000_fix_storefront_catalog_v2_item_filter.sql',
);
const migration = readFileSync(migrationPath, 'utf8');

describe('storefront catalogue v2 item filter migration', () => {
  it('uses exact IDs only for a non-empty selector with an empty text query', () => {
    expect(migration).toMatch(
      /WHEN COALESCE\(cardinality\(p_item_ids\), 0\) > 0 AND p_query = ''\s+THEN i\.id = ANY\(p_item_ids\)/s,
    );
  });

  it('preserves browse and text-search semantics for existing callers', () => {
    expect(migration).toMatch(
      /ELSE\s+p_query = ''[\s\S]*?i\.name\s+ILIKE[\s\S]*?cardinality\(p_item_ids\)[\s\S]*?i\.id = ANY\(p_item_ids\)/,
    );
  });
});
