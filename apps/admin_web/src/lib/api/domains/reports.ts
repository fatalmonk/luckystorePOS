import { supabase } from '../../supabase';

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

    // Get top selling products
    const { data: saleItems, error: itemsError } = await supabase
      .from('sale_items')
      .select('qty, price, item_id')
      .in('sale_id', (sales as any[]).map((s) => s.id) || []);

    if (itemsError) throw itemsError;

    // Resolve item names
    const itemIds = [...new Set((saleItems as any[]).map((i) => i.item_id) || [])];
    const { data: itemNames } = await supabase
      .from('items')
      .select('id, name')
      .in('id', itemIds as string[]);

    const nameMap = new Map((itemNames as any[]).map((i) => [i.id, i.name]) || []);

    // Aggregate top products by quantity
    const productMap = new Map();
    (saleItems as any[]).forEach((item) => {
      const name = nameMap.get(item.item_id) || 'Unknown';
      const existing = productMap.get(name) || { name, quantity: 0, revenue: 0 };
      existing.quantity += (item.qty || 0) as number;
      existing.revenue += ((item.qty || 0) as number) * ((item.price || 0) as number);
      productMap.set(name, existing);
    });

    const topProducts = Array.from(productMap.values())
      .sort((a: any, b: any) => b.quantity - a.quantity)
      .slice(0, 10);

    // Group sales by day
    const dailyMap = new Map();
    (sales as any[]).forEach((sale) => {
      const day = (sale.created_at as string).split('T')[0];
      const existing = dailyMap.get(day) || { date: day, revenue: 0, count: 0 };
      existing.revenue += (sale.total_amount || 0) as number;
      existing.count += 1;
      dailyMap.set(day, existing);
    });

    const dailySales = Array.from(dailyMap.values()).sort((a: any, b: any) => a.date.localeCompare(b.date));

    const totalRevenue = (sales as any[]).reduce((sum: number, s) => sum + ((s.total_amount || 0) as number), 0) || 0;
    const transactionCount = sales?.length || 0;
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

    const stockMap = new Map((stockLevels as any[]).map((s) => [s.item_id, s.qty]) || []);

    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const inventory = (items as any[])?.map((item) => {
      const qty = stockMap.get(item.id as string) || 0;
      const value = ((item.cost || 0) as number) * (qty as number);
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
    }) || [];

    // Sort by total value descending
    inventory.sort((a, b) => (b.totalValue as number) - (a.totalValue as number));

    return { totalValue, totalItems: (items as any[])?.length || 0, lowStockCount, outOfStockCount, inventory };
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

    const grossRevenue = (sales as any[])?.reduce((sum: number, s) => sum + ((s.total_amount || 0) as number), 0) || 0;

    // Get COGS from sale_items
    const { data: saleItems, error: itemsError } = await supabase
      .from('sale_items')
      .select('qty, cost')
      .in('sale_id', (sales as any[])?.map((s) => s.id) || []);

    if (itemsError) throw itemsError;

    const cogs = (saleItems as any[])?.reduce((sum: number, item) => sum + (((item.qty || 0) as number) * ((item.cost || 0) as number)), 0) || 0;

    // Get expenses
    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('amount')
      .eq('store_id', storeId)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate);

    if (expError) throw expError;

    const totalExpenses = (expenses as any[])?.reduce((sum: number, e) => sum + ((e.amount || 0) as number), 0) || 0;
    const grossProfit = grossRevenue - cogs;
    const netProfit = grossProfit - totalExpenses;

    return { grossRevenue, cogs, grossProfit, totalExpenses, netProfit };
  },
};