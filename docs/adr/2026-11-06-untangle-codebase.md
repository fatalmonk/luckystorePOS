# Untangle codebase decisions — 2026-11-06

## Findings and fixes

- English and Bengali category routes independently resolved category/group slugs, legacy category names, canonical redirects, and catalog snapshot fallback. Added shared category route and catalog helpers; both locales now use them, preserve query parameters on redirects, and show consistent product counts.
- Admin route strings were duplicated between router and sidebar. Added `ADMIN_ROUTE_PATHS` as the shared route source.
- Two financial metric cards used side rails, then top accent borders that still clashed with rounded corners. Removed the accent borders; the labels and values already distinguish the metrics.
- Dashboard queries lived in the UI while other admin data access used the API boundary. Moved delivery, sales, and expense reads to the dashboard API domain; realtime subscriptions remain with the dashboard feature.
- Inventory update accepted an unused idempotency argument and removed one field through an untyped catch-all. Removed the argument and made supported field mapping explicit.
- Customer mobile checkout imported a cart type from UI state, and unknown stock policy duplicated a magic limit. Moved the type into the model layer and centralized the policy.
- Mobile offline transaction models lived in the sync service, creating a service/conflict-resolver import cycle. Moved the model into `models` and preserved compatibility exports and serialization.
- Removed unused mobile sync queue screen, customer mobile placeholder, scraper mapper script, scraper dependency, and its lock entries. The mapper was not referenced and contained no meaningful assertions.
- Checkout E2E depended on live catalog stock although it was exercising mocked checkout flow; seeded local storage instead. Search E2E no longer silently skips when a required menu is missing. Replaced conditional wishlist E2E cases with deterministic out-of-stock component coverage. Removed stale skipped RPC tests and restored coverage for the still-defined payment-ledger RPC.

## Deliberately separate

- BLE label printer implementations share a name but support different APIs and print protocols; merging them would obscure device-specific behavior.
- Supabase edge functions use differing auth and CORS policies; a common abstraction would couple independently changing security boundaries.
- Offline sync persistence and scheduling remain in the service; this pass only moves the shared domain model to remove the cycle.

## Validation limits

- Storefront focused tests and typecheck, admin tests and typecheck with TypeScript 6 deprecation override, customer mobile tests, Flutter offline queue tests/analyzer, and focused checkout Chromium flow passed.
- Admin's default typecheck invocation reports TS5101 for deprecated `baseUrl`; the supported CLI deprecation override passes.
- Customer mobile typecheck cannot resolve this checkout's Expo/React Native dependencies and cascades into missing JSX/type errors.
- Supabase RPC integration tests stopped at the repository guard because `SUPABASE_TEST_PROJECT_REF` was not set to required test project `grxxenvdhfwzafzyykgo`; no database mutation was attempted.
- A Playwright invocation with the checkout grep also ran an auth-boundary cart test, which failed its empty-cart assertion; the targeted checkout flow passed. The dev server emitted memory-threshold restart warnings during E2E runs.
