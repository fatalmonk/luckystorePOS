# Lucky Store Supabase Audit

Audit date: 2026-07-26 (Asia/Dhaka)  
Project: `Lucky Store` (`hvmyxyccfnkrbxqbhlnm`)  
Mode: audit followed by explicitly approved production containment via forward migrations

## Executive summary

The audit found critical authorization and schema-drift issues. The first thirteen
approved containment steps are now deployed; the remaining high-priority
findings should still block unrelated database feature work until reconciled.

- **REMEDIATED — LIVE VERIFIED:** RLS and grants were contained for `public.parties`, `public.promos`, and `public.cart_sessions` by `20260726122245_contain_exposed_public_tables`.
- **REMEDIATED/PARTIAL — LIVE VERIFIED:** Anonymous execution of security-definer functions fell from 73 signatures to six intentional signatures by `20260726123532_revoke_unintended_anon_security_definer_access`; three are storefront APIs and three are PostGIS extension overloads.
- **REMEDIATED — LIVE VERIFIED:** The anonymous storefront order RPC now derives/validates scope, prices and totals in the database, aggregates duplicate quantities, locks stock, fixes `search_path`, and exposes only its active signature.
- **REMEDIATED — LIVE VERIFIED:** `public.homepage_categories` and `public.featured_products` now use `security_invoker=true`; their anonymous results remain stable and are restricted by the active, storefront-tenant `items` policy.
- **HIGH — LIVE VERIFIED:** One remaining write policy uses unconditional `WITH CHECK (true)`: anonymous wishlist inserts. Direct client inserts into the order and sale transaction tables are now contained.
- **HIGH — LIVE VERIFIED:** Seven deployed Edge Functions have `verify_jwt=false`. Four are payment callbacks where public invocation may be intentional; three (`create-sale`, `import-inventory`, and `create-card-checkout`) implement application-level JWT validation but remain dependent on that code being correct.
- **HIGH — LIVE VERIFIED:** Migration history and live catalog state disagree. For example, the repository explicitly enables RLS on `parties`, while the live advisor reports it disabled.
- **HIGH — TEST GAP:** Current integration coverage skips the canonical sale/ledger, idempotency, void, and tenant-isolation paths.
- **MEDIUM — LIVE VERIFIED:** Performance Advisor reports 273 findings: 96 unindexed foreign keys, 57 RLS init-plan issues, 49 multiple-permissive-policy issues, 68 unused indexes, and 3 duplicate indexes.

No secrets, API keys, or credentials were read or printed. Production changes
were limited to the explicitly approved forward migrations documented below.

## Evidence labels

- **LIVE VERIFIED:** observed from the connected project's catalog, Edge Function metadata, or Supabase Advisors.
- **REPOSITORY VERIFIED:** observed in the current checkout with exact file and line evidence.
- **DRIFT:** live state contradicts or is not represented by repository migration state.
- **PARTIAL:** evidence confirms part of the claim but not the complete runtime behavior.
- **TEST GAP:** important behavior has no active automated coverage.
- **LIVE VERIFICATION REQUIRED:** a safe conclusion needs further SELECT-only metadata or authenticated/anonymous behavioral tests.

## Scope

Inspected:

- Live public-schema metadata, migration list, extensions, Edge Function deployment metadata, Security Advisor, and Performance Advisor.
- `supabase/config.toml`, migrations, Edge Functions, Supabase tests, and targeted Supabase call sites in mobile, admin, and storefront clients.
- Current official Supabase security, RLS, advisor, and 2026 breaking-change guidance.

Excluded:

- Business-row contents and seed-row output.
- Secret values, publishable keys, logs containing request/user data, and environment files.
- Auth configuration changes, application deployment, and destructive data validation.
- Full behavioral penetration tests as `anon` or `authenticated`.

## Live project baseline

