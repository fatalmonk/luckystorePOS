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
    const row = rows[0] || {};
    return {
      total_sales: Number(row.total_sales ?? 0),
      user: row.user ?? { name: 'Mohammed' },
    };
  },
  getMissingMetrics: async (storeId: string): Promise<MissingMetrics> => {
    const rows = await query<any>(
      `SELECT * FROM get_dashboard_missing_metrics($1::uuid)`,
      [storeId]
    );
    const row = rows[0] || {};
    return {
      toReceive: Number(row.toReceive ?? 0),
      toGive: Number(row.toGive ?? 0),
      totalBalance: Number(row.totalBalance ?? 0),
    };
  },
  getMonthlyTrend: async (storeId: string): Promise<MonthlyTrend> => {
    const rows = await query<any>(
      `SELECT * FROM get_monthly_trend_metrics($1::uuid)`,
      [storeId]
    );
    const row = rows[0] || {};
    return {
      sales: row.sales ?? { amount: 0, trend: 0 },
      purchase: row.purchase ?? { amount: 0, trend: 0 },
      expense: row.expense ?? { amount: 0, trend: 0 },
    };
  },
  getRetailKpis: async (storeId: string, days = 30): Promise<RetailKpis> => {
    const rows = await query<any>(
      `SELECT * FROM get_retail_kpis($1::uuid, $2::int)`,
      [storeId, days]
    );
    const row = rows[0] || {};
    return {
      atv: Number(row.atv ?? 0),
      upt: Number(row.upt ?? 0),
      gross_margin_pct: Number(row.gross_margin_pct ?? 0),
    };
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