import { db } from './db';
import { client, ReplayOp, replay } from './replay_runner';
import * as crypto from 'crypto';

export interface ReplayTestContext {
  runId: string;
  tenantId: string;
  storeId: string;
  itemId: string;
  userId: string;
  authId: string;
}

/**
 * Creates an isolated test context (tenant, store, item, user) for a replay run.
 * Ensures that no production data is touched and triggers are NOT disabled.
 */
export async function createIsolatedContext(seed: string): Promise<ReplayTestContext> {
  const runId = crypto.randomBytes(8).toString('hex');
  const hash = (s: string) => crypto.createHash('sha256').update(`${runId}-${s}`).digest('hex');
  const toUuid = (h: string) => `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;

  const tenantId = toUuid(hash('tenant'));
  const storeId = toUuid(hash('store'));
  const itemId = toUuid(hash('item'));
  const userId = toUuid(hash('user'));
  const authId = toUuid(hash('auth'));

  console.log(`[REPLAY-HARNESS] Bootstrapping isolated context for run ${runId}...`);

  // Seed baseline data
  await db.execute(`
    INSERT INTO tenants (id, name, slug) VALUES ('${tenantId}', 'Replay Test ${runId}', 'replay-${runId}');
    INSERT INTO stores (id, tenant_id, name, code) VALUES ('${storeId}', '${tenantId}', 'Store ${runId}', 'TEST-${runId.slice(0,4)}');
    INSERT INTO users (id, tenant_id, store_id, auth_id, name, email, role, is_active) 
    VALUES ('${userId}', '${tenantId}', '${storeId}', '${authId}', 'Replay User', 'replay-${runId}@example.com', 'admin', true);
    INSERT INTO items (id, tenant_id, name, sku, price, is_active) 
    VALUES ('${itemId}', '${tenantId}', 'Item ${runId}', 'SKU-${runId.slice(0,4)}', 10.00, true);
    INSERT INTO stock_levels (store_id, item_id, qty_on_hand) VALUES ('${storeId}', '${itemId}', 1000);
  `);

  return { runId, tenantId, storeId, itemId, userId, authId };
}

/**
 * Executes a trace of RPC operations against the real database.
 */
export async function runRealReplay(ctx: ReplayTestContext, trace: ReplayOp[]) {
  console.log(`[REPLAY-HARNESS] Executing trace of ${trace.length} ops on actual DB...`);
  await replay(trace);
}