| Area | Live observation | Status |
|---|---|---|
| Project | Active/healthy, PostgreSQL 17.6.1, region `ap-northeast-1` | LIVE VERIFIED |
| Public Data API schema | `public` and `graphql_public` are configured in the repository | REPOSITORY VERIFIED — `supabase/config.toml:13` |
| Security Advisor | 316 notices: 8 ERROR, 300 WARN, 8 INFO | LIVE VERIFIED |
| Performance Advisor | 273 notices: 109 WARN, 164 INFO | LIVE VERIFIED |
| Edge Functions | 10 active; 7 have `verify_jwt=false`, 3 have `verify_jwt=true` | LIVE VERIFIED |
| Anonymous Auth | Live advisor emits 64 anonymous-sign-in notices; local config disables anonymous sign-ins | DRIFT — `supabase/config.toml:167` |
| Latest live migration | `20260712140808_drop_neon_sync_webhook` | LIVE VERIFIED |
| Later local migration observed | `20260720000001_fix_competitor_prices_rls.sql` | DRIFT / unapplied locally-ahead migration |

## Findings

### F-01 — Public application tables lack RLS

**Severity:** Critical  
**Status:** LIVE VERIFIED + DRIFT

Security Advisor reports:

- `public.parties`: RLS disabled even though six policies exist.
- `public.promos`: RLS disabled.
- `public.cart_sessions`: RLS disabled.
- `public.cart_sessions.session_id`: potentially sensitive column exposed through the API without RLS.
- `public.spatial_ref_sys`: RLS disabled; triage separately because it belongs to PostGIS.

Repository evidence contradicts the live `parties` state:

- `supabase/migrations/20260518000001_dedupe_parties_policies.sql:15` enables RLS.
- `supabase/migrations/20260518000001_dedupe_parties_policies.sql:19-49` creates the service and authenticated policies.

Impact:

- API grants may allow callers to bypass policies entirely on the three application tables.
- The contradiction proves that applied migration names are not sufficient evidence of the resulting live schema.

Advisor remediation:

- https://supabase.com/docs/guides/database/database-linter?lint=0007_policy_exists_rls_disabled
- https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public
- https://supabase.com/docs/guides/database/database-linter?lint=0023_sensitive_columns_exposed

### F-02 — Excessive `SECURITY DEFINER` execution surface

**Severity:** Critical  
**Status:** PARTIALLY REMEDIATED + LIVE VERIFIED

Initial Security Advisor baseline:

- 73 security-definer functions executable by `anon`.
- 135 security-definer functions executable by `authenticated`.
- Examples include stock adjustment, reconciliation approval, sales completion, staff PIN authentication, rate-limit cleanup, and accounting operations.

Repository evidence explains how the surface can recur:

- `supabase/migrations/20260506200000_security_hardening_v2.sql:14` revokes execution from `PUBLIC`.
- The same migration grants every public-schema function to authenticated at `:17`.
- It revokes only three named functions from anon at `:21-23`.
- `supabase/migrations/20260531024500_master_repair_migration.sql:416` grants all public-schema functions to `service_role`, but does not establish a durable default-privilege deny for future functions.

Impact:

- A security-definer function runs with its owner's privileges and can bypass RLS.
- Public-schema functions are Data API endpoints. A missing in-function identity, role, tenant, or store check can become an authorization bypass.
- Blanket grants obscure which functions are intentional client APIs.

Required follow-up:

1. Complete the same caller-by-caller review for authenticated execution.
2. For every retained security-definer function, require a fixed safe `search_path`, schema-qualified objects, caller identity checks, tenant/store authorization, and tests.

Advisor remediation:

- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

### F-03 — Security-definer views can bypass caller RLS

**Severity:** High  
**Status:** REMEDIATED + LIVE VERIFIED

Converted views:

- `public.homepage_categories`
- `public.featured_products`

Implemented:

- `20260726130029_convert_storefront_views_to_security_invoker` enables
  `security_invoker=true` on both views.
- Anonymous `items` reads are limited to active rows for the storefront tenant.
- Anonymous write-shaped grants were removed from `items` and both views.
- Post-change anonymous aggregates match the baseline: 20 featured products and
  30 categories; inactive and other-tenant visibility are both zero.

Security Advisor no longer reports either `security_definer_view` finding.

Advisor remediation:

- https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

### F-04 — Unrestricted write policies

**Severity:** High  
**Status:** LIVE VERIFIED + REPOSITORY VERIFIED

Security Advisor now reports one unconditional insert check:

- `wishlist` — `Allow anon insert wishlist`

