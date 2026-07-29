import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Competitor Matching Rules Contract', () => {
  const sql = readFileSync(
    resolve(__dirname, '../migrations/20260729010000_enhance_competitor_matching_barcode_weight_url.sql'),
    'utf8'
  );

  it('contains extract_package_quantity function', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.extract_package_quantity');
  });

  it('contains match_competitor_price_item function with Barcode, URL, and Weight rules', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.match_competitor_price_item');
    expect(sql).toContain('url-direct');
    expect(sql).toContain('barcode-exact');
    expect(sql).toContain('sku-exact');
    expect(sql).toContain('weight-name-exact');
  });

  it('contains batch rematch procedure rematch_competitor_prices', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.rematch_competitor_prices');
    expect(sql).toContain('unlinked-weight-mismatch');
  });
});
