import { supabase } from "@/lib/supabase";
import type {
  CompetitorPrice,
  PriceAlert,
  CompetitorPriceFormData,
  CompetitorPriceFilters,
} from '../types';

import type { Json } from "@/lib/database.types";

export async function fetchCompetitorPrices(
  storeId: string,
  filters?: CompetitorPriceFilters
): Promise<CompetitorPrice[]> {
  let query = supabase
    .from('competitor_prices')
    .select(`
      *,
      items:item_id (name, sku)
    `)
    .eq('store_id', storeId)
    .order('scraped_at', { ascending: false });

  if (filters?.itemId) {
    query = query.eq('item_id', filters.itemId);
  }
  if (filters?.competitorName) {
    query = query.ilike('competitor_name', `%${filters.competitorName}%`);
  }
  if (filters?.dateFrom) {
    query = query.gte('scraped_at', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('scraped_at', filters.dateTo);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    item_id: row.item_id,
    item_name: row.items?.name,
    sku: row.items?.sku,
    competitor_name: row.competitor_name,
    competitor_price: row.competitor_price,
    competitor_url: row.competitor_url,
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
  const { data, error } = await supabase
    .from('competitor_prices')
    .select('competitor_name')
    .eq('store_id', storeId as any)
    .order('competitor_name' as any);

  if (error) throw error;

  const names = [...new Set((data || []).map((d: any) => d.competitor_name))] as string[];
  return names;
}
