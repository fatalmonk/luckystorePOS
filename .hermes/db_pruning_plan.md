# Lucky Store DB Pruning Plan (v2)

> **Status: PLAN ONLY — nothing executed yet**  
> Project: `hvmyxyccfnkrbxqbhlnm` | Inspected: 2026-06-23  
> Review amendments applied: 2026-06-23

---

## Step 0 — Pre-flight Verification ✅

Diagnostics run before execution. All clear:

| Check | Result | Status |
|---|---|---|
| FK deps on `import_runs` | **0 rows** — no table references it | ✅ Safe to delete |
| FK deps on `idempotency_keys` | **0 rows** — leaf table | ✅ Safe to delete |
| Running import jobs | **0 rows** — no `status NOT IN ('completed','failed')` | ✅ Safe to delete |
| `pg_cron` available | **v1.6.4 installed** | ✅ Phase 4 can use pg_cron |
| Backup / PITR | Supabase daily backups + WAL archiving enabled by default — confirm recovery point in Dashboard → Settings → Backups before executing | ⚠️ Manually verify |

---

## 1. Current State Summary

### Dead Tuple Hotspots (26 tables affected, none vacuumed)

| Table | Live | Dead | Dead % | Total Size | Priority |
|---|---|---|---|---|---|
| `categories` | 22 | 44 | **200%** | 336 kB | 🔴 Phase 1 |
| `competitor_prices` | 40 | 40 | **100%** | 184 kB | 🔴 Phase 1 |
| `stores` | 53 | 50 | **94%** | — | 🔴 Phase 1 |
| `tenants` | 53 | 49 | **92%** | — | 🔴 Phase 1 |
| `import_runs` | 23 | 27 | **117%** | 136 kB | 🔴 Phase 1 + 2 |
| `stock_ledger` | 657 | 112 | 17% | 640 kB | 🟡 Phase 1 |
| `expenses` | 396 | 71 | 18% | 168 kB | 🟡 Phase 1 |
| `stock_levels` | 580 | 41 | 7.1% | 320 kB | 🟡 Phase 1 |
| `audit_logs` | 514 | 36 | 7% | 504 kB | 🟡 Phase 1 |
| `daily_sales` | 88 | 35 | 40% | 104 kB | 🟡 Phase 1 |
| `accounts` | 0 | 23 | ∞ | — | 🟡 Phase 1 |
| `price_audit_log` | 28 | 9 | 32% | 80 kB | 🟡 Phase 1 |
| `idempotency_keys` | 1 | 4 | 400% | — | 🔴 Phase 1 + 3 |
| `parties`, `ledger_batches`, `ledger_entries`, etc. | — | <10 each | low | — | 🟢 Phase 1 (sweep) |

### Root Cause: Why Autovacuum Never Triggered on User Tables

Autovacuum fires when: `n_dead_tup > autovacuum_vacuum_threshold + (autovacuum_vacuum_scale_factor × n_live_tup)`

With defaults `threshold=50`, `scale_factor=0.2`:

| Table | Trigger Threshold | Current Dead | Triggered? |
|---|---|---|---|
| `categories` | 50 + (0.2 × 22) = **54** | 44 | ❌ just below |
| `stock_ledger` | 50 + (0.2 × 657) = **181** | 112 | ❌ not yet |
| `expenses` | 50 + (0.2 × 396) = **129** | 71 | ❌ not yet |
| `competitor_prices` | 50 + (0.2 × 40) = **58** | 40 | ❌ just below |

> [!IMPORTANT]
> Most tables are close to or just below their autovacuum thresholds. Without intervention, they will eventually self-correct — but `categories` at 200% dead and `import_runs` at 117% are already hurting index efficiency. Phase 1 fixes this immediately.

**Autovacuum tuning recommendation (Phase 5):** Lower `autovacuum_vacuum_scale_factor` to `0.05` for high-churn tables like `stock_ledger` and `expenses` via `ALTER TABLE ... SET (autovacuum_vacuum_scale_factor = 0.05)` so autovacuum triggers at 5% dead instead of 20%.

---

## 2. Data Retention Context

