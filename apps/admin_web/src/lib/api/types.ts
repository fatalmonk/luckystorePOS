// =============================================================================
// POS Domain Types for Admin Web App
// Aligned with mobile app PosItem structure for parity
// =============================================================================

export interface PosProduct {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  shortCode?: string;
  brand?: string;
  price: number;
  cost?: number;
  mrp?: number;
  stock: number;
  category?: string;
  categoryId?: string;
  imageUrl?: string;
  groupTag?: string;
}

export interface PosCategory {
  id: string;
  name: string;
  itemCount: number;
}

export interface CartItem {
  product: PosProduct;
  qty: number;
  unitPrice: number; // allows price override
  lineTotal: number;
}

export interface PaymentInput {
  accountId: string;
  amount: number;
  reference?: string;
}

export interface SaleResult {
  status: 'success' | 'error';
  batchId?: string;
  saleNumber?: string;
  totalAmount?: number;
  error?: string;
}

export interface SplitPayment {
  id: string;
  accountId: string;
  methodName: string;
  amount: number;
}

export interface HeldCart {
  id: string;
  label: string;
  items: CartItem[];
  discount: number;
  heldAt: number;
}

export type ReminderType = 'payment_due' | 'follow_up' | 'stock_check' | 'other';

export interface Reminder {
  id: string;
  tenantId: string;
  storeId: string;
  title: string;
  description: string | null;
  reminderDate: string;
  reminderType: ReminderType;
  isCompleted: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Expense Domain Types
// Aligned with public.expenses table and record_expense RPC
// =============================================================================

export type ExpensePaymentType = 'Cash' | 'Bank transfer' | 'Bkash' | 'Card';

export type ExpenseCategory =
  | 'Stock Purchase'
  | 'Capital Expenditure'
  | 'Utility Expenses'
  | 'Transport & Conveyance'
  | 'Staff salary'
  | 'Partners Take'
  | 'All Other Expenses';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Stock Purchase',
  'Capital Expenditure',
  'Utility Expenses',
  'Transport & Conveyance',
  'Staff salary',
  'Partners Take',
  'All Other Expenses',
];

export const EXPENSE_PAYMENT_TYPES: ExpensePaymentType[] = [
  'Cash',
  'Bank transfer',
  'Bkash',
  'Card',
];

export interface Expense {
  id: string;
  storeId: string;
  expenseDate: string;
  vendorName: string;
  description: string;
  amount: number;
  paymentType: ExpensePaymentType;
  category: ExpenseCategory;
  ledgerBatchId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseFormData {
  expenseDate: string;
  vendorName: string;
  description: string;
  amount: number;
  paymentType: ExpensePaymentType;
  category: ExpenseCategory;
}

export interface RecordExpenseResult {
  status: 'SUCCESS' | 'ERROR';
  expense_id?: string;
  batch_id?: string;
}

// =============================================================================
// Product CRUD Input Types
// Snake-case keys match the Supabase 'items' table columns
// =============================================================================

export interface ProductCreateInput {
  name: string;
  sku?: string;
  barcode?: string;
  short_code?: string;
  brand?: string;
  price: number;
  cost?: number;
  stock: number;
  category_id?: string;
  image_url?: string;
  group_tag?: string;
}

export type ProductUpdateInput = Partial<ProductCreateInput>;

// =============================================================================
// Receipt Config Update Type
// Matches the parameters of the update_receipt_config_simple RPC
// =============================================================================

export interface ReceiptConfigUpdateInput {
  store_name: string;
  header_text: string;
  footer_text: string;
}

// =============================================================================
// Daily Sales Domain Types
// Aligned with public.daily_sales table
// =============================================================================

export interface DailySale {
  id: string;
  storeId: string;
  saleDate: string;
  cashAmount: number;
  bkashAmount: number;
  creditAmount: number;
  totalSales: number;
  stockPurchase: number;
  dailyExpense: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailySaleFormData {
  saleDate: string;
  cashAmount: number;
  bkashAmount: number;
  creditAmount: number;
  totalSales: number;
  stockPurchase: number;
  dailyExpense: number;
}

// =============================================================================
// Inventory Analytics Types
// =============================================================================

export interface StockValuationItem {
  item_id: string;
  item_name: string;
  sku: string;
  category_name: string;
  qty_on_hand: number;
  unit_cost: number;
  unit_price: number;
  total_cost: number;
  total_value: number;
  margin_pct: number;
}

export interface TopSellingItem {
  item_id: string;
  item_name: string;
  sku: string;
  category_name: string;
  total_qty: number;
  total_revenue: number;
  total_profit: number;
}

export interface SlowMovingItem {
  item_id: string;
  item_name: string;
  sku: string;
  category_name: string;
  qty_on_hand: number;
  total_cost: number;
  last_sold_at: string | null;
}

export interface DailyMovementItem {
  trend_date: string;
  total_in: number;
  total_out: number;
  net_delta: number;
}

// =============================================================================
// Customer & Staff Analytics Types
// =============================================================================

export interface CustomerAnalyticsItem {
  party_id: string;
  customer_name: string;
  phone: string | null;
  total_spent: number;
  purchase_count: number;
  avg_order_value: number;
  last_purchase_date: string | null;
  days_since_last: number | null;
}

export interface StaffPerformanceItem {
  user_id: string;
  staff_name: string;
  role: string;
  total_sales: number;
  total_revenue: number;
  avg_ticket: number;
  total_discounts: number;
  active_days: number;
  revenue_per_day: number;
}

// =============================================================================
// Competitor Price Domain Types
// Aligned with public.competitor_prices table
// =============================================================================

export interface CompetitorPrice {
  id: string;
  item_id: string;
  item_name?: string;  // joined from items
  sku?: string;        // joined from items
  competitor_name: string;
  competitor_price: number;
  competitor_url: string | null;
  scraped_at: string;
  created_at: string;
  updated_at: string;
}

export interface PriceAlert {
  product_id: string;
  product_name: string;
  our_price: number;
  market_avg_price: number;
  price_gap_percent: number;
  competitors: string[];
}

export interface CompetitorPriceFormData {
  item_id: string;
  competitor_name: string;
  competitor_price: number;
  competitor_url?: string;
}

export type CompetitorPriceFilters = {
  itemId?: string;
  competitorName?: string;
  dateFrom?: string;
  dateTo?: string;
};
