import { supabase } from "@/lib/supabase";
import { query } from "@/lib/neon";
import type {
  CompetitorPrice,
  PriceAlert,
  CompetitorPriceFormData,
  CompetitorPriceFilters,
} from '../types';

export async function fetchCompetitorPrices(
  storeId: string,
  filters?: CompetitorPriceFilters
): Promise<CompetitorPrice[]> {
  // Neon read replica via Worker proxy — fetch with joined item names
  let rows: any[];

  if (filters?.itemId) {
    rows = await query<any>(
      `SELECT cp.*, i.name as item_name, i.sku
       FROM competitor_prices cp
       LEFT JOIN items i ON cp.item_id = i.id
       WHERE cp.store_id = $1
         AND cp.item_id = $2`,
      [storeId, filters.itemId]
    );
  } else {
    rows = await query<any>(
      `SELECT cp.*, i.name as item_name, i.sku
       FROM competitor_prices cp
       LEFT JOIN items i ON cp.item_id = i.id
       WHERE cp.store_id = $1`,
      [storeId]
    );
  }

  // Apply remaining filters in JS (simpler than dynamic SQL building)
  let filtered = rows as any[];

  if (filters?.competitorName) {
    const lower = filters.competitorName.toLowerCase();
    filtered = filtered.filter(r => r.competitor_name?.toLowerCase().includes(lower));
  }
  if (filters?.dateFrom) {
    filtered = filtered.filter(r => r.scraped_at >= filters.dateFrom!);
  }
  if (filters?.dateTo) {
    filtered = filtered.filter(r => r.scraped_at <= filters.dateTo!);
  }

  // Sort by scraped_at desc
  filtered.sort((a, b) => {
    const aTime = new Date(a.scraped_at).getTime();
    const bTime = new Date(b.scraped_at).getTime();
    return bTime - aTime;
  });

  return filtered.map((row) => ({
    id: row.id,
    item_id: row.item_id,
    item_name: row.item_name,
    sku: row.sku,
    competitor_name: row.competitor_name,
    competitor_price: row.competitor_price,
    competitor_url: row.competitor_url || row.competitor_product_url,
    scraped_at: row.scraped_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

interface PriceAlertResponse {
  product_id: string;
  product_name: string;
  our_price: number;
  market_avg_price: number;
  price_gap_percent: number;
  competitors: any;
}

export async function fetchPriceAlerts(
  storeId: string,
  threshold: number = 0.15
): Promise<PriceAlert[]> {
  const { data, error } = await supabase.rpc('check_price_alerts', {
    p_store_id: storeId,
    p_threshold: threshold,
  });

  if (error) throw error;

  // Transform Json competitors to string[]
  return ((data || []) as PriceAlertResponse[]).map((row) => ({
    product_id: row.product_id,
    product_name: row.product_name,
    our_price: row.our_price,
    market_avg_price: row.market_avg_price,
    price_gap_percent: row.price_gap_percent,
    competitors: Array.isArray(row.competitors) ? row.competitors.map(String) : [],
  }));
}

export async function addCompetitorPrice(
  storeId: string,
  data: CompetitorPriceFormData
): Promise<void> {
  const { error } = await supabase.from('competitor_prices').insert({
    store_id: storeId,
    item_id: data.item_id,
    competitor_name: data.competitor_name,
    competitor_price: data.competitor_price,
    competitor_product_url: data.competitor_url || null,
    scraped_at: new Date().toISOString(),
    product_name: '', // Required field - will be populated from item lookup
  } as any);

  if (error) throw error;
}

export async function updateCompetitorPrice(
  id: string,
  data: Partial<CompetitorPriceFormData>
): Promise<void> {
  const { error } = await supabase
    .from('competitor_prices')
    .update({
      ...data,
      competitor_product_url: data.competitor_url || null,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteCompetitorPrice(id: string): Promise<void> {
  const { error } = await supabase
    .from('competitor_prices')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function fetchCompetitorNames(storeId: string): Promise<string[]> {
  const rows = await query<any>(
    `SELECT DISTINCT competitor_name
     FROM competitor_prices
     WHERE store_id = $1
     ORDER BY competitor_name`,
    [storeId]
  );
  return rows.map((r: any) => r.competitor_name);
}