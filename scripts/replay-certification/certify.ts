// scripts/replay-certification/certify.ts
import { db, Database } from './db';
import { assertInvariants } from './invariants';
import { testConvergence } from './convergence_test';
import { testDuplicateDelivery } from './duplicate_delivery';
import { testCrashRecovery } from './crash_recovery';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { replay, ReplayOp } from './replay_runner';
import { ReplayModel, ReplayOperation, assertReplayInvariants } from './model';
import * as crypto from 'crypto';

export interface TestContext {
  tenantId: string;
  storeId: string;
  itemId: string;
}

async function bootstrap(): Promise<TestContext> {
  console.log('[REPLAY-CERT] Bootstrapping deterministic test environment...');
  
  const tenantId = '00000000-0000-0000-0000-000000000000';
  const storeId = '11111111-1111-1111-1111-111111111111';
  const itemId = '22222222-2222-2222-2222-222222222222';

  const tableCheck = await db.query(`
    SELECT json_build_object(
      'has_stock_ledger', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_ledger'),
      'has_inventory_movements', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_movements'),
      'has_tenant_slug', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'slug'),
      'has_item_is_active', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'is_active'),
      'has_item_active', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'active'),
      'has_stock_level_qty_on_hand', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock_levels' AND column_name = 'qty_on_hand')
    );
  `);
  const meta = JSON.parse(tableCheck.rows[0].json_build_object);

  // 1. TDR (Tear Down & Reset)
  const teardownQueries: string[] = [];
  if (meta.has_inventory_movements) {
    teardownQueries.push(`
      ALTER TABLE inventory_movements DISABLE TRIGGER enforce_append_only;
      DELETE FROM inventory_movements WHERE tenant_id = '${tenantId}';
      ALTER TABLE inventory_movements ENABLE TRIGGER enforce_append_only;
    `);
  }
  if (meta.has_stock_ledger) {
    teardownQueries.push(`
      DELETE FROM stock_ledger WHERE product_id = '${itemId}';
      DELETE FROM stock_movements WHERE item_id = '${itemId}';
    `);
  }
  teardownQueries.push(`
    DELETE FROM stock_levels WHERE store_id = '${storeId}';
    DELETE FROM items WHERE id = '${itemId}';
    DELETE FROM stores WHERE id = '${storeId}';
    DELETE FROM tenants WHERE id = '${tenantId}';
  `);
  await db.execute(teardownQueries.join('\n'));

  // 2. Seed
  const tenantSlug = meta.has_tenant_slug ? ", 'replay-test-tenant'" : '';
  const tenantSlugCol = meta.has_tenant_slug ? ', slug' : '';
  const itemActiveCol = meta.has_item_is_active ? ', is_active' : (meta.has_item_active ? ', active' : '');
  const itemActiveVal = itemActiveCol ? ', true' : '';
  const qtyCol = meta.has_stock_level_qty_on_hand ? 'qty_on_hand' : 'qty';

  await db.execute(`
    INSERT INTO tenants (id, name${tenantSlugCol}) VALUES ('${tenantId}', 'Replay Test Tenant'${tenantSlug});
    INSERT INTO stores (id, tenant_id, name, code) VALUES ('${storeId}', '${tenantId}', 'Replay Test Store', 'TEST-001');
    INSERT INTO items (id, tenant_id, name, sku, price, cost${itemActiveCol}) VALUES ('${itemId}', '${tenantId}', 'Replay Item', 'TEST-SKU', 10.00, 5.00${itemActiveVal});
    INSERT INTO stock_levels (store_id, item_id, ${qtyCol}) VALUES ('${storeId}', '${itemId}', 1000);
  `);

  return { tenantId, storeId, itemId };
}

/**
 * Level 3 Cross-Check / Hybrid Replay Engine
 * Executes a trace of operations on both Level 1 (model) and Level 2 (database),
 * then asserts 100% state fingerprint parity between both (Level 3).
 */
