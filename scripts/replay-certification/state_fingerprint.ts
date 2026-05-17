// scripts/replay-certification/state_fingerprint.ts
import { Database } from './db';

export async function stateFingerprint(db: Database) {
  const result = await db.query(`
    SELECT md5(
      string_agg(
        item_id::text || ':' || qty_on_hand::text,
        ',' ORDER BY item_id
      )
    ) AS hash
    FROM stock_levels
  `);

  return result.rows[0].hash;
}
