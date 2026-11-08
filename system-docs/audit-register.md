# Audit Register — Lucky Store

**Purpose:** Single source of truth for all audit documents and their remediation status. This register is **tracked in Git** (unlike the local-only `system-docs/audits/README.md`) so remote reviewers can access the complete picture without requiring local files.

**Policy Reference:** See `system-docs/README.md` (Documentation Policy section) for tracking rules.

**Last Updated:** 2026-11-08  
**Branch:** `docs/audit-reconciliation-2026-11`  
**Source Audits (local-only, gitignored per policy):**
- `system-docs/audits/lucky-store-phase-5-supabase-egress.md` (Phase 5 synthesis)
- `system-docs/audits/2026-11-06-supabase-egress-phase2-measurement.md` (Phase 2)
- `system-docs/audits/2026-11-06-supabase-egress-phase3-results.md` (Phase 3)
- `system-docs/audits/2026-11-06-supabase-egress-phase4-report.md` (Phase 4)
- `system-docs/audits/2026-10-22-supabase-log-query-attribution.md` (Log Query Attribution)
- `system-docs/competitive/competitor-seo-audit-2026.md` (Competitive Intelligence)

---

## Tracked Audit Files (Committed to Git)

These audits document **completed work with implemented fixes and verified evidence**.

| File | Date | Type | Status | Key Outcomes |
|------|------|------|--------|--------------|
| `system-docs/audits/2026-10-08-customer-mobile-ux-audit.md` | 2026-10-08 | Mobile UX | **Implemented** | 17 findings (9 P1, 8 P2); dark theme, persistence, language, notifications, order errors, quantity controls, guest tracking race, lint gate — fixes applied in follow-up commits |
| `system-docs/audits/2026-10-23-customer-storefront-and-seo-audit.md` | 2026-10-23 | Storefront SEO | **Implemented** | 6 findings (2 P1, 4 P2); dark-mode CTA contrast, mobile hero overlap, image shimmer race, delivery timing alignment, SSR bailout on /delivery, category clipping — all fixed with tests passing |

---

## Investigation Audit Files (Gitignored — Local Only)

These contain ongoing investigation evidence, proposed work, incomplete reconciliation, or competitive intelligence. **Not committed to Git per policy.**

