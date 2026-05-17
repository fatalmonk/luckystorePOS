# Operational Playbook

## Overview
LuckyStorePOS is currently in the **Pre-production Operational Validation** phase. The backend is mature and contains immutable ledgers, deterministic replay, and synchronization layers. Operational discipline is now required to prevent corruption and drift.

## Forbidden Commands
Do **NOT** run the following commands against real environments (staging/production) without explicit written approval:
- `supabase db reset`
- `supabase db push`
- `supabase migration repair`
- `supabase migration up`

*Reason: These can corrupt immutable financial records, reconciliation history, operational telemetry, and replay state.*

## Safe Operational Workflow
**CORRECT FLOW:**
1. **Production**: Source of truth.
2. **Sanitized Export**: Pull down data securely.
3. **Staging**: Re-import sanitized data for testing.
4. **Local Validation**: Run validation against staging.

**FORBIDDEN FLOW:**
- Local experimentation directly to Production deployment.

## Verification Protocol
Before deploying any major change, run the standard suite:

### Web & Backend
```bash
npm run typecheck
npm run build
```

### Flutter
```bash
flutter analyze
```

### Distributed Safety Suite
Must be executed whenever replay logic, inventory logic, or reconciliation mechanisms are touched:
- Replay evals
- Offline replay validation
- Concurrent inventory validation
- Reconciliation verification

## Pilot Store Testing Sequence

### Phase 1 — Core Validation
Verify the integrity of the following primitives:
- Login flow & RLS
- Inventory reading/writing
- Sale creation
- Automated Reconciliation
- Printer dispatching
- Telemetry stream
- Offline replay determinism

### Phase 2 — Operational Stress
Put the environment under controlled stress:
- Airplane mode simulation
- Reconnection storm handling
- Abrupt application kill and relaunch
- Hardware (printer) disconnect and re-pair
- Extended duration offline operations
- Concurrent cashier action racing

### Phase 3 — Real Workflow Verification
Ensure operational UX matches store realities:
- **Cashier**: Rapid barcode scans, bulk quantity updates, multi-item repetition, offline checkout.
- **Manager**: Variance review approvals, auditing telemetry stream, viewing append-only transaction history.