Repository examples:

- `supabase/migrations/20260531024500_master_repair_migration.sql:167` sets `sale_items` insert to `WITH CHECK (true)`.
- `supabase/migrations/20260531024500_master_repair_migration.sql:175` does the same for `sale_payments`.
- `supabase/migrations/20260611000001_add_wishlist.sql:17-21` permits anonymous inserts with `WITH CHECK (true)`.

Impact:

- Any caller in the policy's role can choose protected foreign keys or ownership fields unless constraints, triggers, or RPC-only grants independently stop it.
- Permissive policies are OR-combined, so one broad policy can neutralize stricter policies on the same action.

Required follow-up:

- Verify table grants and expected direct-client writes.
- Bind inserts to authenticated identity, tenant/store ownership, parent-row access, or a narrowly authorized RPC.
- Add negative tests for cross-tenant IDs, arbitrary cashier/payment IDs, and anonymous spam.

Remediated:

- `20260726132349_require_rpc_for_anonymous_orders` removes the unconditional
  `orders` insert policy and anonymous INSERT grant while preserving anonymous
  execution of the hardened checkout RPC.
- `20260726132934_contain_legacy_online_order_tables` removes every public policy
  and anonymous privilege from `online_orders` and `online_order_items`, closing
  public customer-contact reads and anonymous mutations while retaining
  `service_role` access.
- `20260726134051_retire_place_online_order_rpc` removes the uncalled privileged
  legacy RPC without cascading into historical tables or their triggers.
- `20260726134706_require_rpc_for_sales_writes` removes the four unconditional
  sale/payment insert policies, revokes direct `anon` and `authenticated`
  INSERT grants while preserving reads and `service_role`, and retires the
  uncalled `complete_sale_v2` security-definer function.
- `20260726142226_harden_create_sale_authorization` binds the canonical sale RPC
  to authenticated staff identity, role, tenant, store and POS session; validates
  items and payment methods before mutation; derives authoritative pricing and
  totals; serializes idempotency keys; and locks stock rows deterministically.

Advisor remediation:

- https://supabase.com/docs/guides/database/database-linter?lint=0024_permissive_rls_policy

### F-05 — Edge Function JWT settings rely on application code

**Severity:** High  
**Status:** LIVE VERIFIED + PARTIAL

Deployed with `verify_jwt=false`:

- `import-inventory`
- `create-sale`
- `create-card-checkout`
- `payment-return-success`
- `payment-return-fail`
- `payment-return-cancel`
- `payment-ipn`

Repository and deployed-source checks show:

- `create-sale` checks an Authorization header and validates the token with `auth.getUser`; repository evidence at `supabase/functions/create-sale/index.ts:222-249`.
- `import-inventory` validates the token and restricts the actor to admin/manager; repository evidence at `supabase/functions/import-inventory/index.ts:286-323`.
- `create-card-checkout` validates the token; repository evidence at `supabase/functions/create-card-checkout/index.ts:47-55`.
- `payment-ipn` intentionally accepts a provider callback and validates `val_id` with SSLCommerz; repository evidence at `supabase/functions/payment-ipn/index.ts:21-64`.
- Payment return functions are redirects, not authorization decisions; `payment-return-success` forwards only `tran_id` at `supabase/functions/payment-return-success/index.ts:9-15`.

Risk:

- JWT verification is duplicated inside privileged functions using service-role clients.
- A refactor that removes or weakens the application-level check makes the public endpoint immediately privileged.
- Checkout accepts caller-provided callback URLs (`supabase/functions/create-card-checkout/index.ts:56-62`), so an allowlist/open-redirect review is required.

Recommendation:

- Set `verify_jwt=true` for user-authenticated functions unless a documented platform constraint prevents it; retain in-function role/tenant authorization.
- Keep provider callbacks public only where required, validate them against the payment provider, make processing idempotent, and never treat a browser redirect as proof of payment.
- Allowlist callback origins server-side.

### F-06 — `create_order_with_stock` anonymous write boundary

**Severity:** High  
**Status:** REMEDIATED + LIVE VERIFIED

Evidence:

