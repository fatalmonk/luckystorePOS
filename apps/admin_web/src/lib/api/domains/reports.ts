import { supabase } from "@/lib/supabase";
import { query } from "@/lib/neon";

export const reports = {
  // Sales Report - get sales data with date range (Neon read replica)
  getSalesReport: async (storeId: string, startDate: string, endDate: string) => {
    const sales = await query<any>(
      `SELECT id, total_amount, created_at
       FROM sales
       WHERE store_id = $1
         AND status = 'completed'
         AND created_at >= $2
         AND created_at <= $3`,
      [storeId, startDate, endDate + 'T23:59:59']
    );

    if (sales.length === 0) {
      return { totalRevenue: 0, transactionCount: 0, avgTicket: 0, topProducts: [], dailySales: [] };
    }

    const saleIds = sales.map((s: any) => s.id);

    // Get top selling products
    const saleItems = await query<any>(
      `SELECT qty, price, item_id
       FROM sale_items
       WHERE sale_id = ANY($1::uuid[])`,
      [saleIds]
    );

    // Resolve item names
    const itemIds = [...new Set(saleItems.map((i: any) => i.item_id))];
    const itemNames = itemIds.length > 0
      ? await query<any>(`SELECT id, name FROM items WHERE id = ANY($1::uuid[])`, [itemIds])
      : [];

    const nameMap = new Map(itemNames.map((i: any) => [i.id, i.name]));

    // Aggregate top products by quantity
    const productMap = new Map();
    saleItems.forEach((item: any) => {
      const name = nameMap.get(item.item_id) || 'Unknown';
      const existing = productMap.get(name) || { name, quantity: 0, revenue: 0 };
      existing.quantity += item.qty || 0;
      existing.revenue += (item.qty || 0) * (item.price || 0);
      productMap.set(name, existing);
    });

    const topProducts = Array.from(productMap.values())
      .sort((a: any, b: any) => b.quantity - a.quantity)
      .slice(0, 10);

    // Group sales by day
    const dailyMap = new Map();
    sales.forEach((sale: any) => {
      const day = (sale.created_at as string).split('T')[0];
      const existing = dailyMap.get(day) || { date: day, revenue: 0, count: 0 };
      existing.revenue += sale.total_amount || 0;
      existing.count += 1;
      dailyMap.set(day, existing);
    });

    const dailySales = Array.from(dailyMap.values()).sort((a: any, b: any) => a.date.localeCompare(b.date));

    const totalRevenue = sales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
    const transactionCount = sales.length;
    const avgTicket = transactionCount > 0 ? totalRevenue / transactionCount : 0;

    return { totalRevenue, transactionCount, avgTicket, topProducts, dailySales };
  },

  // Inventory Value Report (Neon read replica)
  getInventoryValue: async (storeId: string) => {
    const items = await query<any>(
      `SELECT id, name, sku, cost, price, is_active
       FROM items
       WHERE is_active = true`
    );

    const stockLevels = await query<any>(
      `SELECT item_id, qty
       FROM stock_levels
       WHERE store_id = $1`,
      [storeId]
    );

    const stockMap = new Map(stockLevels.map((s: any) => [s.item_id, s.qty]));

    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const inventory = items.map((item: any) => {
      const qty = stockMap.get(item.id) || 0;
      const value = (item.cost || 0) * qty;
      totalValue += value;
      if (qty === 0) outOfStockCount++;
      else if (qty <= 5) lowStockCount++;
      return {
        id: item.id,
        name: item.name,
        sku: item.sku,
        qty,
        cost: item.cost || 0,
        totalValue: value,
      };
    });

    inventory.sort((a, b) => b.totalValue - a.totalValue);

    return { totalValue, totalItems: items.length, lowStockCount, outOfStockCount, inventory };
  },

  // Profit & Loss Report (Neon read replica)
  getProfitLoss: async (storeId: string, startDate: string, endDate: string) => {
    const sales = await query<any>(
      `SELECT id, total_amount
       FROM sales
       WHERE store_id = $1
         AND status = 'completed'
         AND created_at >= $2
         AND created_at <= $3`,
      [storeId, startDate, endDate + 'T23:59:59']
    );

    const grossRevenue = sales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);

    const saleIds = sales.map((s: any) => s.id);
    const saleItems = saleIds.length > 0
      ? await query<any>(`SELECT qty, cost FROM sale_items WHERE sale_id = ANY($1::uuid[])`, [saleIds])
      : [];

    const cogs = saleItems.reduce((sum: number, item: any) => sum + ((item.qty || 0) * (item.cost || 0)), 0);

    const expenses = await query<any>(
      `SELECT amount
       FROM expenses
       WHERE store_id = $1
         AND expense_date >= $2
         AND expense_date <= $3`,
      [storeId, startDate, endDate]
    );

    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const grossProfit = grossRevenue - cogs;
    const netProfit = grossProfit - totalExpenses;

    return { grossRevenue, cogs, grossProfit, totalExpenses, netProfit };
  },
};