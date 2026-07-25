# Automated Verification Strategy: Test & Coverage Plan

**Auditor:** Dracarys (qwen3.6-plus)
**Date:** 2026-07-24
**Branch:** `fix/storefront-categories-cdn-and-hero-image`
**Scope:** Read-only design document. Evidence-based automated test strategy for critical database, application, synchronization, and security findings from glm5.2audit.md, kimi2.7audit.md, kimi2.7-audit-2.md, and database-contract-reconciliation.md. No code changes, no production access.

---

## 1. Existing Test Inventory

| Test Suite | Command | Scope | Real integration or mock | CI coverage |
|---|---|---|---|---|
| supabase/tests/rpc_integration.test.ts | `npx vitest run -c supabase/tests/vitest.config.ts` | lookup_item_by_scan, search_items_pos (record_sale/void_sale/tenant-isolation are describe.skip) | Real DB (requires local Supabase) | None |
| supabase/functions/post-facebook/index.test.ts | `deno test supabase/functions/post-facebook/index.test.ts` | Auth header, message validation, role gate (logic-only, no handler invocation) | Mock | None |
| cloudflare/workers/agent/tests/worker.test.ts | `npx vitest run -c cloudflare/workers/agent/vitest.config.ts` | Agent Worker discovery, auth, security headers (@cloudflare/vitest-pool-workers) | Mock env | None |
| apps/customer_storefront/app/lib/__tests__/orders.test.ts | `npx vitest run` (in customer_storefront) | createOrder validation + RPC mock | Mock supabase.rpc | None |
| apps/customer_storefront/app/lib/__tests__/wishlist.test.ts | `npx vitest run` | Wishlist logic | Mock | None |
| apps/customer_storefront/app/lib/__tests__/validation.test.ts | `npx vitest run` | Zod schema validation | None | None |
| apps/customer_storefront/app/lib/__tests__/formatPrice.test.ts | `npx vitest run` | Price formatting | None | None |
| apps/customer_storefront/app/lib/__tests__/useCart.test.ts | `npx vitest run` | Cart hook | Mock | None |
| apps/customer_storefront/e2e/checkout.spec.ts | `npx playwright test` | Full checkout E2E (requires live dev server) | Real browser, real dev server | None |
| apps/customer_storefront/e2e/wishlist.spec.ts | `npx playwright test` | Wishlist E2E | Real browser | None |
| apps/admin_web/src/features/social/SocialPostPage.test.tsx | `npx vitest run` (in admin_web) | Social post page | Mock | None |
| apps/admin_web/vitest.setup.ts | — | Vitest setup (jsdom, React Testing Library) | — | — |
| apps/customer_storefront/app/lib/products/*.test.ts | `npx vitest run` | BrandParser, CachingProductAdapter, EmojiResolver, repository | Mock | None |
| apps/mobile_app/test/integration/offline_sync_test.dart | `flutter test` | Enqueue/persistence, conflict resolution logic, retry counter, dashboard stats | Mock PathProvider, no Supabase | None |
| apps/mobile_app/test/unit/race_conditions_test.dart | `flutter test` | Race condition unit tests | Mock | None |
| apps/mobile_app/test/unit/duplicate_submission_test.dart | `flutter test` | Duplicate submission guards | Mock | None |
| apps/mobile_app/test/unit/offline_queue_test.dart | `flutter test` | Offline queue logic | Mock | None |
| apps/mobile_app/test/unit/stock_validation_test.dart | `flutter test` | Stock validation | Mock | None |
| apps/mobile_app/test/unit/statement_accuracy_test.dart | `flutter test` | Statement accuracy | Mock | None |
| apps/mobile_app/test/unit/overdue_calculations_test.dart | `flutter test` | Overdue calculations | Mock | None |
| apps/mobile_app/test/integration/all_systems_integration_test.dart | `flutter test` | Placeholder string test only | Mock | None |
| apps/mobile_app/test/offline/crdt_test.dart | `flutter test` | CRDT logic | None | None |
| apps/mobile_app/test/load/load_tests.dart | `flutter test` | Load tests | Mock | None |
| test/unit/*.dart (root duplicates) | `flutter test` | Duplicates of mobile_app/test/unit/* | Mock | None |
| test/integration/all_systems_integration_test.dart | `flutter test` | Duplicate of mobile_app version | Mock | None |
| test/load/load_tests.dart | `flutter test` | Duplicate of mobile_app version | Mock | None |
| scripts/dev/run-tests.sh | `bash scripts/dev/run-tests.sh` | Orchestrator: pytest + npm test + flutter test | — | None |
| scripts/test/test-supabase.mjs | `node scripts/test/test-supabase.mjs` | Supabase connection smoke | Real DB | None |
| scripts/test/test-function-curl.sh | `bash scripts/test/test-function-curl.sh` | Edge Function curl smoke | Real endpoint | None |
| scripts/test/test-import-function.sh | `bash scripts/test/test-import-function.sh` | Import function smoke | Real endpoint | None |

**No .github/workflows/ CI pipeline exists. All test execution is manual-only.**

---

## 2. Critical Finding Coverage Matrix

| Finding | Existing test | Coverage quality | Missing assertion |
|---|---|---|---|
| Anonymous cross-store order creation (C-2, C3) | None | NONE | No test that anon can call create_order_with_stock with arbitrary tenant/store_id; no test that direct anon INSERT on orders bypasses RPC |
| SECURITY DEFINER search_path (H-2) | None | NONE | No static check for functions missing SET search_path |
| Sale RPC signature compatibility (C1 stub) | None | NONE | No test that 4-param complete_sale stub returns fake success |
| Four-param complete_sale stub | None | NONE | No migration replay test verifying stub presence/absence |
| record_sale fallback (C2) | rpc_integration.test.ts describe.skip | SKIPPED | Function dropped in migration; test will fail if re-enabled |
| Sale idempotency | rpc_integration.test.ts describe.skip | SKIPPED | Only for dropped record_sale, not for create_sale or complete_sale |
| Payment uniqueness (M-4) | None | NONE | No test that duplicate payment rows can be inserted |
| Offline timeout after commit (M2) | None | NONE | No test simulating network timeout after server commit |
| Concurrent queue processors (M3) | None | NONE | No test spawning two isolates/timers processing same record |
| Stuck syncing recovery | offline_sync_test.dart | PARTIAL | Verifies JSON exists but does not simulate SYNCING crash recovery |
| Product image orphan (H1) | None | NONE | No test verifying R2 cleanup when item insert fails |
| Initial-stock failure (H2) | None | NONE | No test verifying that adjust_stock failure surfaces to user |
| Auth-user orphan (H3) | None | NONE | No test verifying Auth cleanup when create_store_user fails |
| Cross-store direct writes (H4) | None | NONE | No test verifying inventory.ts:71-79 can update across stores when RLS disabled |
| competitor_prices schema divergence (H-1) | None | NONE | No test verifying column existence before RLS policy application |
| deduct_stock broken columns (C4, H-3) | None | NONE | No test calling deduct_stock and asserting failure on replay schema |
| Migration replay drift | None | NONE | No test that supabase/migrations/ applies cleanly from scratch |

---

## 3. Test Architecture

Eight independent layers, each with its own runner and fixtures:

### Layer 1: Static migration checks
- Runner: Node.js script (no DB needed)
- Parses migration SQL files for patterns: SECURITY DEFINER without SET search_path, DROP TABLE IF EXISTS, USING(true) in RLS policies, stub function signatures
- Runs in seconds, no infrastructure

### Layer 2: Fresh database replay tests
- Runner: supabase CLI + Vitest
- Spins local Supabase (supabase start), runs all migrations in order, asserts zero errors
- Then runs schema shape assertions: expected columns exist, expected constraints present
- Destructive — wipes and rebuilds local DB each run

### Layer 3: SQL/RLS integration tests
- Runner: Vitest against local Supabase (supabase/tests/)
- Uses service_role to seed test tenants/stores/items, then uses anon/auth clients to assert RLS enforcement
- Tests cross-store isolation, anon INSERT blocks, SECURITY DEFINER behavior

### Layer 4: Edge Function tests
- Runner: Deno test
- Mocks Supabase client, tests create-sale, adjust-stock, import-inventory validation paths
- Tests auth gate, rate limiting, input validation, RPC call construction

### Layer 5: Flutter unit/integration tests
- Runner: flutter test
- Unit: conflict_resolver, offline queue, state machine, race conditions
- Integration: mock Supabase RPC, test offline sync state transitions, timeout recovery

### Layer 6: React tests
- Runner: Vitest (jsdom)
- Admin web: domain API calls, component behavior
- Storefront: orders validation, cart logic, wishlist
- Mocks Supabase client at module level

### Layer 7: Cloudflare Worker tests
- Runner: Vitest with @cloudflare/vitest-pool-workers
- Tests agent worker routing, auth, security headers, discovery endpoints

### Layer 8: End-to-end tests
- Runner: Playwright
- Requires dev server running
- Tests storefront checkout flow, price tampering protection, order confirmation

---

## 4. Exact Test Cases

### T-1: complete_sale 4-param stub detection (Critical C1/C3)

Preconditions: Local Supabase with all migrations applied
Test steps:
1. Run SQL: SELECT routine_name, pg_get_function_arguments(oid) FROM pg_proc WHERE proname = 'complete_sale'
2. Assert exactly one overload exists (12-param wrapper)
3. If 4-param overload found, fail
Expected result: Only 12-param (uuid, uuid, uuid, jsonb, jsonb, numeric, text, text, jsonb, text, text, text) exists
Failure meaning: Stub migration applied — all sales via Edge/offline path return fake success
Fixtures/mocks: None — real local DB
Likely test file: supabase/tests/rpc_integration.test.ts (new describe block)
Command: npx vitest run -c supabase/tests/vitest.config.ts -t 'complete_sale stub'

### T-2: create_order_with_stock anon exposure (Critical C2/C3)

Preconditions: Local Supabase with migrations + seeded store/tenant/item
Test steps:
1. Create anon Supabase client (no auth token)
2. Call supabase.rpc('create_order_with_stock', { p_tenant_id, p_store_id, ...valid order })
3. Assert error is returned (function should not be callable by anon)
4. Also: anon INSERT directly into orders table, assert rejected
Expected result: Both calls rejected with authorization error
Failure meaning: Any anonymous user can create orders for any store, decrement any store's stock
Fixtures/mocks: Seed tenant/store/item/payment_method
Likely test file: supabase/tests/rpc_integration.test.ts
Command: npx vitest run -c supabase/tests/vitest.config.ts -t 'anon order creation'

### T-3: deduct_stock column reference failure (Critical C4)

Preconditions: Local Supabase with migrations (effective schema has composite PK, no id/version)
Test steps:
1. Seed store/item with qty=10
2. Call supabase.rpc('deduct_stock', { p_store_id, p_item_id, p_quantity, p_details })
3. Assert error contains 'column' (function is broken)
Expected result: RPC fails with column-not-found error (proves function is broken on replay schema)
Failure meaning: If function succeeds, live schema has extra columns not in repo — schema drift confirmed
Fixtures/mocks: Seed store/item/stock_levels
Likely test file: supabase/tests/rpc_integration.test.ts
Command: npx vitest run -c supabase/tests/vitest.config.ts -t 'deduct_stock'

### T-4: Sale idempotency via create_sale (not record_sale)

Preconditions: Local Supabase with seeded data
Test steps:
1. Generate client_transaction_id = 'idem-test-001'
2. Call create_sale with 1 item, 1 payment, that idempotency key
3. Assert status = SUCCESS, sale created
4. Call create_sale again with SAME client_transaction_id
5. Assert status = DUPLICATE, no second sale row, stock not decremented twice
Expected result: Second call returns DUPLICATE, sales count = 1, stock decremented only once
Failure meaning: Double-sale possible on network retry
Fixtures/mocks: Seed tenant/store/item/stock/payment_method
Likely test file: supabase/tests/rpc_integration.test.ts
Command: npx vitest run -c supabase/tests/vitest.config.ts -t 'create_sale idempotency'

### T-5: Payment uniqueness constraint (M-4)

Preconditions: Local Supabase with seeded sale
Test steps:
1. Create a sale with 1 payment (cash, 100)
2. Insert a second sale_payments row with same sale_id, same payment_method_id, same reference
3. Assert UNIQUE VIOLATION
Expected result: Second insert fails with unique constraint violation
Failure meaning: Duplicate payments can be recorded for same sale
Fixtures/mocks: Seed sale + sale_payments
Likely test file: supabase/tests/rpc_integration.test.ts
Command: npx vitest run -c supabase/tests/vitest.config.ts -t 'payment uniqueness'

### T-6: SECURITY DEFINER search_path audit (H-2)

Preconditions: None — static file analysis
Test steps:
1. Scan all migration SQL files for SECURITY DEFINER
2. For each match, check that SET search_path appears in same function definition
3. Report functions missing it
Expected result: Zero functions missing SET search_path
Failure meaning: Search-path injection vulnerability
Fixtures/mocks: None
Likely test file: supabase/tests/migration-lint.test.ts (new file)
Command: node scripts/test/check-search-path.mjs

### T-7: Migration replay from scratch

Preconditions: Empty local Postgres
Test steps:
1. supabase db reset (or create fresh DB)
2. supabase db push (apply all migrations)
3. Assert exit code 0
4. Run schema validation: check stock_levels has composite PK, no id/version columns
5. Check competitor_prices column set matches expected
Expected result: All migrations apply without error, schema matches expected shape
Failure meaning: Migration order dependency or contradictory migrations break fresh deploy
Fixtures/mocks: None
Likely test file: supabase/tests/migration-replay.test.ts (new file)
Command: supabase db reset && npx vitest run -c supabase/tests/vitest.config.ts -t 'migration replay'

### T-8: Offline timeout after commit (M2)

Preconditions: Flutter test with mock Supabase
Test steps:
1. Enqueue sale with clientTransactionId = 'timeout-test-001'
2. Simulate _syncSingle: mock RPC returns success but network error thrown before response parsed
3. Verify state = FAILED (not SYNCED)
4. Simulate retry: mock RPC returns DUPLICATE for same clientTransactionId
5. Verify state transitions to SYNCED (not stuck)
Expected result: Queue drains after retry returns DUPLICATE
Failure meaning: Stuck SYNCING records after timeout
Fixtures/mocks: Mock Supabase RPC, mock file I/O
Likely test file: apps/mobile_app/test/integration/offline_sync_test.dart
Command: flutter test apps/mobile_app/test/integration/offline_sync_test.dart

### T-9: Concurrent queue processors (M3)

Preconditions: Flutter test with mock Supabase
Test steps:
1. Enqueue 1 sale
2. Start two _syncQueue calls concurrently (simulating timer + Workmanager)
3. Assert only one processes the record (the other finds state = syncing and skips)
Expected result: Exactly one RPC call made
Failure meaning: Duplicate RPC calls, potential double-sale
Fixtures/mocks: Mock Supabase RPC, mock connectivity
Likely test file: apps/mobile_app/test/unit/race_conditions_test.dart
Command: flutter test apps/mobile_app/test/unit/race_conditions_test.dart

### T-10: Stuck SYNCING recovery

Preconditions: Flutter test with corrupted queue file
Test steps:
1. Write queue JSON with one record in SYNCING state
2. Initialize OfflineTransactionSyncService
3. Run _syncQueue
4. Assert record is NOT skipped (should be retried or recovered)
Expected result: SYNCING record is recovered and retried
Failure meaning: Crash during persist leaves permanent stuck record
Fixtures/mocks: Mock file system
Likely test file: apps/mobile_app/test/integration/offline_sync_test.dart
Command: flutter test apps/mobile_app/test/integration/offline_sync_test.dart

### T-11: Product image orphan on insert failure (H1)

Preconditions: Admin web test with mock R2 and Supabase
Test steps:
1. Mock uploadProcessedImage to succeed (returns URL)
2. Mock supabase.from('items').insert to throw error
3. Call the mutation
4. Assert compensating delete is called (or fails if not implemented)
Expected result: Image is deleted when item insert fails (or test documents current orphan behavior)
Failure meaning: Orphaned R2 objects accumulate
Fixtures/mocks: Mock R2 upload, mock Supabase
Likely test file: apps/admin_web/src/features/inventory/AddProductModal.test.tsx (new file)
Command: npx vitest run -c apps/admin_web/vitest.config.ts -t 'image orphan'

### T-12: Initial-stock failure surfaces (H2)

Preconditions: Admin web test
Test steps:
1. Mock adjust_stock RPC to throw error
2. Create item with initialStock > 0
3. Assert error is thrown (not console.warn)
Expected result: Mutation fails, user sees error
Failure meaning: Items created without expected stock, silent data integrity issue
Fixtures/mocks: Mock Supabase RPC
Likely test file: apps/admin_web/src/features/inventory/AddProductModal.test.tsx
Command: npx vitest run -c apps/admin_web/vitest.config.ts -t 'initial stock'

### T-13: Auth-user orphan on user creation (H3)

Preconditions: Admin web test
Test steps:
1. Mock tempSupabase.auth.signUp to succeed
2. Mock create_store_user RPC to throw
3. Call addUser
4. Assert cleanup/rollback is attempted (or documents current orphan behavior)
Expected result: Auth user is cleaned up or user sees actionable error
Failure meaning: Orphan Auth accounts with no DB record
Fixtures/mocks: Mock Supabase auth, mock RPC
Likely test file: apps/admin_web/src/lib/api/domains/settings.test.ts (new file)
Command: npx vitest run -c apps/admin_web/vitest.config.ts -t 'auth orphan'

### T-14: Cross-store direct write test (H4)

Preconditions: Local Supabase with two stores, RLS disabled (test env)
Test steps:
1. Disable RLS on items table (test env only)
2. Using Store A's auth client, update an item belonging to Store B (eq('id', itemB))
3. Assert update succeeds (proves reliance on RLS)
4. Re-enable RLS
5. Repeat, assert update is blocked
Expected result: Without RLS, cross-store update succeeds; with RLS, blocked
Failure meaning: Application has no defense-in-depth store_id filter
Fixtures/mocks: Seed two stores, items in each
Likely test file: supabase/tests/rls-enforcement.test.ts (new file)
Command: npx vitest run -c supabase/tests/vitest.config.ts -t 'cross-store write'

### T-15: competitor_prices schema divergence (H-1)

Preconditions: Local Supabase with migrations applied
Test steps:
1. Query information_schema.columns for competitor_prices
2. Assert column set matches expected (either item_id or product_id, not both)
3. Attempt to run RLS policy from 20260720000001, assert no column-missing error
Expected result: RLS policy executes without error
Failure meaning: RLS references column that doesn't exist
Fixtures/mocks: None
Likely test file: supabase/tests/migration-replay.test.ts
Command: npx vitest run -c supabase/tests/vitest.config.ts -t 'competitor_prices schema'

### T-16: Migration replay drift detection

Preconditions: Two local databases — one from scratch replay, one from migration dump
Test steps:
1. Create DB A: supabase db reset + db push
2. Dump schema from DB A (structure only)
3. Compare column sets, constraint sets, index sets against expected canonical schema
Expected result: Schema matches canonical expectations
Failure meaning: Migration history produces different schema than live
Fixtures/mocks: None
Likely test file: supabase/tests/migration-replay.test.ts
Command: npx vitest run -c supabase/tests/vitest.config.ts -t 'migration replay'

---

## 5. CI Execution Order

Fastest safe pipeline (all concurrent where independent):

### Stage 0: Static checks (30 seconds, no infra)
- TypeScript typecheck (npm run typecheck in admin_web, customer_storefront)
- Dart analyze (flutter analyze)
- Migration lint: search_path check, DROP TABLE check, USING(true) check
- ESLint, Dart lint
- CONCURRENT: all four run in parallel

### Stage 1: Unit tests (1-2 minutes, no infra)
- Flutter unit tests (conflict_resolver, offline_queue, race_conditions, stock_validation)
- React unit tests (orders, wishlist, validation, cart, parsers)
- Cloudflare Worker tests
- Edge Function logic tests (post-facebook)
- CONCURRENT: flutter test + vitest runs for each app

### Stage 2: Database replay + RLS (3-5 minutes, requires Supabase local)
- supabase db reset (fresh migration replay)
- Migration replay schema validation
- RPC integration tests (idempotency, stub detection, deduct_stock, cross-store)
- RLS enforcement tests
- SEQUENTIAL: replay must complete before RPC tests

### Stage 3: Integration tests (2-3 minutes, requires Supabase local or mocks)
- Flutter integration tests (offline_sync_test with mocked RPC)
- Edge Function tests (full handler with mocked Supabase)
- CONCURRENT: flutter integration + deno test

### Stage 4: Performance tests (optional, 5-10 minutes)
- Load tests (apps/mobile_app/test/load/load_tests.dart)
- CONCURRENT with Stage 3 if resources permit

### Stage 5: E2E tests (3-5 minutes, requires dev server)
- Playwright: checkout.spec.ts, wishlist.spec.ts
- SEQUENTIAL: requires dev server, browser

### Stage 6: Build verification
- admin_web: npm run build
- customer_storefront: npm run build
- CONCURRENT

### Concurrency map:
- Stage 0: 4 jobs parallel
- Stage 1: 4 jobs parallel
- Stage 2: sequential (replay → tests)
- Stage 3: 2 jobs parallel
- Stage 4: parallel with Stage 3
- Stage 5: sequential
- Stage 6: 2 jobs parallel

---

## 6. Flakiness Controls

**Deterministic clocks:** Replace Date.now() and DateTime.now() with injectable clock. In RPC idempotency tests, use fixed timestamps. In Flutter backoff tests, use fake timers.

**UUIDs:** Use seeded UUIDs (v5 from fixed namespace + name) in tests. Never rely on gen_random_uuid() ordering.

**Network failures:** Mock fetch/HttpClient at the transport layer. Use vi.mock('supabase') with controlled resolve/reject behavior. For timeout tests, use vi.useFakeTimers() and advance past timeout threshold.

**Database cleanup:** Each test uses its own prefixed identifiers (test-{uuid}). Use transactional rollback: wrap each test in BEGIN/ROLLBACK or use supabase/tests/setup.ts to clean seeded data in afterEach.

**Retry timing:** Use fake timers in all retry/backoff tests. The 12-second timer in OfflineTransactionSyncService should use Timer.periodic replacement in tests.

**Isolates:** Flutter Workmanager tests must use a single-isolate mock. Do not spawn real isolates in tests — mock the Workmanager plugin's callback.

**Concurrency:** For queue processor tests, use a shared mock RPC counter. Assert exactly N calls made, not "at most N".

---

## 7. PR-Sized Implementation Plan

### PR-1: Static migration linter (Small)
- Dependencies: None
- Files: scripts/test/check-search-path.mjs (new), supabase/tests/migration-lint.test.ts (new)
- Acceptance: Detects all SECURITY DEFINER functions missing SET search_path in glm5.2audit.md H-2
- Command: node scripts/test/check-search-path.mjs
- Parallelization: Safe — no infra, runs in 10 seconds

### PR-2: Fresh migration replay test (Medium)
- Dependencies: None
- Files: supabase/tests/migration-replay.test.ts (new), supabase/tests/test/setup.ts (extend)
- Acceptance: supabase db reset + db push exits 0, schema assertions pass
- Command: supabase db reset && npx vitest run -c supabase/tests/vitest.config.ts -t 'migration replay'
- Parallelization: Safe — isolated to local DB

### PR-3: create_sale idempotency + stub detection (Medium)
- Dependencies: PR-2 (needs migrations applied)
- Files: supabase/tests/rpc_integration.test.ts (unskip + add new describe blocks)
- Acceptance: create_sale idempotency proven, complete_sale stub detected/fails test
- Command: npx vitest run -c supabase/tests/vitest.config.ts
- Parallelization: Safe — same DB as PR-2

### PR-4: Offline sync timeout recovery (Medium)
- Dependencies: None
- Files: apps/mobile_app/test/integration/offline_sync_test.dart (extend)
- Acceptance: Timeout-after-commit retry drains queue via DUPLICATE detection
- Command: flutter test apps/mobile_app/test/integration/offline_sync_test.dart
- Parallelization: Safe — mocks only

### PR-5: RLS enforcement + cross-store isolation (Medium)
- Dependencies: PR-2
- Files: supabase/tests/rls-enforcement.test.ts (new)
- Acceptance: Proves cross-store writes blocked by RLS, documents RLS dependency gaps
- Command: npx vitest run -c supabase/tests/vitest.config.ts
- Parallelization: Safe — same DB

### PR-6: Admin web AddProductModal tests (Medium)
- Dependencies: None
- Files: apps/admin_web/src/features/inventory/AddProductModal.test.tsx (new)
- Acceptance: Image orphan and initial-stock failure covered
- Command: npx vitest run -c apps/admin_web/vitest.config.ts
- Parallelization: Safe — mocks only

### PR-7: Edge Function create-sale tests (Medium)
- Dependencies: None
- Files: supabase/functions/create-sale/index.test.ts (new)
- Acceptance: Auth gate, rate limit, input validation, RPC call construction tested
- Command: deno test supabase/functions/create-sale/index.test.ts
- Parallelization: Safe — mocks only

### PR-8: GitHub Actions CI pipeline (Small)
- Dependencies: PR-1 through PR-7
- Files: .github/workflows/ci.yml (new)
- Acceptance: Push triggers all stages, fails on any stage failure
- Command: gh workflow run ci.yml
- Parallelization: N/A

---

## 8. Recommended First Test PR

**PR: complete_sale stub detection + create_sale idempotency**

This is the highest-value single test because:
- Proves the Critical C1/C3 risk (fake-sale stub) is present or absent
- Proves sale idempotency actually works on the canonical function
- Requires no production access — only local Supabase
- Independently reviewable — one describe block, clear pass/fail
- Can become a CI regression gate — must pass before any migration PR merges

### Implementation prompt (copy-paste for the implementing agent):

---

Create a new Vitest test file at supabase/tests/rpc_integration_sale.test.ts that:

1. BeforeAll: Seed test data — one tenant, one store, one item with qty=50, one payment_method, one ledger_account. Use the same UUIDs as the existing rpc_integration.test.ts for consistency.

2. Test 'complete_sale: detects 4-param stub': Run SQL query SELECT COUNT(*) FROM pg_proc WHERE proname = 'complete_sale' AND pg_get_function_arguments(oid) LIKE '%uuid, jsonb, uuid, text%'. Assert the count is 0. If > 0, fail with message '4-param complete_sale stub detected — migration 20260530000000 overwrote the canonical function'.

3. Test 'create_sale: creates sale, decrements stock, writes audit log': Call supabase.rpc('create_sale', { p_cashier_id, p_client_transaction_id: 'test-001', p_store_id, p_items: [{ item_id, qty: 2, unit_price: 100 }], p_payments: [{ account_id, amount: 200, party_id: null }], p_notes: 'test' }). Assert data.status === 'SUCCESS'. Then query sales WHERE client_transaction_id = 'test-001' and assert 1 row. Query stock_levels WHERE store_id = X AND item_id = Y and assert qty = 48. Query sale_audit_log and assert 1 row.

4. Test 'create_sale: duplicate idempotency returns DUPLICATE without double-decrement': Call create_sale again with the SAME p_client_transaction_id. Assert data.status === 'DUPLICATE'. Query sales and assert still 1 row. Query stock_levels and assert qty still 48 (not 46).

5. Test 'create_sale: rejects empty client_transaction_id': Call with p_client_transaction_id = ''. Assert error is returned.

6. Test 'create_sale: fails gracefully when stock is insufficient': Seed item with qty=1. Call with qty=2. Assert status is 'REJECTED' or 'CONFLICT' (not SUCCESS), stock not negative.

Use the existing supabase/tests/test/setup.ts for the supabase client and runSql helper. Use describe/it/expect from vitest. Do not modify any migration files. Do not skip any of these tests.