| File | Date | Type | Status | Summary |
|------|------|------|--------|---------|
| `lucky-store-phase-5-supabase-egress.md` | 2026-11-08 | Supabase Egress Investigation | **Ongoing** | Phase 5 synthesis: PR #601 (Phase 2C) deployed; historical gateway traffic analysis; endpoint/caller mapping; 7 proposed PRs (A–G) with security gates; migration history reconciliation incomplete (test 288 vs prod 275); production egress savings unmeasured |
| `2026-11-06-supabase-egress-phase2-measurement.md` | 2026-11-06 | Cache Key Verification | **Verification Complete** | Cache key offset fix confirmed in code (PR #587); local fixture tests pass (50% request drop for synthetic duplicate); no staging/production egress measurement; Phase 1 findings status tracked |
| `2026-11-06-supabase-egress-phase3-results.md` | 2026-11-06 | Mobile Catalog Optimization | **Deployed** | PR #588 + PR #591 merged; mobile RPC `search_storefront_mobile_catalog_v1` deployed; synthetic benchmark: 99.75% fewer serialized bytes, 96.72% fewer requests; production rollout via Hostinger run 42141518789; test-project migration history divergent (288 vs 275); production egress savings unknown |
| `2026-11-06-supabase-egress-phase4-report.md` | 2026-11-06 | Request Suppression | **Deployed** | PR #592 merged; middleware category cache (5-min TTL, in-flight coalescing), hidden-tab promotion polling stop, brand page refactor (no call reduction); Hostinger run 42171216215 deployed; controlled tests prove 20→1 category fetch (95% fewer in-process); production egress reduction unmeasured |
| `2026-10-22-supabase-log-query-attribution.md` | 2026-10-22 | Log Query Attribution | **Inconclusive** | 1.919 TB Log Query spike on 2026-10-19 attributed to production project (99.67%); Cloudflare Workers ruled out; exact actor/query unidentified; Supabase Platform Audit Logs require Team/Enterprise plan |
| `../competitive/competitor-seo-audit-2026.md` | 2026-10-10 | Competitor SEO/GEO | **Reference** | 4 Bangladesh competitors analyzed; all lack server-rendered JSON-LD, canonicals, AI bot readiness; Lucky Store advantages documented; 4 strategic recommendations |

---

## Classification Taxonomy

| Category | Tracking | Criteria | Examples |
|----------|----------|----------|----------|
| **A — Tracked** | Committed | Completed work with implemented fixes, release evidence, policy decisions | Mobile UX audit, Storefront SEO audit |
| **B — Gitignored (Investigation)** | Local only | Ongoing investigations, proposed work, incomplete reconciliation, sensitive evidence | Phase 2-5 reports, Log query attribution |
| **C — Gitignored (Competitive)** | Local only | External research, competitor analysis, market intelligence | Competitor SEO audit |

---

## Verified Remediation Status

This section documents the **implementation and deployment status** of each Supabase egress optimization phase, verified against source code, merged PRs, and deployment evidence.

### Phase 1 — Cache Key Offset Fix (PR #587)

| Aspect | Status | Evidence |
|--------|--------|----------|
| **Code Change** | ✅ Implemented | Commit `294c53a7`: `CachingProductAdapter.ts` — cache key now includes `offset`; `SupabaseProductAdapter.ts` canonicalizes pagination |
| **Tests** | ✅ Passing | `CachingProductAdapter.test.ts`: 73 new lines; 17/17 tests pass; demonstrates 2→1 request drop for synthetic duplicate |
| **TypeScript** | ✅ Clean | `tsc --noEmit` passes |
| **Lint** | ✅ Clean | ESLint passes |
| **Deployment** | ✅ Merged to `main` | Included in subsequent PRs |
| **Production Egress Impact** | ❌ Unmeasured | No staging/production gateway byte trace; local fixture only |
| **Phase 1 Finding: Broad catalog reads** | 🟡 In Progress | Confirmed in code; mobile route uses paginated RPC (Phase 3) |
| **Phase 1 Finding: Middleware bypasses cache** | 🟡 Partial | Addressed in Phase 4 (PR #592) with 5-min category cache |
| **Phase 1 Finding: Brand page broad searches** | 🟡 Partial | Refactored in Phase 4 (PR #592) but no call reduction proven |
| **Phase 1 Finding: Promotion polling** | 🟡 Partial | Hidden-tab pause implemented in Phase 4 (PR #592) |
| **Phase 1 Finding: SSR/client duplicates** | ❌ Unresolved | Insufficient evidence; no correlated browser/server traces |
| **Phase 1 Finding: Hostinger/Cloudflare cache** | ❌ Unresolved | Repository config alone cannot prove cross-instance persistence |

**Verdict:** Code fix **implemented and tested**; production egress impact **unmeasured**.

---

### Phase 2 — Cache Key Correction Verification (Documentation Only)

| Aspect | Status | Evidence |
|--------|--------|----------|
| **Code Change** | ✅ Verified | Same as Phase 1 (PR #587) — verified in Phase 2 audit |
| **Tests** | ✅ Passing | Local fixture tests re-run: 111 tests pass in 1.26s |
| **Staging/Production Measurement** | ❌ Not Done | No controlled staging URL, Supabase gateway trace, or production cache telemetry available |
| **50% Reduction Target** | ❌ Unevaluated | No app-wide or Phase-2-attributable percent reduction claimed |

**Verdict:** Verification **complete**; no new code changes; measurement **pending**.

---

### Phase 3 — Mobile Catalog Server-Side Pagination (PR #588 + PR #591)

| Aspect | Status | Evidence |
|--------|--------|----------|
| **Code Change (PR #588)** | ✅ Implemented | Commit `d54b2ea6`: new RPC `search_storefront_mobile_catalog_v1`, mobile catalog route, pagination, 60s Next Data Cache |
| **SQL Migrations** | ✅ Applied | `20261105235042_add_mobile_catalog_search_rpc.sql`, `20261106000000_update_mobile_catalog_visibility_and_offset_guards.sql` |
| **Test Verification (PR #591)** | ✅ Implemented | Commit `80c38f6f`: 5 forward test-only migrations, transactional regression suites, forensic provenance of 5 legacy snapshots |
| **Synthetic Benchmark** | ✅ Documented | 99.75% fewer serialized bytes (3.68 MB → 9 KB), 96.72% fewer requests (61→2), 99.72% lower median DB time |
| **Test Project Verification** | ✅ Complete | Both catalog migrations applied; SQL/security regression checks passed; store visibility enabled read-only |
| **Production Deployment** | ✅ Deployed | Hostinger run `42141518789` (SHA `d54b2ea`): build → staging validation → production deploy → production smoke passed |
| **Production RPC Smoke** | ✅ Passed | Read-only `anon` probe: 1 item, exact total 684, `hasMore=true`, no cost fields; edge log confirms 1 call to new RPC |
| **Test Project Migration History** | ❌ Divergent | Test: 288 records (includes 5 test-only forward + 2 divergent preview-image); Production: 275 records matching repo |
| **Production Egress Savings** | ❌ Unknown | No pre/post gateway byte trace or billing measurement |
| **Production Log Observation** | 🟡 Inconclusive | Post-release: zero `mobile_catalog` paths in edge logs; only probe call observed |

**Verdict:** **Deployed to production**; code and migrations **verified**; test-project history **divergent**; production egress **unmeasured**.

---

### Phase 4 — Steady-State Request Suppression (PR #592)

| Aspect | Status | Evidence |
|--------|--------|----------|
| **Code Change** | ✅ Implemented | Commit `9557e2c0`: middleware category cache (5-min TTL, in-flight coalescing), hidden-tab promotion polling stop, brand page `Promise.all` refactor |
| **Middleware Category Cache** | ✅ Tested | Focused test: 20 simultaneous requests → 1 categories fetch (95% fewer in-process); fail-open preserved |
| **Hidden-Tab Promotion Polling** | ✅ Tested | 3 new regression tests in `useCart.test.ts`: mount-hidden, visibility-restore, tab-hiding transitions; 21/21 pass |
| **Brand Page Refactor** | ✅ Implemented | `searchAllPages` helper; concurrent `Promise.all`; bounded to 10 pages; **no call reduction established** (repository already clamped to 500) |
| **TypeScript** | ✅ Clean | `tsc --noEmit` passes |
| **Tests** | ✅ Passing | 92 tests pass (7 brandsData, 21 useCart, 64 seo-routing-contract) |
| **Production Deployment** | ✅ Deployed | Hostinger run `42171216215` (SHA `9557e2c`): build → staging validation → production deploy → production smoke passed |
| **Production Telemetry** | ❌ Confounded | Matched 5-min edge-log samples around rollout are traffic-confounded; category/catalog RPC logs lack `Content-Length` |
| **Overall Egress Reduction** | ❌ Unmeasured | Controlled tests prove request suppression in specific paths; no production byte measurement |

**Verdict:** **Deployed to production**; middleware cache and hidden-tab polling **verified by tests**; brand refactor **no reduction proven**; production egress **unmeasured**.

---

### Phase 5 — Anonymous PDP Stock Read Elimination (PR #601)

| Aspect | Status | Evidence |
|--------|--------|----------|
| **Code Change** | ✅ Implemented | Commit `2283fc69`: dedicated anon client (`getAnonymousStorefrontClient`), `stockReadMode='catalog'`, per-mode WeakMap cache bundles |
| **Request Reduction** | ✅ Unit Verified | Regression test proves 4→3 Data API request reduction per anonymous PDP |
| **Fail-Closed Behavior** | ✅ Tested | Zero-stock on catalog RPC error |
| **RLS/Tenant Isolation** | ✅ Preserved | No RLS, tenant-isolation, or production-write changes |
| **Cubic P2 Fixes** | ✅ Applied | Restored `SUPABASE_API_KEY` alias; anon client cache-eligible in search; regression tests added |
| **TypeScript** | ✅ Clean | `tsc --noEmit` passes |
| **Lint** | ✅ Clean | Strict lint passes |
| **Tests** | ✅ Passing | 814/814 unit tests pass; read-only E2E on approved test project (2 passed) |
| **Production Deployment** | ✅ Deployed | Hostinger run `42442174577` (SHA `2283fc6`): staging validation → production deploy → production smoke passed |
| **Production Gateway Verification** | 🟡 Partial | User-supplied 22-min windows: `stock_levels` 18→0; `items` 38→27; `catalog_v2` 29→53; `item_translations` 36→61; catalog/translation traffic increased |
| **Production Egress Savings** | ❌ Unknown | No full-hour comparison, no 24-hour period, no billing measurement; response lengths incomplete |

**Verdict:** **Deployed to production**; unit-verified 4→3 request reduction; production gateway shows mixed results (stock eliminated but catalog/translation increased); **egress savings unmeasured**.

---

### Log Query Attribution Investigation (2026-10-22)

| Aspect | Status | Evidence |
|--------|--------|----------|
| **Spike Attribution** | ✅ Project-Level | 1.919 TB Log Query on 2026-10-19 → production project (99.67% of org total) |
| **Cloudflare Workers** | ✅ Ruled Out | Competitor scraper: no workflow runs on 19 Oct; Agent Worker: no Supabase REST calls |
| **Request Source** | 🟡 Partial | IP `88.223.84.66` labeled `HOSTINGER-HOSTING`; node/Next.js Middleware UAs; `supabase-js/2.110.7` on Node 22 |
| **Exact Actor/Query** | ❌ Unidentified | Supabase Free plan lacks Platform Audit Logs; Log Query scan history not exposed; request logs ≠ Log Query scans |
| **Billing Impact** | ✅ Known | Free plan not billed for Log Query overages; grace period until 2027; prior-cycle quota issue was **Egress Exceeded** (separate) |

**Verdict:** **Inconclusive** — exact spike generator unidentified; requires Team/Enterprise plan for audit logs.

---

## Unresolved Findings (Ranked by Severity)

### Critical — Blockers to Production Egress Verification

| ID | Finding | Source | Severity | Affected Component | Remediation Status | Related PRs | Evidence Quality | Next Verification Step |
|----|---------|--------|----------|-------------------|-------------------|-------------|------------------|------------------------|
| U-01 | **No production egress measurement for any phase** | Phases 2, 3, 4, 5 | Critical | Supabase egress billing | ❌ Unresolved | #587, #588, #592, #601 | None — no gateway byte traces | Deploy staging instrumentation (PR A); capture matched pre/post 1-hr + 24-hr gateway aggregates with `Content-Length` coverage |
| U-02 | **Test-project migration history divergent (288 vs 275)** | Phase 3, Phase 5 | Critical | Database schema parity | ❌ Unresolved | #588, #591 | Complete — 17 test-only versions, 9 repo-only, 9 same-name pairs mapped | Preserve read-only test ledger export; classify 5 test-only records without repo paths; verify DB-state implications before history repair |
| U-03 | **Production migration history name drift (13 records)** | Phase 3 | High | Database schema parity | ❌ Unresolved | — | Complete — 13 prod records use different names than repo filenames | Map each name-drift record; verify SQL equivalence before declaring full history parity |

### High — Security Gates Blocking Proposed PRs

| ID | Finding | Source | Severity | Affected Component | Remediation Status | Related PRs | Evidence Quality | Next Verification Step |
|----|---------|--------|----------|-------------------|-------------------|-------------|------------------|------------------------|
| U-04 | **PR B: UUID-prefix lookup requires SECURITY DEFINER parity with RLS** | Phase 5 | High | `resolve_storefront_item_prefix_v1` RPC | 🟡 Proposed (not implemented) | Phase 5 PR B | Draft SQL exists; security review needed | Security review of privilege choice; staging EXPLAIN on seeded corpus; role/RLS/public-store parity approval |
| U-05 | **PR C: PDP fallback consolidation must preserve stock authority and RLS** | Phase 5 | High | PDP stock reads | 🟡 Proposed (not implemented) | Phase 5 PR C | Code paths mapped; risk assessed | Implement with stock authority preservation; no production load tests; denied/missing stock test matrix |
| U-06 | **PR D: v1/v2 consolidation blocked by incomplete caller census** | Phase 5 | High | Catalog RPCs | 🟡 Proposed (not implemented) | Phase 5 PR D | 25 legacy refs, 17 v2 refs, 22 translation refs indexed; cloud-agent tool unavailable | Complete caller census with runtime classification; staging parity tests for every actual caller contract |

### Medium — Measurement & Attribution Gaps

| ID | Finding | Source | Severity | Affected Component | Remediation Status | Related PRs | Evidence Quality | Next Verification Step |
|----|---------|--------|----------|-------------------|-------------------|-------------|------------------|------------------------|
| U-07 | **PR A: Staging attribution instrumentation not built** | Phase 5 | Medium | Request attribution | 🟡 Proposed (not implemented) | Phase 5 PR A | Requirements documented | Build shared fetch/RPC observation boundary in staging; correlate trace ID with endpoint, source, bytes, cache outcome |
| U-08 | **Production telemetry confounded (Phase 4)** | Phase 4 | Medium | Category/promotion egress | ❌ Unresolved | #592 | Edge logs lack Content-Length; traffic-confounded | Normalize using storefront traffic; align provider egress metrics; exclude preview/monitor cohorts |
| U-09 | **Brand page request reduction not established (Phase 4)** | Phase 4 | Medium | Brand catalog reads | ❌ Unresolved | #592 | Refactor preserves same concurrency; repo already clamped to 500 | Measure actual brand page Supabase calls pre/post with controlled staging traffic |
| U-10 | **SSR/client duplicate requests unproven** | Phase 1 | Medium | All storefront reads | ❌ Unresolved | — | No correlated browser/server traces | Correlate trace ID with browser+server; distinguish real duplicates from shared cache hits |
| U-11 | **Hostinger/Cloudflare cache persistence unproven** | Phase 1 | Medium | CDN caching | ❌ Unresolved | — | Config alone insufficient | Inspect deployed cache headers, hit rates, restart behavior, instance topology |

### Low — Investigative Gaps

| ID | Finding | Source | Severity | Affected Component | Remediation Status | Related PRs | Evidence Quality | Next Verification Step |
|----|---------|--------|----------|-------------------|-------------------|-------------|------------------|------------------------|
| U-12 | **Exact Log Query spike actor unidentified** | Log Attribution | Low | Supabase Log Query | ❌ Unresolved | — | Free plan lacks audit logs | Upgrade to Team/Enterprise for Platform Audit Logs; or accept inconclusive |
| U-13 | **PR E: Brand/projection experiments — alias/coverage risk high** | Phase 5 | Low | Brand catalog | 🟡 Proposed | Phase 5 PR E | Design only | Validate alias policy coverage beyond one page; exact totals/order; locale fallback |
| U-14 | **PR F: Cache/canonical tuning — stale prefix invalidation, cross-instance unproven** | Phase 5 | Low | Cache invalidation | 🟡 Proposed | Phase 5 PR F | Design only | Test offset/filter/store/client isolation; invalidation after stock/price edits; instance restart |
| U-15 | **PR G: Promotion/asset follow-ups — only after attribution supports** | Phase 5 | Low | Promotion polling, images | 🟡 Proposed | Phase 5 PR G | Design only | Build attribution first (PR A); then cart mutation, expiry, hidden/restored tabs, image headers |
| U-16 | **Mobile full-catalog paging historical, not current** | Phase 5 correction | Low | Mobile catalog | ✅ Clarified | — | Phase 3 already implemented server-side pagination | No action — already resolved in Phase 3 |
| U-17 | **Canonical middleware affects named-prefix URLs too** | Phase 5 correction | Low | Product canonicalization | ✅ Clarified | — | Already bounded (1.5s abort, limit 1-2) | No action — already bounded |
| U-18 | **Eight daily endpoint counts sum to 93,614 (not 93,778)** | Phase 5 correction | Low | Gateway metrics | ✅ Clarified | — | Difference of 164 (0.17%) | No action — accounting precision |

---

## Deployed Work Evidence Summary

| PR | Title | Merged Commit | Hostinger Run | Deployment Status | Audit Reference |
|----|-------|---------------|---------------|-------------------|-----------------|
| #587 | Cache key offset fix | `294c53a7` | Included in later runs | ✅ Merged to `main` | Phase 1/2 |
| #588 | Mobile catalog pagination | `d54b2ea6` | 42141518789 | ✅ Production deployed + smoke | Phase 3 |
| #591 | Test verification & snapshots | `80c38f6f` | — | ✅ Merged to `main` | Phase 3 |
| #592 | Steady-state request suppression | `9557e2c` | 42171216215 | ✅ Production deployed + smoke | Phase 4 |
| #601 | Anonymous PDP stock read elimination | `2283fc69` | 42442174577 | ✅ Production deployed + smoke | Phase 5 |

---

## Security Review Checklist (Pre-Commit)

- [x] No raw IP addresses exposed (sanitized to `HOSTINGER-HOSTING` label)
- [x] No Supabase credentials, API keys, or service-role keys
- [x] No database passwords or connection strings
- [x] No customer PII (names, addresses, order details)
- [x] No internal hostnames or private network topology
- [x] No unvalidated measurements presented as production facts (all labeled "unmeasured" or "synthetic")
- [x] No pending PR proposals exposed as commitments (all labeled "proposed")
- [x] Migration history details limited to counts and status — no SQL bodies
- [x] Function SHA-256 hashes omitted (available in local audit only)
- [x] Specific synthetic fixture data sizes documented as controlled comparisons only

---

## Validation Commands

```bash
# Documentation link check
# (No broken internal links in this register)

# Git diff check
git diff --check

# Secret scanning (repository-level)
# Runs automatically in CI; no secrets expected in this documentation file
```

---

## Maintenance

- **Update this register** when: new audit created, audit status changes, fixes implemented, deployment completed, unresolved finding resolved
- **Do not commit** Category B or C source files — they remain gitignored per `system-docs/README.md` policy
- **Cross-reference**: Link to `tasks/todo.md` for follow-up work items
- **Promotion path**: To track a Category B audit, implement all proposed work, resolve findings, sanitize, then move to Category A