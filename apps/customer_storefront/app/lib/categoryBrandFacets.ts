import type { SupabaseClient } from '@supabase/supabase-js';
import { RuleBasedBrandParser } from './products/parsers/BrandParser';
import { STOREFRONT_STORE_ID } from './products/constants';

const BRAND_ALIASES: Record<string, string> = {
  cerelace: 'Cerelac',
  cerelac: 'Cerelac',
  aril: 'Aril',
  '鈦aril': 'Aril',
};
const NON_BRAND_WORDS = new Set(['chicken', 'chocolate', 'ata', 'basmati', 'others']);

export function cleanBrandName(raw?: string | null): string {
  if (!raw) return 'Others';
  let clean = raw.replace(/[\uFEFF\u0000-\u001F\u007F-\u009F]/g, '').trim();
  clean = clean.replace(/^[^\w\s\u0980-\u09FF]+/, '').trim();
  if (!clean) return 'Others';
  const lower = clean.toLowerCase();
  if (BRAND_ALIASES[lower]) return BRAND_ALIASES[lower];
  if (NON_BRAND_WORDS.has(lower)) return 'Others';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function normalizeBrand(raw?: string | null): string {
  return cleanBrandName(raw).toLowerCase();
}

/** Public storefront RPC returns only exact-category product names and brands. */
export async function getCategoryBrandCounts(
  supabase: Pick<SupabaseClient, 'rpc'>,
  categoryId: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('get_storefront_category_brand_sources_v1', {
    p_store_id: STOREFRONT_STORE_ID,
    p_category_id: categoryId,
  });
  if (error || !Array.isArray(data)) {
    throw new Error('Category brand facets are unavailable');
  }
  if (data.length > 1000) throw new Error('Category exceeds safe facet limit');
  const parser = new RuleBasedBrandParser();
  const counts: Record<string, number> = {};
  for (const row of data) {
    if (!row || typeof row.name !== 'string' ||
      (row.brand !== null && row.brand !== undefined && typeof row.brand !== 'string')) {
      throw new Error('Invalid category brand facets');
    }
    const parsed = row.brand
      ? (parser.parse(row.brand) ?? row.brand)
      : parser.parse(row.name);
    const brand = cleanBrandName(parsed);
    if (brand !== 'Others') counts[brand] = (counts[brand] ?? 0) + 1;
  }
  return counts;
}
