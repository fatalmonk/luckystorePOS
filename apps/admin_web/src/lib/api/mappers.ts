// =============================================================================
// RPC-to-Domain Mappers for POS
// Fail-fast on critical field corruption to prevent silent bugs
// =============================================================================

import type { PosProduct, PosCategory, Reminder, ReminderType } from './types';
import { createDebugLogger } from '../debug';

const debugLog = createDebugLogger('POS Mapper');

/**
 * Maps a row from search_items_pos or lookup_item_by_scan to PosProduct
 * @throws Error if critical fields (id, price) are missing or invalid
 */
export function mapSearchItem(row: any): PosProduct {
  debugLog('Raw search item', row);

  // Fail-fast: id is non-negotiable
  if (!row.id && !row.item_id) {
    throw new Error(
      `Invalid item: missing id. Raw: ${JSON.stringify(row)}`
    );
  }

  // Fail-fast: price must exist and be > 0
  const price = Number(row.price ?? row.unit_price ?? NaN);
  if (Number.isNaN(price) || price <= 0) {
    throw new Error(
      `Item ${row.name ?? row.id ?? 'unknown'} has invalid price: ${row.price}`
    );
  }

  const product: PosProduct = {
    id: row.id ?? row.item_id,
    name: row.name ?? 'Unknown',
    sku: row.sku,
    barcode: row.barcode,
    shortCode: row.short_code,
    brand: row.brand,
    price,
    cost: row.cost ? Number(row.cost) : undefined,
    stock: Number(row.qty_on_hand ?? row.stock ?? 0),
    category: row.category,
    categoryId: row.category_id,
    imageUrl: row.image_url,
    groupTag: row.group_tag,
  };

  debugLog('Mapped product', product);
  return product;
}

/**
 * Maps a row from get_pos_categories to PosCategory
 * @throws Error if id is missing
 */
export function mapCategory(row: any): PosCategory {
  debugLog('Raw category', row);

  if (!row.id) {
    throw new Error(
      `Invalid category: missing id. Raw: ${JSON.stringify(row)}`
    );
  }

  const category: PosCategory = {
    id: row.id,
    name: row.name ?? 'Uncategorized',
    itemCount: Number(row.item_count ?? 0),
  };

  debugLog('Mapped category', category);
  return category;
}

/**
 * Maps an array of rows from search_items_pos to PosProduct[]
 * Handles null/empty JSONB responses gracefully
 */
export function mapSearchItems(rows: any): PosProduct[] {
  if (!rows) {
    debugLog('Search items response is null/empty', rows);
    return [];
  }

  // If rows is already an array, map it
  if (Array.isArray(rows)) {
    return rows.map(mapSearchItem);
  }

  // If rows is a single object, wrap it
  if (typeof rows === 'object') {
    return [mapSearchItem(rows)];
  }

  debugLog('Unexpected search items response type', { type: typeof rows, rows });
  return [];
}

/**
 * Maps an array of rows from get_pos_categories to PosCategory[]
 * Handles null/empty JSONB responses gracefully
 */
export function mapCategories(rows: any): PosCategory[] {
  if (!rows) {
    debugLog('Categories response is null/empty', rows);
    return [];
  }

  // If rows is already an array, map it
  if (Array.isArray(rows)) {
    return rows.map(mapCategory);
  }

  // If rows is a single object, wrap it
  if (typeof rows === 'object') {
    return [mapCategory(rows)];
  }

  debugLog('Unexpected categories response type', { type: typeof rows, rows });
  return [];
}

/**
 * Maps a row from reminders table / RPC to Reminder domain type
 */
export function mapReminder(row: any): Reminder {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    storeId: row.store_id,
    title: row.title,
    description: row.description,
    reminderDate: row.reminder_date,
    reminderType: row.reminder_type as ReminderType,
    isCompleted: row.is_completed,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps an array of reminder rows to Reminder[]
 */
export function mapReminders(rows: any): Reminder[] {
  if (!rows) return [];
  if (Array.isArray(rows)) return rows.map(mapReminder);
  if (typeof rows === 'object') return [mapReminder(rows)];
  return [];
}