- Live catalog verification reports one remaining overload with `search_path = ''`.
- `anon` and `service_role` retain exact execution access; `PUBLIC` and `authenticated` do not.
- The storefront calls the RPC directly at `apps/customer_storefront/app/lib/orders.ts:37-51`.
- The client hardcodes tenant and store IDs at `apps/customer_storefront/app/lib/orders.ts:4-5`.
- Storefront tests assert the call shape but mock Supabase rather than testing live RLS or authorization at `apps/customer_storefront/app/lib/__tests__/orders.test.ts:91-108`.

Implemented:

- `20260726124455_harden_storefront_order_rpc` preserves the active API signature while restricting it to the configured storefront store and deriving its tenant from `public.stores`.
- Item identity, active state, name, price, aggregate quantity, stock, subtotal, delivery fee, and total are verified or calculated inside the transaction.
- Duplicate item rows are combined before stock validation and decrement.
- The function uses an empty search path and schema-qualified objects.
- `20260726124725_drop_obsolete_order_rpc_overload` removes the uncalled 11-argument overload.

Remaining test gap:

- Add automated integration coverage for successful anonymous checkout, forged
  totals, cross-store input, duplicate item rows, duplicate order numbers, and
  insufficient stock. The live forged-store probe was rejected by the Data API.

### F-07 — Sale contracts and test coverage are inconsistent

**Severity:** High  
**Status:** TEST GAP + PARTIAL

Evidence:

- Admin uses `create_sale` at `apps/admin_web/src/lib/api/domains/pos.ts:59-72`.
- Mobile offline sync uses `complete_sale` at `apps/mobile_app/lib/features/sales/offline_transaction_sync_service.dart:482-492`.
- The active integration suite skips `record_sale` because it was dropped and says it must be unified with `create_sale` at `supabase/tests/rpc_integration.test.ts:98-100`.
- Idempotency, ledger, void, and tenant-isolation assertions sit inside skipped suites at `supabase/tests/rpc_integration.test.ts:100-176` and `:176-222`.
- Live `post_sale_to_ledger(uuid)` referenced the removed
  `sale_items.unit_price` field four times even though the authoritative selling
  value is `sale_items.price`.

Impact:

- The two clients exercise different sale RPC contracts.
- Critical stock, payment, ledger, idempotency, and tenant-isolation behavior lacks active end-to-end coverage.

Required follow-up:

- Declare one canonical sale contract.
- Add authenticated tests using complete canonical arguments.
- Test duplicate replay, stock locking, ledger balance, cross-tenant rejection, offline retry, and conflict behavior without disabling RLS.

Remediation applied:

- `20260726145906_repair_post_sale_to_ledger_price_column.sql` rewrites only
  the four reviewed `v_item.unit_price` references to `v_item.price` and fails
  closed if the function or table contract has drifted.
- The repair preserves the existing function security mode, search path, and
  role grants.
- `20260726151358_restrict_ledger_worker_chain_to_service_role.sql` removes
  direct anonymous/authenticated execution from the privileged posting and
  worker-control chain while preserving `service_role`.
- `20260726151659_restrict_ledger_enqueue_helpers_to_service_role.sql` applies
  the same boundary to the enqueue helper and its sales trigger function. The
  enabled sales trigger continues to enqueue `PENDING_POSTING` sales internally.

### F-08 — Local/live migration drift

**Severity:** High  
**Status:** LIVE VERIFIED + DRIFT

Evidence:

- Live migration history ends at `20260712140808_drop_neon_sync_webhook`.
- The repository contains `20260720000001_fix_competitor_prices_rls.sql`.
- The older competitor-price policy uses `raw_user_meta_data` at `supabase/migrations/20260514000001_create_competitor_prices.sql:58-66`.
- The later local migration explicitly replaces that unsafe/nonfunctional policy at `supabase/migrations/20260720000001_fix_competitor_prices_rls.sql:2-9`.
- Live `parties` state contradicts the applied migration described in F-01.

Impact:

- Repository replay, recorded migration names, and live schema cannot be treated as interchangeable.
- Historical migration edits would worsen reproducibility.

Recommendation:

- Do not edit historical migrations.
- Export a SELECT-only live contract inventory and compare it with a clean local replay.
- Prepare forward-only convergence migrations after human review.

