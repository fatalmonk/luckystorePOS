# Supabase security remediation follow-up

This plan is separate from the Phase 2 performance change. It is based on the supplied account-audit counts; exact object names, definitions, callers, and deployed grants still need a read-only inventory. Counts refer to function signatures and may include overloads. Do not infer that every `SECURITY DEFINER` signature is exploitable or unnecessary.

## Priority 0 — public execution and webhook exposure

1. Inventory the 9 anonymously executable `SECURITY DEFINER` signatures, including schema, full argument types, owner, `search_path`, grants, body, referenced tables, and reachable data/actions. Map each signature to an application or webhook caller.
2. Default to `SECURITY INVOKER`. Retain definer rights only where a documented use case requires privileges that the caller should not receive directly, such as a narrowly scoped cross-tenant aggregate or controlled write that cannot be represented safely with RLS.
3. For each retained definer function, pin a safe `search_path` (or use fully qualified names), qualify every object reference, validate caller identity and tenant/store scope inside the function, constrain inputs, and avoid dynamic SQL unless identifiers are allow-listed.
4. Revoke execution from `PUBLIC` and `anon` where no anonymous caller is required. Grant only the exact signature to the smallest role that needs it; verify overload-specific grants. Test both intended anonymous flows and denied cross-tenant/unauthorized calls before applying a reviewed migration.
5. Inventory public payment/integration webhooks separately. Require provider signature verification, timestamp/replay protection, strict schema and size validation, idempotency, and bounded rate limits before any privileged mutation. Confirm authorization and failure behavior with provider-compatible tests.

## Priority 1 — authenticated privileged functions and RLS

1. Triage the 138 authenticated-executable `SECURITY DEFINER` signatures by privilege effect and caller. Distinguish read-only public catalog helpers, authenticated user-owned operations, cross-store/admin operations, and financial/inventory mutations.
2. For functions that need no privilege elevation, migrate to invoker rights after verifying RLS and table grants. For those that do, document the required elevated operation and add explicit `auth.uid()`/membership/role checks and tenant scoping. Restrict execution to `authenticated` or a dedicated server role as appropriate; never grant broad access merely to keep a call working.
3. Review all 8 RLS initialization-plan warnings. Apply `(select auth.uid())`-style initialization where semantics remain identical, then verify plans and role-based behavior. Preserve deny-by-default behavior, policy composition, and tenant isolation.
4. Review the 22 overlapping permissive-policy findings. Determine whether policies are redundant or intentionally additive; consolidate only after truth-table tests for anon/authenticated/admin roles, operations, and tenants prove identical access.

## Priority 2 — indexing and validation

1. Rank the 119 unindexed foreign-key findings by observed query frequency, table size, join/delete workload, and expected index cost. Add indexes in reviewed, bounded migrations, using nonblocking creation where supported. Measure write/storage overhead and query plans before/after.
2. Build a signature-level inventory with static SQL checks and application call-site mapping. Test anonymous, authenticated, service-role, wrong-tenant, missing-identity, malformed-input, replayed-webhook, and failure cases.
3. Run Supabase advisor/security checks and regression suites against a non-production project. Review the exact migration and grant diff; stage deployment only after security review. Do not include these changes in the performance PR.

## Required per-function decision record

For every definer signature, record: exact overload, owner, caller(s), data/action reached, required privilege unavailable under invoker rights, tenant boundary, execution grants, `search_path` safety, abuse impact, regression tests, and the decision (`retain with controls`, `convert to invoker`, or `restrict/revoke`). No grant or policy changes are authorized by this plan alone.
