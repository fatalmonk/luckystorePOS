/**
 * Inventory item types for dashboard and editing
 * Unified source of truth for InventoryItem interface
 * See: https://github.com/fatalmonk/luckystorePOS/issues/...
 */

export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  current_qty: number;
  reorder_status: string;
  last_updated?: string;
  price?: number;
  cost?: number;
  mrp?: number;
  category_id?: string;
  category_name?: string;
  image_url?: string;
  last_purchased_date?: string;
  min_qty?: number;
  active?: boolean;
}

export const INVENTORY_NUMERIC_FIELDS = ['price', 'cost', 'mrp', 'current_qty'] as const;
export type InventoryNumericField = typeof INVENTORY_NUMERIC_FIELDS[number];

export type InventoryEditableField = keyof InventoryItem;