### F-09 — RLS policy duplication and performance debt

**Severity:** Medium  
**Status:** LIVE VERIFIED

Performance Advisor reports:

- 96 unindexed foreign keys.
- 57 policies with avoidable per-row auth evaluation (`auth_rls_initplan`).
- 49 multiple permissive policy combinations.
- 68 unused indexes.
- 3 duplicate indexes.

Known duplicate indexes:

- `sale_items`: `idx_sale_items_item` and `idx_sale_items_item_id`.
- `sale_items`: `idx_sale_items_sale` and `idx_sale_items_sale_id`.
- `users`: `idx_users_auth_id_unique` and `users_auth_id_key`.

Risk:

- Unindexed foreign keys can make deletes/updates and joins expensive.
- Multiple permissive policies are OR-combined and are both a correctness and performance risk.
- “Unused” indexes require observation-window and workload review before removal.

Recommendation:

- Fix security and correctness first.
- Add missing FK indexes based on query plans and workload.
- Consolidate overlapping policies.
- Wrap stable auth calls as `(select auth.uid())` where semantically safe.
- Remove duplicate indexes in a separate forward migration after dependency checks.

### F-10 — Storage listing is broader than needed

**Severity:** Medium  
**Status:** LIVE VERIFIED

The public `product-images` bucket has a broad `storage.objects` SELECT policy that permits object listing. Public object URLs do not require a list policy.

Recommendation:

- Remove listing access unless the product explicitly needs bucket enumeration.
- Keep uploads, updates, and deletes scoped to authorized paths and roles.

Advisor remediation:

- https://supabase.com/docs/guides/database/database-linter?lint=0025_public_bucket_allows_listing

### F-11 — Auth hardening mismatch

**Severity:** Medium  
**Status:** LIVE VERIFIED + DRIFT

Evidence:

- Live advisor reports anonymous sign-ins are enabled and emits 64 affected-policy notices.
- Repository local config says `enable_anonymous_sign_ins = false` at `supabase/config.toml:167`.
- Leaked-password protection is disabled according to Security Advisor.
- Local config requires at least eight characters and mixed letter/digit classes at `supabase/config.toml:171-174`.

Recommendation:

- Decide and document whether anonymous Auth is part of the POS bootstrap contract.
- Audit every policy under the fact that anonymous users still use the Postgres `authenticated` role.
- Enable leaked-password protection if password Auth is used.
- Treat local `config.toml` as development configuration, not evidence of hosted Auth settings.

## Prioritized remediation plan

No remediation below is authorized by this audit. Every database change requires a reviewed forward migration and explicit approval.

### Phase 0 — Preserve evidence and define the contract

1. Export SELECT-only metadata for tables, policies, grants, functions, views, triggers, publications, buckets, and migration history.
2. Record exact overload signatures and callers for all sale, stock, payment, order, and staff-auth RPCs.
3. Compare a clean migration replay with live state; classify every difference as intended, missing locally, missing live, or obsolete.
4. Establish rollback and backup readiness before any schema change.

Acceptance:

- A reviewed drift ledger exists.
- No historical migration is edited.
- Every critical RPC has an intended caller and exact grant list.

### Phase 1 — Contain externally reachable authorization risks

1. Enable and verify RLS for `parties`, `promos`, and `cart_sessions`, or remove them from exposed schemas/grants.
2. Replace security-definer views with security-invoker behavior or revoke client access.
3. Revoke anonymous execution from all non-public security-definer functions.
4. Replace blanket authenticated execution with an exact allowlist.
5. Replace unconditional write policies with ownership/tenant/store checks or RPC-only access.

Acceptance:

- Security Advisor has zero application-table RLS errors.
- No unintended `anon` security-definer execution remains.
- Negative anonymous and cross-tenant tests pass.

### Phase 2 — Harden privileged Edge Functions and payment boundaries

1. Enable platform JWT verification for user-authenticated functions.
2. Retain server-side role, tenant, and store checks.
3. Allowlist checkout callback origins.
4. Verify IPN authenticity, amount, currency, transaction identity, status transitions, and idempotency before persisting payment success.
5. Confirm redirect endpoints never mutate payment state.

