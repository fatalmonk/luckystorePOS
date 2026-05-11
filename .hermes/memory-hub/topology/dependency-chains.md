# LuckyStorePOS Dependency Chains

## 1. Sales Transaction Chain (Critical Path)
Flutter POS UI -> Bloc/Provider -> Drift (Local SQLite) -> Offline Queue Manager -> Supabase RPC `create_sale` -> Ledger Append -> stock_levels Update.

## 2. Authentication Chain
Vite/Flutter Admin -> Supabase Auth -> JWT Extraction -> RLS Policy Check -> Table Access.

## 3. Governance Chain
GitHub Actions / Local CLI -> `scripts/governance/` -> `baseline.json` -> Schema Inspection -> Drift/SQL Drift Report.

## 4. Replay Chain
`infra/migration-replay/replay.sh` -> Docker (Postgres/Supabase) -> Migration Execution -> Verification Scripts.
