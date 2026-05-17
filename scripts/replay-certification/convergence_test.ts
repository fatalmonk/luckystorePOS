// scripts/replay-certification/convergence_test.ts
import { ReplayOp } from './replay_runner';
import { executeHybridReplay, TestContext } from './certify';
import { db } from './db';

export async function testConvergence(testIds: TestContext) {
  console.log('[REPLAY-CERT] Running Convergence Permutation Tests...');
  
  const genOp = (id: string, qty: number): ReplayOp => ({
    rpc: 'deduct_stock',
    params: {
      p_store_id: testIds.storeId,
      p_item_id: testIds.itemId,
      p_quantity: qty,
      p_operation_id: id
    }
  });

  const opA = genOp('00000000-0000-0000-0000-000000000001', 1);
  const opB = genOp('00000000-0000-0000-0000-000000000002', 2);
  const opC = genOp('00000000-0000-0000-0000-000000000003', 3);

  const traces = [
    [opA, opB, opC],
    [opB, opA, opC],
    [opC, opB, opA],
  ];

  for (const trace of traces) {
    // Re-seed before each permutation trace to guarantee a clean slate
    await db.execute(`
      ALTER TABLE inventory_movements DISABLE TRIGGER enforce_append_only;
      DELETE FROM inventory_movements WHERE tenant_id = '${testIds.tenantId}';
      UPDATE stock_levels SET qty_on_hand = 1000 WHERE store_id = '${testIds.storeId}' AND item_id = '${testIds.itemId}';
      ALTER TABLE inventory_movements ENABLE TRIGGER enforce_append_only;
    `);

    await executeHybridReplay(testIds, trace, 1000);
  }

  console.log('✅ Convergence Permutation Tests Passed.');
}