| Table | Rows | Date Range | Timestamp Col | Decision |
|---|---|---|---|---|
| `stock_movements` | 1,089 | 2026-05-06 → 2026-06-10 | `created_at` | **Keep** — < 2 months, ledger-linked |
| `audit_logs` | 514 | 2026-05-17 → 2026-06-15 | `performed_at` | **Keep** — < 2 months, compliance |
| `import_runs` | 23 | 2026-03-25 → 2026-04-23 | `created_at` | **Prune** — all > 60 days, completed/failed only |
| `competitor_prices` | 40 | 2026-05-30 only | `created_at` | **Keep** — single snapshot, small |
| `price_audit_log` | 28 | various | `changed_at` | **Keep** — small, useful history |
| `idempotency_keys` | 1 | — | `completed_at` | **Prune** — completed > 7 days |

---

## 3. Execution Plan

### Phase 1 — VACUUM ANALYZE (zero risk, zero data loss)

No rows deleted. Reclaims dead tuple space, refreshes planner stats. Non-blocking on live DB.

```sql
-- Run during low-traffic window (safe anytime, but less I/O contention overnight)
VACUUM ANALYZE public.categories;
VACUUM ANALYZE public.competitor_prices;
VACUUM ANALYZE public.stores;
VACUUM ANALYZE public.tenants;
VACUUM ANALYZE public.import_runs;
VACUUM ANALYZE public.stock_ledger;
VACUUM ANALYZE public.expenses;
VACUUM ANALYZE public.stock_levels;
VACUUM ANALYZE public.audit_logs;
VACUUM ANALYZE public.daily_sales;
VACUUM ANALYZE public.accounts;
VACUUM ANALYZE public.price_audit_log;
VACUUM ANALYZE public.idempotency_keys;
VACUUM ANALYZE public.parties;
VACUUM ANALYZE public.ledger_batches;
VACUUM ANALYZE public.ledger_entries;
VACUUM ANALYZE public.inventory_items;
VACUUM ANALYZE public.orders;
```

**Expected:** All `n_dead_tup` → 0 in `pg_stat_user_tables`.

> [!WARNING]
> Do NOT use `VACUUM FULL` — it takes an exclusive lock per table. At ~14 MB total, standard `VACUUM ANALYZE` is sufficient and fully non-blocking.

---

### Phase 2 — Row Pruning: `import_runs`

**Retention policy: 60 days** (aligned across prose and SQL — all 23 current rows will be deleted as oldest is 2026-04-23).  
FK check confirmed: **no other table references `import_runs`** → safe leaf table delete.  
Running jobs check confirmed: **0 rows** with non-terminal status.

```sql
-- Step 2a: Preview (review output before proceeding)
SELECT id, file_name, status, created_at
FROM public.import_runs
WHERE status IN ('completed', 'failed')
  AND created_at < now() - interval '60 days'
ORDER BY created_at;

-- Step 2b: Safety check — confirm no running jobs
SELECT id, file_name, status, created_at
FROM public.import_runs
WHERE status NOT IN ('completed', 'failed');
-- Expected: 0 rows

-- Step 2c: Execute delete (only after reviewing 2a and 2b)
DELETE FROM public.import_runs
WHERE status IN ('completed', 'failed')
  AND created_at < now() - interval '60 days';
-- Expected: ~23 rows deleted
```

---

### Phase 3 — Row Pruning: `idempotency_keys`

Replay window for idempotent requests is 24h. Keys completed > 7 days are safe to remove.  
FK check confirmed: **no other table references `idempotency_keys`** → safe leaf table delete.

```sql
-- Step 3a: Preview
SELECT idempotency_key, created_at, completed_at
FROM public.idempotency_keys
WHERE completed_at IS NOT NULL
  AND completed_at < now() - interval '7 days';

-- Step 3b: Execute
DELETE FROM public.idempotency_keys
WHERE completed_at IS NOT NULL
  AND completed_at < now() - interval '7 days';
-- Expected: ~1 row deleted currently; grows over time
```

---

### Phase 4 — Post-Delete Vacuum

