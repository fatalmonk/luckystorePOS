import { z } from 'zod';

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
  available_qty?: number;
  reserved_qty?: number;
  reorder_status: string;
  last_updated?: string;
  price?: number;
  cost?: number;
  mrp?: number;
  margin_pct?: number;
  total_value?: number;
  category_id?: string;
  category_name?: string;
  image_url?: string;
  last_purchased_date?: string;
  min_qty?: number;
  is_active?: boolean;
}

export const INVENTORY_NUMERIC_FIELDS = ['price', 'cost', 'mrp', 'current_qty', 'available_qty', 'reserved_qty', 'margin_pct', 'total_value'] as const;
export type InventoryNumericField = typeof INVENTORY_NUMERIC_FIELDS[number];

export type InventoryEditableField = keyof InventoryItem;

// Schema for validating inventory search and filter inputs
export const InventoryFilterSchema = z.object({
  searchQuery: z.string().max(100).optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'ALL']).default('ALL'),
  sortBy: z.enum(['name', 'price', 'current_qty', 'total_value', 'margin_pct']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type InventoryFilterParams = z.infer<typeof InventoryFilterSchema>;
