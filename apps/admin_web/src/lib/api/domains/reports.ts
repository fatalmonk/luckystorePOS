import { supabase } from "@/lib/supabase";

export const reports = {
  // Single RPC call — all aggregation done server-side in Postgres
  getSalesReport: async (storeId: string, startDate: string, endDate: string) => {
    const { data, error } = await (supabase.rpc as any)('get_sales_report', {
      p_store_id: storeId,
      p_start_date: startDate,
      p_end_date: endDate,
    });
    if (error) throw error;
    const result = (data as any) || {};
    return {
      totalRevenue:     Number(result.totalRevenue ?? 0),
      transactionCount: Number(result.transactionCount ?? 0),
      avgTicket:        Number(result.avgTicket ?? 0),
      topProducts:      result.topProducts ?? [],
      dailySales:       result.dailySales ?? [],
    };
  },

  getInventoryValue: async (storeId: string) => {
    const { data, error } = await (supabase.rpc as any)('get_inventory_value', {
      p_store_id: storeId,
    });
    if (error) throw error;
    const result = (data as any) || {};
    return {
      totalValue:      Number(result.totalValue ?? 0),
      totalItems:      Number(result.totalItems ?? 0),
      lowStockCount:   Number(result.lowStockCount ?? 0),
      outOfStockCount: Number(result.outOfStockCount ?? 0),
      inventory:       result.inventory ?? [],
    };
  },

  getProfitLoss: async (storeId: string, startDate: string, endDate: string) => {
    const { data, error } = await (supabase.rpc as any)('get_profit_loss', {
      p_store_id: storeId,
      p_start_date: startDate,
      p_end_date: endDate,
    });
    if (error) throw error;
    const result = (data as any) || {};
    return {
      grossRevenue:  Number(result.grossRevenue ?? 0),
      cogs:          Number(result.cogs ?? 0),
      grossProfit:   Number(result.grossProfit ?? 0),
      totalExpenses: Number(result.totalExpenses ?? 0),
      netProfit:     Number(result.netProfit ?? 0),
    };
  },
};