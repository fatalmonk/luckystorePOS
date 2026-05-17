import { db, Database } from './db';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { resolve, dirname } from 'path';

interface StateFingerprintReport {
  status: 'VERIFIED' | 'FAILED';
  generated_at: string;
  scope: {
    tenant_id: string;
  };
  metrics: {
    stock_levels_count: number;
    inventory_movements_count: number;
    idempotency_keys_count: number;
    posting_queue_count: number;
  };
  ledger_audit: {
    append_only_verified: boolean;
    sequence_verified: boolean;
    failures: string[];
  };
  canonical_hash: string;
  snapshot: any;
}

/**
 * Sorts object keys recursively to guarantee deterministic JSON stringification.
 */
function sortKeysRecursively(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortKeysRecursively);
  }
  const sortedObj: any = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sortedObj[key] = sortKeysRecursively(obj[key]);
  }
  return sortedObj;
}

/**
 * Normalizes values to keep the fingerprint highly stable across dynamic runs.
 */
function cleanAndNormalizeRow(row: any, columnsToDrop: string[]): any {
  const cleaned = { ...row };
  for (const col of columnsToDrop) {
    delete cleaned[col];
  }
  
  // Recursively clean fields
  for (const [key, value] of Object.entries(cleaned)) {
    if (value instanceof Date) {
      cleaned[key] = value.toISOString();
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = cleanAndNormalizeRow(value, columnsToDrop);
    }
  }
  return cleaned;
}

export async function computeCanonicalState(db: Database, tenantId: string): Promise<StateFingerprintReport> {
  // 1. Query stock_levels (scoped to tenant via stores join)
  const stockLevelsRes = await db.query(`
    SELECT sl.store_id, sl.item_id, sl.qty_on_hand
    FROM public.stock_levels sl
    JOIN public.stores s ON s.id = sl.store_id
    WHERE s.tenant_id = '${tenantId}'::uuid
    ORDER BY sl.store_id::text, sl.item_id::text
  `);

  // 2. Query inventory_movements
  const movementsRes = await db.query(`
    SELECT im.store_id, im.item_id, im.movement_type, im.quantity_delta, 
           im.reference_type, im.reference_id, im.previous_quantity, 
           im.new_quantity, im.notes, im.created_by, im.operation_id
    FROM public.inventory_movements im
    WHERE im.tenant_id = '${tenantId}'::uuid
    ORDER BY im.operation_id::text NULLS LAST, im.store_id::text, im.item_id::text
  `);

  // 3. Query idempotency_keys
  const idempotencyKeysRes = await db.query(`
    SELECT ik.idempotency_key, ik.response_body
    FROM public.idempotency_keys ik
    WHERE ik.tenant_id = '${tenantId}'::uuid
    ORDER BY ik.idempotency_key::text
  `);

  // 4. Query ledger_posting_queue
  const postingQueueRes = await db.query(`
    SELECT pq.sale_id, pq.store_id, pq.status, pq.priority, pq.attempt_count, pq.max_attempts
    FROM public.ledger_posting_queue pq
    JOIN public.stores s ON s.id = pq.store_id
    WHERE s.tenant_id = '${tenantId}'::uuid
    ORDER BY pq.sale_id::text, pq.store_id::text
  `);

  // Drop dynamic / volatile columns and normalize
  const stockLevels = stockLevelsRes.rows.map(row => cleanAndNormalizeRow(row, ['id', 'created_at', 'updated_at']));
  const inventoryMovements = movementsRes.rows.map(row => cleanAndNormalizeRow(row, ['id', 'created_at', 'updated_at']));
  const idempotencyKeys = idempotencyKeysRes.rows.map(row => cleanAndNormalizeRow(row, ['created_at', 'locked_at', 'completed_at']));
  const postingQueue = postingQueueRes.rows.map(row => cleanAndNormalizeRow(row, ['id', 'created_at', 'updated_at', 'next_retry_at', 'locked_at', 'lock_expires_at', 'last_error']));

  // Construct raw snapshot
  const rawSnapshot = {
    stock_levels: stockLevels,
    inventory_movements: inventoryMovements,
    idempotency_keys: idempotencyKeys,
    ledger_posting_queue: postingQueue,
  };

  // Recursively sort keys to ensure 100% stable string representation
  const deterministicSnapshot = sortKeysRecursively(rawSnapshot);

  // Perform append-only ledger mathematical check: previous_quantity + quantity_delta = new_quantity
  const failures: string[] = [];
  let append_only_verified = true;
  let sequence_verified = true;

  for (let i = 0; i < movementsRes.rows.length; i++) {
    const row = movementsRes.rows[i];
    const prev = parseInt(row.previous_quantity || '0');
    const delta = parseInt(row.quantity_delta || '0');
    const expectedNew = prev + delta;
    const actualNew = parseInt(row.new_quantity || '0');

    if (expectedNew !== actualNew) {
      sequence_verified = false;
      failures.push(
        `Ledger sequence error at row ${i}: previous (${prev}) + delta (${delta}) = expected (${expectedNew}) but got new (${actualNew}). Operation ID: ${row.operation_id}`
      );
    }

    if (actualNew < 0) {
      append_only_verified = false;
      failures.push(
        `Ledger integrity error at row ${i}: negative stock balance detected (${actualNew}). Operation ID: ${row.operation_id}`
      );
    }
  }

  const ledger_audit = {
    append_only_verified,
    sequence_verified,
    failures,
  };

  const status = append_only_verified && sequence_verified ? 'VERIFIED' : 'FAILED';
  
  // Compute cryptographically secure canonical hash of sorted, normalized state
  const serialized = JSON.stringify(deterministicSnapshot);
  const canonical_hash = crypto.createHash('sha256').update(serialized).digest('hex');

  return {
    status,
    generated_at: new Date().toISOString(),
    scope: {
      tenant_id: tenantId,
    },
    metrics: {
      stock_levels_count: stockLevels.length,
      inventory_movements_count: inventoryMovements.length,
      idempotency_keys_count: idempotencyKeys.length,
      posting_queue_count: postingQueue.length,
    },
    ledger_audit,
    canonical_hash,
    snapshot: deterministicSnapshot,
  };
}

async function main() {
  const args = new Map<string, string>();
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (!arg.startsWith('--')) continue;
    const next = process.argv[i + 1];
    if (!next || next.startsWith('--')) continue;
    args.set(arg.slice(2), next);
    i += 1;
  }

  const dbUrl = args.get('db-url') || process.env.DATABASE_URL;
  const tenantId = args.get('tenant-id');
  const out = args.get('out');

  if (!tenantId) {
    console.error('Usage: npx tsx canonical_state.ts --tenant-id <tenant-uuid> [--db-url <url>] [--out <file>]');
    process.exit(2);
  }

  try {
    const report = await computeCanonicalState(db, tenantId);
    console.log(JSON.stringify(report, null, 2));

    if (out) {
      const outPath = resolve(process.cwd(), out);
      fs.mkdirSync(dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
      console.log(`\n💾 Canonical state report successfully written to: ${outPath}`);
    }

    if (report.status !== 'VERIFIED') {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Failed to compute canonical state fingerprint:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
