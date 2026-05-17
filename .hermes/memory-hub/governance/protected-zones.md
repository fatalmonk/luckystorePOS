# LuckyStorePOS Protected Zones

## PROTECTED_CRITICAL

These paths require explicit approval before any mutation.

### 1. supabase/migrations/
**Risk**: Schema corruption, data loss, RLS regression
**Approval required**: Always
**Verification required**: Migration replay + governance check
**Never**: Push directly to main, skip replay, run `supabase db push` without approval

### 2. infra/migration-replay/
**Risk**: Replay nondeterminism, false validation passes
**Approval required**: Changes to replay.sh, Dockerfile, dependency builders
**Verification required**: Full replay test after change

### 3. scripts/governance/
**Risk**: Governance bypass, undetected drift
**Approval required**: Changes to enforce-governance.cjs, baseline.json
**Verification required**: Governance check against known-good state

### 4. apps/mobile_app/lib/offline/
**Risk**: Data loss on sync, queue corruption
**Approval required**: Changes to sync_engine.dart, manager.dart, db.dart
**Verification required**: SOP execution on physical device

### 5. apps/mobile_app/lib/features/sales/
**Risk**: Financial impact, duplicate transactions
**Approval required**: Changes to offline_transaction_sync_service.dart
**Verification required**: SOP 4 (duplicate replay proof)

### 6. apps/mobile_app/lib/shared/providers/auth_provider.dart
**Risk**: Authentication bypass, unauthorized access
**Approval required**: Always
**Verification required**: Login/logout flow test

### 7. Replay tooling
**Risk**: False confidence in schema correctness
**Approval required**: Changes to replay.sh, replay_report.cjs
**Verification required**: Full replay against staging-safe environment

### 8. Eval runner
**Risk**: False operational proof
**Approval required**: Changes to chaos-runner.cjs, reconciliation-eval.cjs
**Verification required**: Run against staging with actual data

### 9. Reconciliation engine
**Risk**: Inventory misstatement, accounting errors
**Approval required**: Changes to reconciliation_service.dart, adjustment models
**Verification required**: Reconciliation SOP with physical count

### 10. Inventory ledger paths
**Risk**: Stock corruption, negative inventory
**Approval required**: Changes to any ledger table, inventory_movements RPC
**Verification required**: Inventory math verification after change