After Phases 2–3, vacuum again to reclaim the newly freed space from deleted rows.

```sql
VACUUM ANALYZE public.import_runs;
VACUUM ANALYZE public.idempotency_keys;
```

---

### Phase 5 — Autovacuum Tuning (prevent recurrence)

Lower the trigger threshold for high-churn tables so autovacuum self-manages going forward.

```sql
-- Trigger autovacuum at 5% dead tuples instead of 20%
ALTER TABLE public.stock_ledger SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);
ALTER TABLE public.expenses SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);
ALTER TABLE public.categories SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);
ALTER TABLE public.competitor_prices SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);
```

---

### Phase 6 — Automated Retention via pg_cron

`pg_cron v1.6.4` is **confirmed installed**. Schedule daily cleanup jobs.

```sql
-- Daily: prune completed import_runs older than 60 days (runs at 3 AM UTC)
SELECT cron.schedule(
  'prune-import-runs',
  '0 3 * * *',
  $$DELETE FROM public.import_runs
    WHERE status IN ('completed', 'failed')
      AND created_at < now() - interval '60 days'$$
);

-- Daily: prune expired idempotency keys (runs at 3:30 AM UTC)
SELECT cron.schedule(
  'prune-idempotency-keys',
  '30 3 * * *',
  $$DELETE FROM public.idempotency_keys
    WHERE completed_at IS NOT NULL
      AND completed_at < now() - interval '7 days'$$
);

-- Verify jobs are registered
SELECT jobid, schedule, command, jobname FROM cron.job;
```

---

## 4. Post-Execution Verification

Run after each phase to confirm results.

```sql
-- After Phase 1: confirm dead tuples cleared
SELECT schemaname, relname, n_live_tup, n_dead_tup,
  ROUND(n_dead_tup::numeric / NULLIF(n_live_tup, 0) * 100, 1) AS dead_pct,
  last_vacuum, last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;

-- After Phases 2-3: confirm row counts and table sizes
SELECT 'import_runs' AS tbl, count(*) FROM public.import_runs
UNION ALL
SELECT 'idempotency_keys', count(*) FROM public.idempotency_keys;

SELECT
  pg_size_pretty(pg_total_relation_size('public.import_runs')) AS import_runs_size,
  pg_size_pretty(pg_total_relation_size('public.idempotency_keys')) AS idempotency_size;

-- After Phase 6: verify cron jobs scheduled
SELECT jobid, schedule, command, jobname, active FROM cron.job;
```

---

## 5. What NOT to Prune

| Table | Reason |
|---|---|
| `audit_logs` | Only 514 rows, < 2 months old — compliance + forensics |
| `stock_movements` | Drives ledger reconciliation — retain ≥ 12 months |
| `ledger_entries` / `stock_ledger` | Financial records — never prune without archival |
| `expenses` | Active accounting data |
| `competitor_prices` | Single-day snapshot, 40 rows — negligible |
| `daily_sales` | Business intelligence — retain permanently |

---

## 6. Execution Checklist

```
[ ] Step 0: Verify Supabase backup recovery point (Dashboard → Settings → Backups)
[ ] Phase 1: Run VACUUM ANALYZE on all 18 tables
[ ] Verify: pg_stat_user_tables dead counts → 0
[ ] Phase 2a: Preview import_runs DELETE — review output
[ ] Phase 2b: Confirm 0 running import jobs
[ ] Phase 2c: Execute import_runs DELETE
[ ] Phase 3a: Preview idempotency_keys DELETE — review output
[ ] Phase 3b: Execute idempotency_keys DELETE
[ ] Phase 4: VACUUM ANALYZE import_runs + idempotency_keys
[ ] Phase 5: ALTER TABLE autovacuum tuning on 4 tables
[ ] Phase 6: Schedule pg_cron jobs + verify registration
[ ] Final: Run full post-execution verification query
```

> [!TIP]
> After all phases, disk size in the Supabase dashboard may not visibly shrink — that's expected. Standard `VACUUM` reclaims space for Postgres internal reuse; OS-level disk reduction only happens with `VACUUM FULL` (downtime) or a project resize cycle.
