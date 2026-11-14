# Bengali translation Testing release gate

This is a narrow, repeatable check. No live production interactions, credentials in Git, schema writes, migration repairs, account seeding, or browser edits.

1. Configure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and E2E_SUPABASE_PROJECT_REF for the dedicated Supabase Testing/Security project. Never provide service-role credentials to the public API gate.
2. Run: node --test scripts/testing/verify_bengali_translation_api.test.mjs
3. Run: node scripts/testing/verify_bengali_translation_api.mjs
4. GitHub Actions storefront E2E already configures Testing via secrets, seeds approved fixtures, and runs Playwright. The REST security gate executes immediately after the existing preflight and before building the UI.
5. For database migration reviews, use the existing authorized 23-entry Testing-only historical ledger and fail-closed isolated CLI workflow in the Lucky Store Supabase Ops skill. Do not replay old migrations or run migration repair.
6. For hosted publication lifecycle, use the committed local-only transaction regression through a separately reviewed Testing-only rollback harness. Never weaken its original local-only guard.
7. A complete live admin browser publication journey remains blocked until BOTH admin and storefront previews can be proven bound to Testing, without Production requests. CI Playwright success is not evidence that an external admin preview is isolated.

Release gate: public REST checks, hosted transaction regression, CI, and verified staging UI must all pass before considering Production. Production still requires separate explicit authorization.
