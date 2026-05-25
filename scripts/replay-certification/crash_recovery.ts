// scripts/replay-certification/crash_recovery.ts
import { ReplayOp } from './replay_runner';
import { executeHybridReplay, TestContext } from './certify';
import { db } from './db';

export async function testCrashRecovery(testIds: TestContext) {
  console.log('[REPLAY-CERT] Running Crash Recovery Simulation...');
  
  const opId = '00000000-0000-0000-0000-000000000005';
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

  // Simulate a crash sequence:
  // Apply operation, then simulate the client re-sending after a reconnect/crash
  const trace = [op, op];
  await executeHybridReplay(testIds, trace, 1000);

  console.log('✅ Crash Recovery Simulation Passed.');
}
