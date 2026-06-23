import { supabase } from "@/lib/supabase";
import { sql } from "@/lib/neon";
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
  // Neon read replica — all dashboard reads go through Neon
  getStats: async (storeId: string): Promise<DashboardStats> => {
    const rows = await sql`
      SELECT * FROM get_manager_dashboard_stats(${storeId}::uuid)
    `;
    return rows[0] as DashboardStats;
  },
  getMissingMetrics: async (storeId: string): Promise<MissingMetrics> => {
    const rows = await sql`
      SELECT * FROM get_dashboard_missing_metrics(${storeId}::uuid)
    `;
    return rows[0] as unknown as MissingMetrics;
  },
  getMonthlyTrend: async (storeId: string): Promise<MonthlyTrend> => {
    const rows = await sql`
      SELECT * FROM get_monthly_trend_metrics(${storeId}::uuid)
    `;
    return rows[0] as unknown as MonthlyTrend;
  },
  getRetailKpis: async (storeId: string, days = 30): Promise<RetailKpis> => {
    const rows = await sql`
      SELECT * FROM get_retail_kpis(${storeId}::uuid, ${days}::int)
    `;
    return rows[0] as RetailKpis;
  },
  getCashflowData: async (storeId: string, days = 7): Promise<CashflowData[]> => {
    const rows = await sql`
      SELECT * FROM get_cashflow_data(${storeId}::uuid, ${days}::int)
    `;
    return (rows as unknown as CashflowData[]) || [];
  },
  getLowStock: async (storeId: string) => {
    const rows = await sql`
      SELECT * FROM get_low_stock_items(${storeId}::uuid)
    `;
    return rows;
  },
};