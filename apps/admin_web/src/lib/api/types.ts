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
  | 'Capital Expenditure'
  | 'Utility Expenses'
  | 'Transport & Conveyance'
  | 'Staff salary'
  | 'Partners Take'
  | 'All Other Expenses';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
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
