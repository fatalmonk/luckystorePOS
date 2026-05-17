# Mutation Surface Catalog: Operational Scan

This catalog indexes every uncommitted file in the current working tree as of 2026-05-11T21:13Z.

## 1. Subsystem: Supabase Migrations
**Classification**: PROTECTED_CRITICAL (Zone 1)  
**Total Files**: 21  
**Mutation Type**: Replay / Governance  
**Replay Sensitivity**: MAXIMUM  
**Rollback Risk**: HIGH (Direct impact on database schema integrity)  
**Appearance**: INTENTIONAL / TRANSITIONAL (Modifying guards and RLS consistency)

| File Name | Replay Sens. | Rollback | Appears | Notes |
|---|---|---|---|---|
| `supabase/config.toml` | Med | Low | Intentional | Basic settings update |
| `...baseline_core_tables.sql` | Max | High | Intentional | Defensive guards |
| `...low_stock_alerts.sql` | Max | High | Intentional | Defensive guards |
| `...analytics.sql` | Max | High | Intentional | Defensive guards |
| `...pos_transactions.sql` | Max | High | Intentional | Core logic fix |
| `...pos_scanner_rpcs.sql` | Max | High | Intentional | Signature alignment |
| `...manager_dashboard_rpc.sql` | Max | High | Intentional | Formatting / stability |
| `...manager_dashboard_trend.sql` | Max | High | Intentional | Formatting / stability |
| `...offline_sync_idempotency.sql` | Max | High | Intentional | Field preservation |
| `...transaction_snapshot_safety_gate.sql` | Max | High | Intentional | RLS / Guard update |
| `...add_mrp_and_pos_discount_support.sql` | Max | High | Intentional | Logical addition |
| `...centralize_pricing_in_complete_sale.sql`| Max | High | Intentional | RPC Refactor |
| `...server_authoritative_override...sql` | Max | High | Intentional | Logic stabilization |
| `...validate_sale_intent_server_gate.sql` | Max | High | Intentional | Security guard |
| `...ledger_and_daily_reconciliation.sql` | Max | High | Intentional | Ledger integrity |
| `...ledger_posting_engine...sql` | Max | High | Intentional | Sequential math fix |
| `...lean_inventory_rpcs.sql` | Max | High | Intentional | Service abstraction |
| `...sales_history_rpcs.sql` | Max | High | Intentional | History query fix |
| `...ledger_posting_hardening.sql` | Max | High | Intentional | NEW / Additive hardening |
| `...retail_profit_control_foundation.sql` | Max | High | Intentional | Math preservation |
| `...advisor_security_rls_and_functions.sql`| Max | High | Intentional | SECURITY DEFINER fix |
| `...seed_stock_levels.sql` | High | Med | Intentional | Initialization data |

## 2. Subsystem: Mobile Runtime (Sync Engine & Offline Queue)
**Classification**: PROTECTED_CRITICAL (Zone 4, 5)  
**Mutation Type**: Runtime  
**Replay Sensitivity**: HIGH  
**Rollback Risk**: HIGH  

| File Name | Replay Sens. | Rollback | Appears | Notes |
|---|---|---|---|---|
| `offline_transaction_sync_service.dart` | High | High | **PARTIAL / HALLUCINATED** | Claimed 4 mutations; only implemented file version bump. |
| `sync_engine.dart` | High | High | Intentional | Import renaming and logging update. |
| `manager.dart` | Med | Med | Intentional | Sync orchestration logic update. |
| `db.dart` | High | High | Intentional | Schema drift correction. |
| `db.g.dart` | Low | Low | Transitional | **Auto-generated drift artifact** (2500+ lines inserted). |

## 3. Subsystem: Mobile UI & Feature Support
**Classification**: STANDARD_ZONE  
**Mutation Type**: Runtime  
**Appearance**: TRANSITIONAL (Import alignment, localization tweaks)

| File Name | Subsystem | Risk | Appears |
|---|---|---|---|
| `core/db/tables.g.dart` | Models | Low | Transitional |
| `auth/presentation/screens/...` | Auth UI | Low | Intentional |
| `reconciliation/export_service.dart` | Export | Med | Intentional |
| `reconciliation/reconciliation_service.dart`| Service | Med | Intentional |
| `sync/screens/conflict_resolution_page.dart`| UI | Low | Intentional |
| `sync/screens/dead_letter_queue_page.dart` | UI | Low | Intentional |
| `l10n/generated/app_localizations.dart` | Localization | Low | Auto-gen |
| `models/sale_transaction_snapshot.dart` | Model | Med | Intentional |
| `shared/providers/pos_provider.dart` | Provider | Low | Intentional |
| `shared/services/startup_guard_service.dart`| Guardian | Med | Intentional |
| `sync/sync_controller.dart` | Sync | Med | Intentional |
| `telemetry/...` (4 files) | Telemetry | Low | Intentional |
| `widgets/sync/...` (3 files) | UI | Low | Intentional |
| `pubspec.lock`, `pubspec.yaml` | Tooling | Med | Intentional |

## 4. Subsystem: Admin Web
**Classification**: STANDARD_ZONE  
**Mutation Type**: Runtime  
**Total Files**: 14  
**Appearance**: TRANSITIONAL (Field naming alignment across UI components)

All modified files in `apps/admin_web/src` exhibit consistent, minor corrections replacing stale fields (e.g. `qty` -> `qty_on_hand`, `product_id` -> `item_id`) to maintain operational coherence with the backend RPC modifications.
- **Risk**: Low (Frontend only, rollback is trivial)
- **Audit Verdict**: Intentional, high-value reconciliation alignment.

## 5. Subsystem: Evals & Harness
**Classification**: PROTECTED_CRITICAL (Zone 8)  
**Mutation Type**: Eval / Verification  
**Replay Sensitivity**: HIGH  
**Appearance**: INTENTIONAL  

| File Name | Risk | Appears | Notes |
|---|---|---|---|
| `eval-runner.ts` | Med | Partial | Commented out failing tests, refined logging prefixes. |
| `invariant-verifier.ts`| Med | Intentional | **Successful implementation** of `AuthorityLevel` and Drift detection logging. |

## 6. Environment & Documentation
- `docs/local-dev.md`: Intentional guide update.
- `package.json`: Intentional dependency management.
- `infra/`, `scripts/governance/`, `artifacts/`: **UNTRACKED** complete artifact packages, fully intentional from previous phase output.
