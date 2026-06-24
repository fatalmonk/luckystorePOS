import { supabase } from "@/lib/supabase";
import { query } from "@/lib/neon";
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
  // Neon read replica — all dashboard reads go through Worker proxy
  getStats: async (storeId: string): Promise<DashboardStats> => {
    const rows = await query<any>(
      `SELECT * FROM get_manager_dashboard_stats($1::uuid)`,
      [storeId]
    );
    return rows[0] as DashboardStats;
  },
  getMissingMetrics: async (storeId: string): Promise<MissingMetrics> => {
    const rows = await query<any>(
      `SELECT * FROM get_dashboard_missing_metrics($1::uuid)`,
      [storeId]
    );
    return rows[0] as unknown as MissingMetrics;
  },
  getMonthlyTrend: async (storeId: string): Promise<MonthlyTrend> => {
    const rows = await query<any>(
      `SELECT * FROM get_monthly_trend_metrics($1::uuid)`,
      [storeId]
    );
    return rows[0] as unknown as MonthlyTrend;
  },
  getRetailKpis: async (storeId: string, days = 30): Promise<RetailKpis> => {
    const rows = await query<any>(
      `SELECT * FROM get_retail_kpis($1::uuid, $2::int)`,
      [storeId, days]
    );
    return rows[0] as RetailKpis;
  },
  getCashflowData: async (storeId: string, days = 7): Promise<CashflowData[]> => {
    const rows = await query<any>(
      `SELECT * FROM get_cashflow_data($1::uuid, $2::int)`,
      [storeId, days]
    );
    return (rows as unknown as CashflowData[]) || [];
  },
  getLowStock: async (storeId: string) => {
    const rows = await query<any>(
      `SELECT * FROM get_low_stock_items($1::uuid)`,
      [storeId]
    );
    return rows;
  },
};