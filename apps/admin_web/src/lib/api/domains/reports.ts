import { supabase } from "@/lib/supabase";
import type { Database } from '../../database.types';

type SaleRow = Database['public']['Tables']['sales']['Row'];
type SaleItemRow = Database['public']['Tables']['sale_items']['Row'];
type ItemRow = Database['public']['Tables']['items']['Row'];
type StockLevelRow = Database['public']['Tables']['stock_levels']['Row'];
type ExpenseRow = Database['public']['Tables']['expenses']['Row'];

interface DailySaleStat {
  date: string;
  revenue: number;
  count: number;
}

interface TopProductStat {
  name: string;
  quantity: number;
  revenue: number;
}

export const reports = {
  // Sales Report - get sales data with date range
  getSalesReport: async (storeId: string, startDate: string, endDate: string) => {
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('id, total_amount, created_at')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59');

    if (salesError) throw salesError;

    const typedSales = (sales ?? []) as SaleRow[];

    // Get top selling products
    const { data: saleItems, error: itemsError } = await supabase
      .from('sale_items')
      .select('qty, price, item_id')
      .in('sale_id', typedSales.map((s) => s.id));

    if (itemsError) throw itemsError;

    const typedSaleItems = (saleItems ?? []) as SaleItemRow[];

    // Resolve item names
    const itemIds = [...new Set(typedSaleItems.map((i) => i.item_id).filter(Boolean))] as string[];
    const { data: itemNames } = await supabase
      .from('items')
      .select('id, name')
      .in('id', itemIds);

    const typedItemNames = (itemNames ?? []) as ItemRow[];
    const nameMap = new Map(typedItemNames.map((i) => [i.id, i.name]));

    // Aggregate top products by quantity
    const productMap = new Map<string, TopProductStat>();
    typedSaleItems.forEach((item) => {
      const name = (item.item_id && nameMap.get(item.item_id)) || 'Unknown';
      const existing = productMap.get(name) || { name, quantity: 0, revenue: 0 };
      const qty = item.qty || 0;
      existing.quantity += qty;
      existing.revenue += qty * (item.price || 0);
      productMap.set(name, existing);
    });

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Group sales by day
    const dailyMap = new Map<string, DailySaleStat>();
    typedSales.forEach((sale) => {
      const day = (sale.created_at as string).split('T')[0];
      const existing = dailyMap.get(day) || { date: day, revenue: 0, count: 0 };
      existing.revenue += sale.total_amount || 0;
      existing.count += 1;
      dailyMap.set(day, existing);
    });

    const dailySales = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const totalRevenue = typedSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const transactionCount = typedSales.length;
    const avgTicket = transactionCount > 0 ? totalRevenue / transactionCount : 0;

    return { totalRevenue, transactionCount, avgTicket, topProducts, dailySales };
  },

  // Inventory Value Report
  getInventoryValue: async (storeId: string) => {
    // Get items with their stock levels
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('id, name, sku, cost, price, is_active')
      .eq('is_active', true);

    if (itemsError) throw itemsError;

    // Get stock levels for this store
    const { data: stockLevels, error: stockError } = await supabase
      .from('stock_levels')
      .select('item_id, qty')
      .eq('store_id', storeId);

    if (stockError) throw stockError;

    const typedStockLevels = (stockLevels ?? []) as StockLevelRow[];
    const stockMap = new Map(typedStockLevels.map((s) => [s.item_id, s.qty ?? 0]));

    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const typedItems = (items ?? []) as ItemRow[];
    const inventory = typedItems.map((item) => {
      const qty = stockMap.get(item.id as string) || 0;
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

    // Sort by total value descending
    inventory.sort((a, b) => b.totalValue - a.totalValue);

    return { totalValue, totalItems: typedItems.length, lowStockCount, outOfStockCount, inventory };
  },

  // Profit & Loss Report
  getProfitLoss: async (storeId: string, startDate: string, endDate: string) => {
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('id, total_amount')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59');

    if (salesError) throw salesError;

    const typedSales = (sales ?? []) as SaleRow[];
    const grossRevenue = typedSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

    // Get COGS from sale_items
    const { data: saleItems, error: itemsError } = await supabase
      .from('sale_items')
      .select('qty, cost')
      .in('sale_id', typedSales.map((s) => s.id));

    if (itemsError) throw itemsError;

    const typedSaleItems = (saleItems ?? []) as SaleItemRow[];
    const cogs = typedSaleItems.reduce((sum, item) => sum + ((item.qty || 0) * (item.cost || 0)), 0);

    // Get expenses
    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('amount')
      .eq('store_id', storeId)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate);

    if (expError) throw expError;

    const typedExpenses = (expenses ?? []) as ExpenseRow[];
    const totalExpenses = typedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const grossProfit = grossRevenue - cogs;
    const netProfit = grossProfit - totalExpenses;

    return { grossRevenue, cogs, grossProfit, totalExpenses, netProfit };
  },
};
