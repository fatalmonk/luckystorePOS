# Lucky Store
## Stack
- Storefront Next.js 16.4.5 / React 19; admin React 19 / Vite; mobile Flutter / Expo SDK 57; backend Supabase, Cloudflare Workers / R2

## Current Task
- 20261115-auth-boundaries: Maintain fail-closed webhook authentication and server-validated guest wishlist ownership.

## Decisions
- 20261112-bn-static-alternates: about/terms/return-policy/delivery (en + bn) use `buildLocaleAlternates`; emitted URLs are unchanged. The Bengali layout exports `openGraph.locale: 'bn_BD'` (alternate `en_BD`); pages that set their own `openGraph` still override it. Other pages keep hand-written alternates until Phase 2.
- 20261112-bn-switcher: LanguageSwitcher re-exports the shared `Locale` and uses `hasBengaliRoute`/`getLocalizedPathname`; /about, /terms, /return-policy, /brand and /best/dealoftheweek now switch to their `/bn` twins instead of `/bn` home. Paths without a twin still go to `/bn` and drop the query.
- 20261112-bn-route-map: `app/lib/i18n/navigation.ts` `BENGALI_ROUTE_PATHS`/`BENGALI_ROUTE_PREFIXES` + `hasBengaliRoute`/`getLocalizedPathname` are the single source for which English paths have `/bn` twins; `app/lib/i18n/metadata.ts` `buildLocaleAlternates(path, locale)` emits self-canonical + en-BD/bn-BD/x-default (x-default = English).
- 20261111-official-enrichment-scope: Update exact-pack Dano, Avonee L 48, Bashundhara Gold tissue, and BelleAme 240g cookies. Hold two other tissue records because their catalog category is `Pest Control`.
- 20261112-product-evidence: Draft covers 100 IDs / 127 URLs: 13 MATCHED, 37 PARTIAL, 44 UNAVAILABLE, 5 CONFLICT, 1 REDIRECT_ALIAS; MATCHED evidence does not prove stock or publication readiness.
- 20261110-thin-content: Under 300 words alone is not an SEO defect; 193 pages are conditional expansion candidates. Preserve distinct SKUs/locales and prioritize only with dated GSC/commerce evidence.
- 20261110-pr614-616: PR #614 removed unsupported unit-price shipping details; PR #616 corrected Cadbury 13.2 g identity. Production deployment and physical-pack verification remain separate.
- 20261110-dove: PR #610 merged as `53ec205b`; exact English/Bengali duplicate redirects, browse fallback exclusion, and owner-confirmed `2 + 2 -> 4 + 0` stock plan; production image bytes remain unverified.
- 20261109-seo-metadata: Bengali titles preserve exact localized prices; `htmlLimitedBots: /.*/` keeps metadata in `<head>`, with possible dynamic-route TTFB cost.
- 20261109-security-headers-config: X-Frame-Options, Referrer-Policy, and X-Content-Type-Options are configured and tested; production preservation remains unverified.
- 20261112-public-asset-cache: PR #622 merged as `7ddb5631`; version-controlled storefront images use `public, max-age=2592000, stale-while-revalidate=86400`. The shared constant generates LiteSpeed `.htaccess` and Node response policy; deployment smoke checks require the exact 24-hour revalidation directive.
- 20261115-guest-wishlist-auth: Webhook sync requires `SUPABASE_SYNC_WEBHOOK_SECRET`; wishlist ownership uses a one-year expiring HttpOnly cookie signed with the server-only Supabase service key. Client fingerprints are ignored; legacy rows remain unclaimed until an authenticated migration is designed.
- 20261112-storefront-followup: PRs #627–631 stabilized Bengali slugs, restored tea/logo presentation, reduced and versioned Bengali logos (153 KB to 72.5 KB each), deferred motion and trimmed home CSS, and updated canonical/security metadata, admin noindex, Chattogram delivery content, and category/product SEO.
- 20261110-pr609-production-smoke: Bounded production sample and build identity are recorded in `seo/evidence/2026-11-10/pr609-post-merge-smoke.md`; results do not clear sitewide PerfBee groups.
- 20261109-perfbee-p1-hreflang: Added six English/Bengali product alternate reciprocity tests.
- 20261109-branch-cleanup: Removed stale local/remote branches only at verified merged or closed PR heads; preserved open PRs and dirty worktrees.
- 20261109-pr-607-merged: PR #607 merged; audit/plan/task files remain local and untracked by design.
- 20261108-e6r-verification: Migration evidence binds reviewed Git commit bytes and hashes; test project had 290 remote / 276 local migrations, including 23 authorized remote-only and 9 local-only versions.
- 20261108-e6r-release: Production parity is unverified; migration scripts are not release-authoritative. Require current authorization, exact reviewed SQL/history, verified target, and real-role tests before production execution.
- 20261108-migration-parity-gate: The incomplete migration-parity job was removed from active Hostinger promotion; scripts remain dormant reference tooling.
- 20261108-egress-rollout: Health provenance requires HTTPS, status `ok`, exact reviewed build SHA, and a parseable fresh timestamp.
- 20261108-todo-update: `tasks/todo.md` tracks remaining E6 migration and egress follow-up.

## Blockers
- 20261110-official-source-gaps: Exact pack/market/GTIN and official nutrition panels remain missing for some products; hold unresolved 403/timeouts and Digestive, Toast, and Dry Cake conflicts pending source/label confirmation.
- 20261110-thin-content-data: 50 URL records, report headers, crawl/build identity, and dated GSC/commerce inputs are missing; no full-cohort priorities or metrics can be inferred.
- 20261111-enrichment-build-env: Clean-worktree build compiles/typechecks but `/blog` prerender lacks Supabase values and `NOTFAIR_SEO_API_KEY`.
- 20261108-e6r-production-parity: Production evidence records 276 migrations but not the exact complete version set.
- 20261108-e6r-test-local-only: Nine local-only migrations remain outside the reviewed manifest; test-project parity is pending.
- 20261108-committed-db-secret: A committed production DB connection string is treated as exposed; removal and credential rotation remain separate security work.
- 20261108-local-secret-scan: Full scan has 25 non-staged findings, including scanner fixtures in unrelated untracked files.
- 20261108-review-thread-resolution: Five fixed/replied Cubic threads remain unresolved; GraphQL resolution returned forbidden.

## Resolved
- 20261108-e6r-access: Connected Supabase evidence resolved resolver verification without requesting credentials.
- 20261108-e6r-phase2-tests: 43 focused CI tests and 1,013 app tests passed; typecheck/lint passed with three existing compiler warnings.
- 20261108-release-blocked-gate: Health verification contract completed and incomplete migration gate removed.
- 20261108-workflow-cleanup: Hostinger workflow uses `[resolve-context, test-staging]` before production deployment.
- 20261108-task-tracking: `tasks/todo.md` reflects the remaining E6 backlog.

## Next
- Before a storefront deployment, verify `SUPABASE_SYNC_WEBHOOK_SECRET` in Hostinger and decide whether legacy wishlist rows need a separate authenticated migration.
