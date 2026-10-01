import { type ReceiptOcrResult } from './receiptOcr';

export type Supplier = {
  id: string;
  name: string;
  phone?: string;
};

export type Item = {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  cost?: number;
  price?: number;
  mrp?: number;
  brand?: string;
  category_id?: string | null;
  image_url?: string | null;
};

export type Category = {
  id: string;
  name: string | null;
  category: string;
  parent_id: string | null;
  active: boolean | null;
};

export type ReceiptLine = {
  item: Item;
  quantity: number;
  unitCost: number;
};

export type PendingOcrItem = ReceiptOcrResult['items'][number] & {
  scanId: string;
  match?: Item;
  candidates?: Item[];
  selectedMatchId?: string;
};

export type PaymentMethod = 'Cash' | 'Bank transfer' | 'Bkash';

export type Account = {
  id: string;
  code: string;
  name: string;
  account_type: string;
};

export type PurchaseRpcArgs = {
  p_idempotency_key: string;
  p_tenant_id: string | null;
  p_store_id: string | null;
  p_supplier_id: string;
  p_invoice_number: string | null;
  p_invoice_total: number | null;
  p_items: Array<{ item_id: string; quantity: number; unit_cost: number }>;
  p_amount_paid: number;
  p_payment_account_id: string | null;
  p_payable_account_id: string | null;
  p_status: 'draft' | 'posted';
  p_notes: string | null;
};

export type PurchaseFormSnapshot = {
  supplierSearch: string;
  selectedSupplier: Supplier | null;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceTotal: string;
  lines: ReceiptLine[];
  amountPaid: string;
  paymentMethod: PaymentMethod;
  itemSearch: string;
  quickQty: number;
  quickCost: string;
  pendingOcrItems: PendingOcrItem[];
  receiptScanId?: string | null;
  scannedReceiptUrl?: string | null;
  scannedReceiptKey?: string | null;
};

export type PurchaseRetryAttempt = {
  idempotencyKey: string;
  form: PurchaseFormSnapshot;
  args: PurchaseRpcArgs;
};

export type PurchaseDraftSnapshot = PurchaseFormSnapshot & {
  idempotencyKey?: string;
  retryAttempt?: PurchaseRetryAttempt;
};
