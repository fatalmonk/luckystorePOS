import { supabase } from "@/lib/supabase";
import type { Json } from "@/lib/database.types";

interface DashboardStats {
  total_sales: number;
  user?: { name: string };
  [key: string]: Json | undefined;
}

interface MissingMetrics {
  toReceive: number;
  toGive: number;
  totalBalance: number;
}

interface MonthlyTrend {
  sales: { amount: number; trend: number };
  purchase: { amount: number; trend: number };
  expense: { amount: number; trend: number };
}

interface RetailKpis {
  atv: number;
  upt: number;
  gross_margin_pct: number;
  [key: string]: Json | undefined;
}

export interface CashflowData {
  day: string;
  income: number;
  expense: number;
  net: number;
}

export const dashboard = {
  getStats: async (storeId: string): Promise<DashboardStats> => {
    const { data, error } = await supabase.rpc('get_manager_dashboard_stats', { p_store_id: storeId });
    if (error) throw error;
    // Returns jsonb — data is the object directly, not an array
    const row = (data as any) || {};
    return {
      total_sales: Number(row.total_sales ?? 0),
      user: row.user ?? { name: 'Mohammed' },
    };
  },
  getMissingMetrics: async (storeId: string): Promise<MissingMetrics> => {
    const { data, error } = await supabase.rpc('get_dashboard_missing_metrics', { p_store_id: storeId });
    if (error) throw error;
    const row = (data as any) || {};
    return {
      toReceive: Number(row.toReceive ?? 0),
      toGive: Number(row.toGive ?? 0),
      totalBalance: Number(row.totalBalance ?? 0),
    };
  },
  getMonthlyTrend: async (storeId: string): Promise<MonthlyTrend> => {
    const { data, error } = await supabase.rpc('get_monthly_trend_metrics', { p_store_id: storeId });
    if (error) throw error;
    const row = (data as any) || {};
    return {
      sales: row.sales ?? { amount: 0, trend: 0 },
      purchase: row.purchase ?? { amount: 0, trend: 0 },
      expense: row.expense ?? { amount: 0, trend: 0 },
    };
  },
  getRetailKpis: async (storeId: string, days = 30): Promise<RetailKpis> => {
    const { data, error } = await supabase.rpc('get_retail_kpis', { p_store_id: storeId, p_days: days });
    if (error) throw error;
    const row = (data as any) || {};
    return {
      atv: Number(row.atv ?? 0),
      upt: Number(row.upt ?? 0),
      gross_margin_pct: Number(row.gross_margin_pct ?? 0),
    };
  },
  getCashflowData: async (storeId: string, days = 7): Promise<CashflowData[]> => {
    // Returns SETOF — supabase.rpc() returns an array here
    const { data, error } = await supabase.rpc('get_cashflow_data', { p_store_id: storeId, p_days: days });
    if (error) throw error;
    return (data as unknown as CashflowData[]) || [];
  },
  getLowStock: async (storeId: string) => {
    // Returns SETOF — supabase.rpc() returns an array here
    const { data, error } = await supabase.rpc('get_low_stock_items', { p_store_id: storeId });
    if (error) throw error;
    return data || [];
  },
};
