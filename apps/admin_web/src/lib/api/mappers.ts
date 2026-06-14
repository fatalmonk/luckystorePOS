// =============================================================================
// RPC-to-Domain Mappers for POS
// Fail-fast on critical field corruption to prevent silent bugs
// =============================================================================

import type { PosProduct, PosCategory, Reminder, ReminderType } from './types';
import { createDebugLogger } from '../debug';

const debugLog = createDebugLogger('POS Mapper');

// Loose but type-safe row shape for raw RPC/table responses
type Row = Record<string, unknown>;

const asStr = (val: unknown): string | undefined =>
  typeof val === 'string' ? val : val != null ? String(val) : undefined;

const asNum = (val: unknown): number =>
  typeof val === 'number' ? val : val != null ? Number(val) : NaN;

/**
 * Maps a row from search_items_pos or lookup_item_by_scan to PosProduct
 * @throws Error if critical fields (id, price) are missing or invalid
 */
export function mapSearchItem(row: Row): PosProduct {
  debugLog('Raw search item', row);

  const id = asStr(row.id ?? row.item_id);
  if (!id) {
    throw new Error(
      `Invalid item: missing id. Raw: ${JSON.stringify(row)}`
    );
  }

  // Allow price to be 0 for giveaways/samples/etc.
  const price = asNum(row.price ?? row.unit_price);
  if (Number.isNaN(price) || price < 0) {
    throw new Error(
      `Item ${asStr(row.name) ?? id} has invalid price: ${row.price}`
    );
  }

  const product: PosProduct = {
    id,
    name: asStr(row.name) ?? 'Unknown',
    sku: asStr(row.sku),
    barcode: asStr(row.barcode),
    shortCode: asStr(row.short_code),
    brand: asStr(row.brand),
    price,
    cost: row.cost != null ? asNum(row.cost) : undefined,
    mrp: row.mrp != null ? asNum(row.mrp) : undefined,
    stock: Number(row.qty_on_hand ?? row.stock ?? 0) || 0,
    category: asStr(row.category),
    categoryId: asStr(row.category_id),
    imageUrl: asStr(row.image_url),
    groupTag: asStr(row.group_tag),
  };

  debugLog('Mapped product', product);
  return product;
}

/**
 * Maps a row from get_pos_categories to PosCategory
 * @throws Error if id is missing
 */
export function mapCategory(row: Row): PosCategory {
  debugLog('Raw category', row);

  const id = asStr(row.id);
  if (!id) {
    throw new Error(
      `Invalid category: missing id. Raw: ${JSON.stringify(row)}`
    );
  }

  const category: PosCategory = {
    id,
    name: asStr(row.name) ?? 'Uncategorized',
    itemCount: Number(row.item_count ?? 0),
  };

  debugLog('Mapped category', category);
  return category;
}

/**
 * Maps an array of rows from search_items_pos to PosProduct[]
 * Handles null/empty JSONB responses gracefully
 */
export function mapSearchItems(rows: unknown): PosProduct[] {
  if (!rows) {
    debugLog('Search items response is null/empty', rows);
    return [];
  }

  // If rows is already an array, map it safely
  if (Array.isArray(rows)) {
    return rows.reduce((acc: PosProduct[], row) => {
      try {
        acc.push(mapSearchItem(row as Row));
      } catch (err) {
        console.warn('Skipping invalid POS item:', err);
      }
      return acc;
    }, []);
  }

  // If rows is a single object, wrap it
  if (typeof rows === 'object') {
    try {
      return [mapSearchItem(rows as Row)];
    } catch (err) {
      console.warn('Skipping invalid POS item:', err);
      return [];
    }
  }

  debugLog('Unexpected search items response type', { type: typeof rows, rows });
  return [];
}

/**
 * Maps an array of rows from get_pos_categories to PosCategory[]
 * Handles null/empty JSONB responses gracefully
 */
export function mapCategories(rows: unknown): PosCategory[] {
  if (!rows) {
    debugLog('Categories response is null/empty', rows);
    return [];
  }

  // If rows is already an array, map it
  if (Array.isArray(rows)) {
    return rows.map((row) => mapCategory(row as Row));
  }

  // If rows is a single object, wrap it
  if (typeof rows === 'object') {
    return [mapCategory(rows as Row)];
  }

  debugLog('Unexpected categories response type', { type: typeof rows, rows });
  return [];
}

/**
 * Maps a row from reminders table / RPC to Reminder domain type
 */
export function mapReminder(row: Row): Reminder {
  return {
    id: asStr(row.id) ?? '',
    tenantId: asStr(row.tenant_id) ?? '',
    storeId: asStr(row.store_id) ?? '',
    title: asStr(row.title) ?? '',
    description: asStr(row.description) ?? null,
    reminderDate: asStr(row.reminder_date) ?? '',
    reminderType: (asStr(row.reminder_type) as ReminderType) ?? 'other',
    isCompleted: Boolean(row.is_completed),
    createdBy: asStr(row.created_by) ?? null,
    createdAt: asStr(row.created_at) ?? '',
    updatedAt: asStr(row.updated_at) ?? '',
  };
}

/**
 * Maps an array of reminder rows to Reminder[]
 */
export function mapReminders(rows: unknown): Reminder[] {
  if (!rows) return [];
  if (Array.isArray(rows)) return rows.map((row) => mapReminder(row as Row));
  if (typeof rows === 'object') return [mapReminder(rows as Row)];
  return [];
}
