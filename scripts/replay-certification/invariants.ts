// scripts/replay-certification/invariants.ts
import { Database } from './db';

export async function assertInvariants(db: Database) {
  const metaCheck = await db.query(`
    SELECT json_build_object(
      'has_stock_ledger', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_ledger'),
      'has_stock_level_qty_on_hand', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stock_levels' AND column_name = 'qty_on_hand')
    );
  `);
  const meta = JSON.parse(metaCheck.rows[0].json_build_object);

  const qtyCol = meta.has_stock_level_qty_on_hand ? 'qty_on_hand' : 'qty';
  const negativeStock = await db.query(`
    SELECT item_id, ${qtyCol} AS qty_on_hand
    FROM stock_levels
    WHERE ${qtyCol} < 0
  `);

  if (negativeStock.rows.length > 0) {
    console.error('❌ INVARIANT VIOLATION: NEGATIVE_STOCK', negativeStock.rows);
    throw new Error('NEGATIVE_STOCK');
  }

  let duplicateOps;
  if (meta.has_stock_ledger) {
    duplicateOps = await db.query(`
      SELECT (metadata->>'operation_id')::uuid AS operation_id, COUNT(*)
      FROM stock_ledger
      WHERE metadata->>'operation_id' IS NOT NULL
        AND transaction_type = 'sale_deduction'
      GROUP BY (metadata->>'operation_id')::uuid
      HAVING COUNT(*) > 1
    `);
  } else {
    duplicateOps = await db.query(`
      SELECT operation_id, COUNT(*)
      FROM inventory_movements
      WHERE operation_id IS NOT NULL
      GROUP BY operation_id
      HAVING COUNT(*) > 1
    `);
  }

  if (duplicateOps.rows.length > 0) {
    console.error('❌ INVARIANT VIOLATION: DUPLICATE_OPERATION', duplicateOps.rows);
    throw new Error('DUPLICATE_OPERATION');
  }
}
