# Runbook: Replay Verification

## Verification Steps

1. **Run replay successfully**
   ```bash
   ARTIFACTS_DIR=./artifacts bash infra/migration-replay/replay.sh
   ```
   Expected: `80/80 passed`

2. **Check artifacts exist**
   ```bash
   ls artifacts/
   # Should see: replay.log, schema-baseline.sql, schema-after.sql
   ```

3. **Compare schema snapshots** (optional)
   ```bash
   diff artifacts/schema-baseline.sql artifacts/schema-after.sql
   # If starting from empty DB, will show all schema objects
   # If replaying on existing DB, should show only expected changes
   ```

4. **Governance check**
   ```bash
   npm run governance:build
   npm run governance:check
   ```
   Expected: Exit code 0, no hash mismatches

## What Success Looks Like

- All 80 migrations pass
- No `failure.json` generated
- Governance artifact hashes match baseline
- Schema snapshots capture expected objects

## What Failure Looks Like

- `failure.json` exists with `migration`, `line`, `sql`, `error`
- Governance hash mismatch
- Schema snapshot missing expected objects

## Action on Failure

1. Read `failure.json` for exact failure context
2. Check failing migration at indicated line
3. Fix migration or environment issue
4. Re-run replay
5. **Never push failing migrations to main**
