import { supabase } from '@/lib/supabase';
import type {
  CompetitorPrice,
  EffectiveCompetitorPrice,
  PriceAlert,
  CompetitorPriceFormData,
  CompetitorPriceFilters,
} from '../types';
import { calculateVerifiedPriceGap, resolveProductMatchStatus } from './productMatching';
import { calculatePriceGapFraction } from './priceGap';

export { calculatePriceGapFraction } from './priceGap';

export function normalizeCompetitorKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Formats a fractional gap as a percentage while preserving the agreed sign convention. */
export function formatPriceGapPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'N/A';
  const percent = value * 100;
  if (!Number.isFinite(percent)) return 'N/A';
  const rounded = Math.round((percent + Number.EPSILON) * 100) / 100;
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(2)}%`;
}

// ---------------------------------------------------------------------------
// Effective competitor prices (RPC: get_effective_competitor_prices)
// Returns exactly one row per competitor with freshness status.
// Query key: ['competitorPrices', 'effective', storeId, itemId]
// ---------------------------------------------------------------------------

export async function fetchEffectiveCompetitorPrices(
  storeId: string,
  itemId: string,
): Promise<EffectiveCompetitorPrice[]> {
  const { data, error } = await supabase.rpc('get_effective_competitor_prices', {
    p_store_id: storeId,
    p_item_id: itemId,
  });
  if (error) throw error;
  return ((data ?? []) as EffectiveCompetitorPrice[]).map((row) => {
    const match_status = resolveProductMatchStatus(
      row.matcher_version, null, row.item_id, row.source, row.is_override_active,
    );
    return {
      ...row,
      match_status,
      price_gap_percent: calculateVerifiedPriceGap(match_status, row.our_price, row.competitor_price),
    };
  }).filter((row) => row.match_status === 'VERIFIED' && row.price_gap_percent != null);
}

// ---------------------------------------------------------------------------
// Full competitor price list (direct table query, for admin detail page)
// ---------------------------------------------------------------------------

export async function fetchCompetitorPrices(
  storeId: string,
  filters?: CompetitorPriceFilters,
): Promise<CompetitorPrice[]> {
  let q = supabase
    .from('competitor_prices')
    .select('*, items!competitor_prices_item_id_fkey(name, sku)')
    .eq('store_id', storeId)
    .order('scraped_at', { ascending: false });

  if (filters?.itemId) q = q.eq('item_id', filters.itemId);
  if (filters?.competitorKey) q = q.eq('competitor_key', filters.competitorKey);
  if (filters?.dateFrom) q = q.gte('scraped_at', filters.dateFrom);
  if (filters?.dateTo) q = q.lte('scraped_at', filters.dateTo);
  if (filters?.matchedOnly) q = q.not('item_id', 'is', null);
  if (filters?.unmatchedOnly) q = q.is('item_id', null);

  const { data, error } = await q;
  if (error) throw error;

  let rows = (data ?? []) as any[];

  // Client-side filter for competitor name (text search not indexed)
  if (filters?.competitorKey) {
    const lower = filters.competitorKey.toLowerCase();
    rows = rows.filter((r) => r.competitor_key?.toLowerCase().includes(lower));
  }

  return rows.map((row) => {
    const hasVisibleCatalogItem = row.item_id != null && row.items != null;
    const match_status = hasVisibleCatalogItem
      ? resolveProductMatchStatus(
        row.matcher_version, row.match_metadata, row.item_id, row.source, row.is_override_active,
      )
      : row.item_id == null ? 'REJECTED' : 'AMBIGUOUS';
    return ({
    id: row.id,
    store_id: row.store_id,
    item_id: row.item_id,
    product_name: row.product_name,
    item_name: row.items?.name ?? row.product_name ?? null,
    sku: row.items?.sku ?? null,
    competitor_key: row.competitor_key ?? row.competitor_name?.toLowerCase() ?? '',
    competitor_name: row.competitor_name,
    competitor_price: row.competitor_price,
    competitor_original_price: row.competitor_original_price ?? null,
    competitor_product_url: row.competitor_product_url ?? null,
    // Do not expose or compare a stored catalog price when the linked item is not visible in this tenant.
    our_price: hasVisibleCatalogItem ? row.our_price ?? null : null,
    // Unmatched rows have no validated Lucky Store product identity, so their gap is not comparable.
    price_gap_percent: calculateVerifiedPriceGap(
      match_status,
      row.our_price ?? null,
      row.competitor_price ?? null,
    ),
    source: row.source ?? 'scraper',
    is_override_active: row.is_override_active ?? false,
    manual_override_reason: row.manual_override_reason ?? null,
    manual_override_at: row.manual_override_at ?? null,
    manual_override_cleared_at: row.manual_override_cleared_at ?? null,
    observation_key: row.observation_key ?? null,
    scrape_run_id: row.scrape_run_id ?? null,
    match_confidence: row.match_confidence ?? null,
    matcher_version: row.matcher_version ?? 'legacy-v0',
    match_status,
    match_metadata: row.match_metadata ?? null,
    scraped_at: row.scraped_at,
    scrape_status: row.scrape_status ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
  });
}

export async function fetchCompetitorPriceCounts(
  storeId: string,
): Promise<{ total: number; matched: number; unmatched: number }> {
  const [total, matched, unmatched] = await Promise.all([
    supabase
      .from('competitor_prices')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId),
    supabase
      .from('competitor_prices')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .not('item_id', 'is', null),
    supabase
      .from('competitor_prices')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .is('item_id', null),
  ]);

  const error = total.error ?? matched.error ?? unmatched.error;
  if (error) throw error;

  return {
    total: total.count ?? 0,
    matched: matched.count ?? 0,
    unmatched: unmatched.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Price alerts (RPC: check_price_alerts)
// ---------------------------------------------------------------------------

interface PriceAlertResponse {
  item_id: string;
  item_name: string;
  our_price: number | null;
  market_avg_price: number | null;
  price_gap_percent: number | null;
  competitors: Record<string, number> | null;
}

export async function fetchPriceAlerts(
  storeId: string,
  threshold: number = 0.15,
): Promise<PriceAlert[]> {
  const { data, error } = await supabase.rpc('check_price_alerts', {
    p_store_id: storeId,
    p_threshold: threshold,
  });

  if (error) throw error;

  return ((data || []) as PriceAlertResponse[]).map((row) => ({
    item_id: row.item_id,
    item_name: row.item_name,
    our_price: row.our_price,
    market_avg_price: row.market_avg_price,
    price_gap_percent: calculatePriceGapFraction(row.our_price, row.market_avg_price),
    competitors: row.competitors ? Object.keys(row.competitors) : [],
  }));
}

// ---------------------------------------------------------------------------
// Manual override RPCs
// ---------------------------------------------------------------------------

export async function setManualCompetitorPrice(
  storeId: string,
  itemId: string,
  competitorKey: string,
  competitorName: string,
  price: number,
  reason?: string,
  competitorUrl?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('set_manual_competitor_price', {
    p_store_id: storeId,
    p_item_id: itemId,
    p_competitor_key: competitorKey,
    p_competitor_name: competitorName,
    p_price: price,
    p_reason: reason ?? null,
    p_competitor_product_url: competitorUrl ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function clearManualCompetitorPrice(
  storeId: string,
  itemId: string,
  competitorKey: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('clear_manual_competitor_price', {
    p_store_id: storeId,
    p_item_id: itemId,
    p_competitor_key: competitorKey,
  });
  if (error) throw error;
  return data as boolean;
}

// ---------------------------------------------------------------------------
// Manual add uses the same history-preserving RPC as replacement.
// ---------------------------------------------------------------------------

export async function addCompetitorPrice(
  storeId: string,
  data: CompetitorPriceFormData,
): Promise<void> {
  await setManualCompetitorPrice(
    storeId,
    data.item_id,
    data.competitor_key,
    data.competitor_name,
    data.competitor_price,
    undefined,
    data.competitor_url,
  );
}

export async function fetchCompetitorNames(storeId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('competitor_prices')
    .select('competitor_key, competitor_name')
    .eq('store_id', storeId)
    .order('competitor_key');

  if (error) throw error;
  // Deduplicate by competitor_key
  const seen = new Set<string>();
  const names: string[] = [];
  for (const r of data ?? []) {
    const key = r.competitor_key ?? r.competitor_name?.toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      names.push(r.competitor_name ?? key);
    }
  }
  return names;
}

export async function linkScrapedProductToItem(
  storeId: string,
  priceRecordId: string,
  itemId: string,
  competitorUrl?: string,
  confirmedProductIdentity: boolean = false,
): Promise<void> {
  const { error } = await (supabase.rpc as any)('link_competitor_price_item', {
    p_store_id: storeId,
    p_price_record_id: priceRecordId,
    p_item_id: itemId,
    p_competitor_product_url: competitorUrl ?? null,
    p_confirmed_product_identity: confirmedProductIdentity,
  });
  if (error) throw error;
}
