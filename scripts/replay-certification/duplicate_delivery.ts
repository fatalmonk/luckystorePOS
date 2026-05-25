// scripts/replay-certification/duplicate_delivery.ts
import { ReplayOp } from './replay_runner';
import { executeHybridReplay, TestContext } from './certify';
import { db } from './db';

export async function testDuplicateDelivery(testIds: TestContext) {
  console.log('[REPLAY-CERT] Running Duplicate Delivery Proof...');
  
  const opId = '00000000-0000-0000-0000-000000000004';
  const op: ReplayOp = {
    rpc: 'deduct_stock',
    params: {
      p_store_id: testIds.storeId,
      p_item_id: testIds.itemId,
      p_quantity: 1,
      p_operation_id: opId
    }
  };

  // Re-seed to a clean slate
  await db.execute(`
    ALTER TABLE inventory_movements DISABLE TRIGGER enforce_append_only;
    DELETE FROM inventory_movements WHERE tenant_id = '${testIds.tenantId}';
    UPDATE stock_levels SET qty_on_hand = 1000 WHERE store_id = '${testIds.storeId}' AND item_id = '${testIds.itemId}';
    ALTER TABLE inventory_movements ENABLE TRIGGER enforce_append_only;
  `);

  // Replay the exact duplicate operation 3 times sequentially
  const trace = [op, op, op];
  await executeHybridReplay(testIds, trace, 1000);

  // Assert in DB that only exactly 1 movement was written
  const result = await db.query(`
    SELECT COUNT(*) as count
    FROM inventory_movements
    WHERE operation_id = '${opId}'
  `);

  if (parseInt(result.rows[0].count) !== 1) {
    throw new Error(`DUPLICATE_DELIVERY_FAILURE: Expected 1 ledger entry, found ${result.rows[0].count}`);
  }

  console.log('✅ Duplicate Delivery Proof Passed.');
}
