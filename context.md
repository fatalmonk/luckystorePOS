# Lucky Store
## Stack
- Storefront Next.js 16.4.5 / React 19; admin React 19 / Vite; mobile Flutter / Expo SDK 57; backend Supabase, Cloudflare Workers / R2
## Current Task
PR 0A validation and hardening on `egress/pr-0a-baseline`: fail-closed staging observer, tests passing, awaiting staging credentials for baseline capture.
## Decisions
- 20261107-egress-0a-hardened: Observer hardened to fail closed unless explicitly verified staging (`VERCEL_ENV=preview`, `APP_ENV=staging`, or test environment targeting approved test ref `grxxenvdhfwzafzyykgo`). Hostinger and unknown envs fail closed. Native error propagation, cloned stream preservation, and caller context scoping verified with 9/9 passing tests. Full monorepo and storefront typechecks pass.
- 20261107-egress-0a: Shared storefront clients observe REST/RPC fetches only when `EGRESS_OBSERVATION=1` and the URL is not production. Benchmarks refuse production and stop at 20 scenarios, 500 requests, or 10 MB. Census is local-only. Direct checkout/order/wishlist/webhook clients are still uninstrumented. Route labels stay unknown until callers set context.
- 20261107-audit-local: Phase 5, egress implementation plan, and 2026-11-07 health audit are gitignored and unstaged. Files stay on disk. No commit.
- 20261107-egress-plan: Authorize read-only baseline (EGR-001/002), same-SHA release gates (REL-001), public-store security contract (SEC-001), and staging-only bounded UUID-prefix resolver (EGR-003 / PR 1). Do not authorize wholesale RPC consolidation, production migrations, v1 deletion, stock backfill, cross-worker cache, or production load tests. Evidence snapshot `bbdb3428`; revalidate against current `main` before coding.
- 20261106-egress: PR #592 deployed (`42171216215`); category reads coalesced 20→1. PR #593 merged `7a0789e`. Phase 3 test store kept 9 IDs; catalog+translation JSON 4,954→3,648 bytes. Production billing impact unknown.
- 20261107-stale-refs: Cleanup on `main` `bbdb3428` removed verified merged branches and the clean PR #594 worktree. Retained unique/unmerged work, dirty PR #593 worktree, four stashes. No deployment.
- Older: Vercel/Supabase env audits, PR #584 checkout/lock fixes, storefront memory and localization work — see git history and `system-docs/audits/`.
## Blockers
- Prefix resolver needs DB/security sign-off before staging SQL: fail-closed for absent `is_public_storefront` must not be smuggled into a performance PR; `stock_levels.tenant_id` nulls stay a separate data track.
- Staging JSON-byte savings are not billable egress until provider telemetry corroborates them.
- Promotion still needs owner approval of advertised products, prices, stock, offers, and delivery claims. Meta CAPI and V2 flyer copy remain unverified.
## Resolved
- 20261107-rendered-audit: Local and production 928 routes across four widths; production 9 errors on 5 routes were intermittent (75/75 headless reruns pageerror-free). No deployment.
- 20261107-manifest-memory: Dev-only Next 16.4.5 manifest parser/patch. 928-route sweep 926×200 and two 308s. Footprint 1.74 GB; not a 600 MB fix. No deployment.
## Next
Wait for explicit authorization before EGR-001 caller census or any code/SQL/CI change. First sprint excludes cross-worker cache, universal catalog RPC, v1 removal, mobile pagination rewrite, and production stress tests.
