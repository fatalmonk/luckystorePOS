export interface SalesHistoryRow {
  id: string;
  sale_number: string;
  created_at: string;
  cashier_name: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  status: 'completed' | 'voided' | 'pending';
  void_reason?: string;
  voided_by_name?: string;
  voided_at?: string;
}

export interface InventoryListRow {
  id: string;
  sku: string;
  name: string;
  category_name: string;
  unit_cost: number;
  unit_price: number;
  current_stock: number;
  min_stock_level: number;
  status: 'active' | 'inactive';
  vendor_name?: string;
}

export interface SaleDetailsResponse {
  sale: SalesHistoryRow;
  items: {
    id: string;
    item_name: string;
    sku: string;
    qty: number;
    unit_price: number;
    line_total: number;
  }[];
  payments: {
    method_name: string;
    amount: number;
    reference?: string;
  }[];
}

export interface DashboardStats {
  today_sales: number;
  today_revenue: number;
  low_stock_items: number;
  pending_purchases: number;
  monthly_revenue: number;
  monthly_profit: number;
}
