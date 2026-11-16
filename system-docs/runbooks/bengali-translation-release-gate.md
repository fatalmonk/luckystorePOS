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

## Production preservation of September 2026 published Bengali translations

Historical context: PR #364 introduced the initial Bengali translations and admin workflow in September 2026. On 15 November 2026, the owner reiterated approval of the 100 previously published Bengali records. Production database investigation found all 100 rows were created on 15 September 2026 and last updated that day, with nonempty Bengali names and descriptions; 97 are currently active. This historical owner attestation is **not** evidence of a new per-product review with source links, and must never be represented as such.

The migration `20261114205845_preserve_historical_bengali_approvals.sql` contains a frozen 100-translation manifest using original UUIDs, tenant/item mapping and content SHA-256 digests, but no copied descriptions. It restricts legacy publication to a byte-for-byte match of this cohort and its canonical source identity. All future or edited publications must satisfy the PR #634 reviewer/evidence/attribution requirements. Legacy publication stops if a translation is edited, becomes a draft, its source is changed or disabled, its tenant changes, or its public storefront is removed. A changed legacy translation must follow normal review; no status or attribution is fabricated.

The one-time `bengali-legacy-prehardening-bridge.sql` is a production-only transitional DDL script, **not** a numbered schema migration. It uses the identical 100 hashes to keep old published records visible through the first six hardening migrations, whose initial RLS policy otherwise hides them. The final numbered migration installs a permanent narrow legacy predicate for the regular public reader and both privileged mobile RPC joins and automatically drops the temporary policy and helper.

Release requirements:
1. Verify the exact Testing project `grxxenvdhfwzafzyykgo` and Production project `hvmyxyccfnkrbxqbhlnm`; do not mix credentials. The CLI migration ledger is reconciled in an isolated temporary directory using already-applied version placeholders. Do not replay, delete, or repair historical migrations.
2. Re-run `node --test scripts/testing/verify_historical_bengali_legacy.test.mjs`, the local-only SQL regression and all PR CI. Review the Git diff and exact 100-entry hash equality.
3. Validate production's historical cohort and 97 active items read-only. The bridge's 100-fingerprint guard refuses deployment on any drift.
4. On Production, apply the temporary bridge transaction first; verify it still restricts publication to those original 100 IDs. Then push all nine reviewed numbered migrations in chronological order using the reviewed, isolated migration ledger (`--skip-vault` and exact project ref). The CLI must show only those nine reviewed migration files; the bridge remains a separate one-time transaction.
5. After each phase or on failure, public storefront visibility must not fall below the 97 previously active legacy items. If any phase fails, **stop**; the temporary bridge is intentionally retained until final migration succeeds.
6. Verify that the final 100-row manifest is stored privately, 97 active original translations remain anonymous-visible, the three inactive originals remain hidden, no additional anonymous table grants exist, all original Bengali descriptions remain unchanged, and the temporary bridge has been removed.
7. Do not merge or deploy the new storefront/admin code unless production schema verification and head-commit CI both pass. The final human action is approval of PR #634 merge; merge itself remains separate.

Isolated PostgreSQL 17.11 qualification (15 November 2026): the exact 100-record production content was copied to a disposable local UNIX-socket database outside Git. All nine numbered migrations were applied in order both without and with the temporary bridge. With the bridge enabled, the anonymous reader returned **97 records after every migration phase**. Both `supabase/tests/bengali_translation_publication_test.sql` and `supabase/tests/bengali_legacy_publication_test.sql` passed. The 100-row transient source-data fixture was never committed.

### Final release amendment (15 November 2026)
The verified release now contains **nine** migration versions: the original six, `20261114205845` (the 100-row immutable historical compatibility manifest), `20261114212128` (HTTPS-only evidence verification and exact publication-filtered Bengali mobile catalog RPC v2), and `20261115090000` (strict public-store metadata handling, legacy predicate alignment, and Bengali name ordering). The original v1 mobile RPC remains compatible for English and previously deployed applications; the Bengali mobile adapter uses v2 with `p_locale='bn'`, restricting the published set **before** pagination and total counts. The published cohort remains visible in v2 via the exact legacy hash predicate.

In addition to the immutable UUID/hashes, `supabase/data/historical-bengali-publications-2026-09-15.json` contains the archived published Bengali names/descriptions for all original 100 records, extracted read-only from production and now maintained in Git. This is historical published copy, not evidence of a modern individually attributed review. It is not loaded as a migration seed and must not be replayed over newer translations.

In isolated PostgreSQL, the v2 Bengali catalog was exercised with the 100 original records plus one English-only active product: Bengali total 97 with pagination 60 + 37; English total 98; English-only item omitted from Bengali query, retained in English. Public evidence URLs now require HTTPS. The original SQL publication regression and new source-drift/legacy rollback regression still pass.

The dedicated Testing project has verified migrations `20261114205845` and `20261114212128` applied. Its historical cohort is correctly empty, two Samyang published test records have valid canonical snapshots, and the new v2 function exists. Migration `20261115090000` is part of the reviewed nine-migration release and must be verified in the same project before production rollout. Testing stores are not flagged as public storefronts, so the RLS public eligibility count of those published test records remains zero until the store's public metadata is configured; this does **not** invalidate their authenticated human review/publication event.

**Production order:** (1) exact source-hash preflight, (2) one-time transitional bridge transaction, (3) nine-numbered-migration CLI `--skip-vault` release using the verified isolated migration-ledger workdir, (4) full public-read, RLS, immutable original-copy and schema checks, (5) approve merging PR #634. The temporary bridge is dropped automatically by the seventh migration; the eighth adds the v2 RPC and HTTPS rule; the ninth aligns public-store handling and Bengali name ordering across the mobile readers.
