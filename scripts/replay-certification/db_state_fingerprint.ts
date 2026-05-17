import { Database } from './db';
import * as crypto from 'crypto';

/**
 * Generates a deterministic footprint of the database state for a specific tenant.
 * Includes stock levels and the inventory movement ledger.
 */
export async function getDBFootprint(db: Database, tenantId: string) {
  // 1. Snapshot Stock Levels (sorted by itemId for determinism)
  const stockRes = await db.query(`
    SELECT item_id, qty_on_hand
    FROM stock_levels
    JOIN stores ON stores.id = stock_levels.store_id
    WHERE stores.tenant_id = '${tenantId}'
    ORDER BY item_id
  `);

  // 2. Snapshot Inventory Movements (sorted by operation_id for determinism)
  const movements = await db.query(`
    SELECT operation_id
    FROM inventory_movements
    WHERE tenant_id = '${tenantId}' AND operation_id IS NOT NULL
    ORDER BY operation_id
  `);

  const stock: Record<string, number> = {};
  for (const row of stockRes.rows) {
    stock[row.item_id] = parseInt(row.qty_on_hand);
  }

  const ledger: Record<string, string> = {};
  for (const row of movements.rows) {
    ledger[row.operation_id] = 'ACKED';
  }

  return { stock, ledger };
}

/**
 * Computes a single hash representing the entire state footprint.
 */
export async function computeStateHash(footprint: any): Promise<string> {
  return crypto.createHash('sha256').update(JSON.stringify(footprint)).digest('hex');
}