export async function executeHybridReplay(
  testIds: TestContext,
  trace: ReplayOp[],
  initialStock: number = 1000
) {
  console.log(`\n--- Running Hybrid Replay Trace [${trace.length} operations] ---`);

  // --- LEVEL 1: Pure Deterministic Model Replay ---
  const model = new ReplayModel({ [testIds.itemId]: initialStock });
  for (const op of trace) {
    if (op.rpc !== 'deduct_stock') {
      throw new Error(`Unsupported model RPC type: ${op.rpc}`);
    }
    const modelOp: ReplayOperation = {
      operationId: op.params.p_operation_id,
      transactionTraceId: op.params.p_operation_id,
      storeId: op.params.p_store_id,
      cashierId: '00000000-0000-0000-0000-000000000000',
      lines: [{
        itemId: op.params.p_item_id,
        quantity: op.params.p_quantity
      }]
    };
    model.apply(modelOp);
  }
  assertReplayInvariants(model);
  const modelSnap = model.snapshot();

  // --- LEVEL 2: Database-Backed Replay Execution ---
  await replay(trace);
  await assertInvariants(db);

  // --- LEVEL 3: Cross-Check / Parity Verification ---
  const metaCheck = await db.query(`
    SELECT json_build_object(
      'has_stock_ledger', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_ledger'),
      'has_stock_level_qty_on_hand', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock_levels' AND column_name = 'qty_on_hand')
    );
  `);
  const meta = JSON.parse(metaCheck.rows[0].json_build_object);

  const qtyCol = meta.has_stock_level_qty_on_hand ? 'qty_on_hand' : 'qty';
  const dbStockRes = await db.query(`
    SELECT item_id, ${qtyCol} AS qty_on_hand
    FROM stock_levels
    WHERE store_id = '${testIds.storeId}' AND item_id = '${testIds.itemId}'
  `);

  let dbLedgerRes;
  if (meta.has_stock_ledger) {
    dbLedgerRes = await db.query(`
      SELECT (metadata->>'operation_id')::uuid AS operation_id
      FROM stock_ledger
      WHERE product_id = '${testIds.itemId}' AND metadata->>'operation_id' IS NOT NULL
    `);
  } else {
    dbLedgerRes = await db.query(`
      SELECT operation_id
      FROM inventory_movements
      WHERE store_id = '${testIds.storeId}' AND item_id = '${testIds.itemId}' AND operation_id IS NOT NULL
    `);
  }

  // Map database states into a standard comparison footprint
  const dbStock: Record<string, number> = {};
  for (const row of dbStockRes.rows) {
    dbStock[row.item_id] = parseInt(row.qty_on_hand);
  }

  const dbLedger: Record<string, string> = {};
  for (const row of dbLedgerRes.rows) {
    dbLedger[row.operation_id] = 'ACKED';
  }

  // Map model states into standard comparison footprint
  const modelStockComparison: Record<string, number> = {
    [testIds.itemId]: modelSnap.stock[testIds.itemId] ?? 0
  };
  const modelLedgerComparison: Record<string, string> = {};
  for (const opId of Object.keys(modelSnap.ledger)) {
    modelLedgerComparison[opId] = 'ACKED';
  }

  // Sort keys for deterministic JSON serialization
  const sortObject = <T>(obj: Record<string, T>): Record<string, T> => {
    const sorted: Record<string, T> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = obj[key];
    }
    return sorted;
  };

  const modelFootprint = {
    stock: sortObject(modelStockComparison),
    ledger: sortObject(modelLedgerComparison)
  };
  const dbFootprint = {
    stock: sortObject(dbStock),
    ledger: sortObject(dbLedger)
  };

  const modelHash = crypto.createHash('sha256').update(JSON.stringify(modelFootprint)).digest('hex');
  const dbHash = crypto.createHash('sha256').update(JSON.stringify(dbFootprint)).digest('hex');

  if (modelHash !== dbHash) {
    console.error('❌ LEVEL 3 DRIFT DETECTED between Model and Database!');
    console.error('Model Comparison Footprint:', JSON.stringify(modelFootprint, null, 2));
    console.error('Database Comparison Footprint:', JSON.stringify(dbFootprint, null, 2));
    throw new Error(`LEVEL_3_DRIFT: Model ${modelHash} !== DB ${dbHash}`);
  }

  console.log('✨ LEVEL 3 PARITY SECURED: Model (Level 1) and DB (Level 2) are 100% in sync!');
}

async function runCertification() {
  console.log('🚀 STARTING FORMAL REPLAY CERTIFICATION (LEVEL 1 + 2 + 3)...\n');

  try {
    const testIds = await bootstrap();

    // 1. Convergence Permutation
    await testConvergence(testIds);

    // 2. Duplicate Delivery
    await testDuplicateDelivery(testIds);

    // 3. Crash Recovery
    await testCrashRecovery(testIds);

    const finalHash = crypto.createHash('sha256').update(JSON.stringify(await db.query(`SELECT * FROM stock_levels`))).digest('hex');

    const artifact = {
      certified: true,
      deterministic: true,
      duplicate_safe: true,
      crash_safe: true,
      levels_verified: [1, 2, 3],
      state_hash: finalHash,
      timestamp: new Date().toISOString()
    };

    const dir = resolve(process.cwd(), 'artifacts/certification');
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'replay-certification.json'), JSON.stringify(artifact, null, 2));

    console.log('\n🏆 FORMAL REPLAY CERTIFICATION SECURED AND CERTIFIED.');
    console.log(`Artifact saved to: artifacts/certification/replay-certification.json`);
    
  } catch (e) {
    console.error('\n❌ CERTIFICATION FAILED:', e);
    process.exit(1);
  }
}

// Only run if executing directly
if (require.main === module) {
  runCertification();
}