Acceptance:

- Public callbacks are documented and provider-validated.
- User functions reject missing, invalid, wrong-role, and cross-tenant tokens.
- Replay and forged callback tests pass.

### Phase 3 — Converge sale/order contracts and activate tests

1. Select the canonical sale RPC and retire latent/obsolete overloads through a forward migration.
2. Align admin and mobile call contracts.
3. Replace skipped `record_sale` tests with active canonical sale tests.
4. Add real RLS integration tests for storefront order creation and offline sale replay.

Acceptance:

- One documented sale contract is used by all clients.
- Stock, ledger, payment, idempotency, and tenant-isolation tests are active.

### Phase 4 — Performance and maintenance

1. Add justified FK indexes.
2. consolidate multiple permissive policies.
3. Apply safe RLS init-plan improvements.
4. Remove duplicate indexes after dependency/workload checks.
5. Decide whether PostGIS belongs in `public`.

Acceptance:

- Advisor counts are reviewed and materially reduced.
- Query-plan evidence accompanies index changes.
- No index is removed solely because an advisor calls it unused.

## Exactly three recommended first PRs

1. **PR 1 — Audit fixtures and SELECT-only contract tests**
   - Add catalog queries/tests that fail on exposed application tables without RLS, unintended grants, mutable-path security-definer functions, and security-definer views.
   - No production mutation.

2. **PR 2 — Forward RLS and grant containment**
   - Enable/repair RLS for the three application tables.
   - Revoke broad security-definer execution and grant exact approved signatures.
   - Requires explicit approval after PR 1 evidence is reviewed.

3. **PR 3 — Edge Function authentication and callback validation**
   - Enable platform JWT verification on user functions.
   - Add role/tenant tests, callback allowlisting, and payment callback replay/validation tests.
   - No deployment until staging validation is approved.

## Validation checklist for future authorized work

- Run Supabase Security and Performance Advisors before and after changes.
- Compare exact `pg_proc` identities, `prosecdef`, `proconfig`, and execution privileges.
- Verify RLS and policies using real `anon` and authenticated JWT contexts; never disable RLS in tests.
- Test both allowed and denied tenant/store cases.
- Replay duplicate sale/order/payment requests.
- Run Edge Function unit tests and repository integration tests.
- Run a clean migration replay separately from live SELECT-only verification.
- Show `git diff` and preserve unrelated working-tree changes.

## Current repository state

At audit start, these unrelated user changes were already present and were preserved:

- `apps/mobile_app/.env.example`
- `apps/mobile_app/lib/l10n/generated/app_localizations.dart`
- `apps/mobile_app/pubspec.lock`

This task added `codex-supabaseaudit.md` and fifteen forward migrations:

- `20260726122245_contain_exposed_public_tables.sql`
- `20260726123532_revoke_unintended_anon_security_definer_access.sql`
- `20260726124455_harden_storefront_order_rpc.sql`
- `20260726124725_drop_obsolete_order_rpc_overload.sql`
- `20260726130029_convert_storefront_views_to_security_invoker.sql`
- `20260726132349_require_rpc_for_anonymous_orders.sql`
- `20260726132934_contain_legacy_online_order_tables.sql`
- `20260726134051_retire_place_online_order_rpc.sql`
- `20260726134706_require_rpc_for_sales_writes.sql`
- `20260726142226_harden_create_sale_authorization.sql`
- `20260726145906_repair_post_sale_to_ledger_price_column.sql`
- `20260726151358_restrict_ledger_worker_chain_to_service_role.sql`
- `20260726151659_restrict_ledger_enqueue_helpers_to_service_role.sql`
- `20260726170458_add_service_daily_sales_summary_rpc.sql`
- `20260726181800_harden_daily_sales_summary_delivery.sql`

## Reference guidance

- Supabase Security Advisor checks: https://supabase.com/docs/guides/database/database-advisors
- Supabase RLS guide: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase product security index: https://supabase.com/docs/guides/security/product-security
- Supabase production checklist: https://supabase.com/docs/guides/deployment/going-into-prod
- 2026 Data API breaking change: new public tables are moving to explicit Data API exposure/grants; existing exposed objects still require correct grants and RLS.
