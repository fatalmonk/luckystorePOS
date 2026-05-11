import { Database } from '../lib/database.types';

export type Party = Database['public']['Tables']['parties']['Row'] & {
  current_balance?: number;
};

export type LedgerEntry = Database['public']['Tables']['ledger_entries']['Row'];

export interface DashboardStats {
  total_sales: number;
  total_expenses: number;
  net_profit: number;
  customer_receivables: number;
  supplier_payables: number;
  low_stock_count: number;
  daily_performance: {
    sale_date: string;
    total_sales: number;
    daily_expense: number;
    stock_purchase: number;
  }[];
}

export interface LowStockItem {
  id: string;
  name: string;
  current_qty: number;
  min_qty: number;
  reorder_status: string;
}
