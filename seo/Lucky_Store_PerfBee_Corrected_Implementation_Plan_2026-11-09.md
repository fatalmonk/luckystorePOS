# Lucky Store PerfBee Audit — Corrected Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task by task **only after explicit human approval**. Every implementation step is test-first; keep one independently reviewable PR per task. **This document is a read-only proposal.**

**Date:** 2026-11-09 (Asia/Dhaka)  
**Goal:** Reproduce and remedy verified Lucky Store SEO/security/performance defects without regressions to canonical indexing, bilingual discovery, checkout, pricing/stock freshness, or Supabase egress.  
**Architecture:** Establish production response evidence and deployment provenance first. Repair shared metadata, security-header, image and content templates at the smallest confirmed source of each defect. Measure results with HTTP-level tests, Playwright, existing Vitest contracts and a comparable PerfBee crawl.  
**Tech stack:** Next.js 16, React 19, TypeScript, Vitest 4, Playwright, Hostinger behind Cloudflare, Supabase. Confirm the *effective* installed Next version with the lockfile before attributing framework behavior.  
**Spec/source:** User-supplied `Pasted text(20261109-014855).txt`; PerfBee site 87 and full crawl `3d61b6cd-4ec3-467c-bcf3-dd4a9adb6582`; TinyFish read-only inspection `https://agent.tinyfish.ai/runs/5461881b-7f31-4402-a035-36d593d00b44`.  
**Repository baseline examined:** `fatalmonk/luckystorePOS` at commit [`518725de794a2b9ede0470ec157cb47ecf8554c0`](https://github.com/fatalmonk/luckystorePOS/commit/518725de794a2b9ede0470ec157cb47ecf8554c0). Re-pin and compare before execution.  
**Proposed repository location:** `docs/superpowers/plans/2026-11-09-lucky-store-perfbee-remediation.md`. **Not written to the repository.**

## Decision and scope

**Do not execute the uploaded 14-task draft as written.** Its root-cause table repeatedly turns symptoms or generalizations into 'confirmed' code faults. Its performance proposals could change inventory freshness, increase egress, and remove crawlable content. Its projected score of 95+ is not substantiated. Reuse the issue inventory, but replace speculative fixes with evidence-gated tasks.

**Included:** The **16 grouped fixes actually returned** by PerfBee's latest full crawl (250-page limit): thin content (250), canonical conflict (143), images missing alt (73), frame protection (250), referrer policy (250), image dimensions (243), SEO tags outside head (143), long titles (28), short titles (20), slow response (14), large HTML (89), long descriptions (43), duplicate titles (2), short descriptions (5), duplicate H1 (2), duplicate descriptions (2). Counts overlap; **do not sum as distinct pages**. 1,927 are issue occurrences, not unique root causes. Zero broken links were reported. The crawl stopped at 250 pages and is **not whole-site coverage**.

**Excluded unless separately reproduced:** Claimed `structured_data_warnings` on 250 pages, `hreflang_sitemap_differs` on 42 pages, pixel-width title/description findings, and `heading_level_skipped`. These appear in the supplied 21-item draft but **not** in PerfBee's 16-item grouped fix response. Investigate real issues if evidence emerges; do not present these as confirmed PerfBee fixes.

**Non-goals:** New product features, UI redesign, product data invention, blanket 300-word SEO padding, automatic ISR on volatile product pages, moving product prose/JSON-LD to client-only fetch, production writes, migration, merge or deployment.

## Evidence and confidence register

| Evidence ID | Observation | Confidence / interpretation |
|---|---|---|
| E1 | PerfBee groups canonical conflict and tags-outside-head on 143 pages, including Bengali products **and** `/best/dealoftheweek`, although its template label is `/product/{slug}`. | High confidence that the crawler flagged them; root cause and template grouping not established. |
| E2 | Pinned source `app/RootLayoutDocument.tsx` defines `metadata.alternates.canonical: '/'`; English and Bengali layouts re-export it. Individual product pages explicitly generate their own absolute canonical and locale alternates. | High-confidence source behavior; duplicate output **not demonstrated** from source alone. |
| E3 | TinyFish's browser probe on `/bn/product/aarong-standardized-milk-500-ml--3d7c76cf` reported **one** canonical in `head`, pointing to `/product/...` (English), and only one `hreflang="en"`; no offending body tags. It also reported English title and no JSON-LD. | Significant live/implementation mismatch, **not proof of a root-layout duplication**. Browser had intermittent HTTP 429, could not access response headers, and may not reflect a complete/non-stale response. Repeat with clean direct HTTP capture. |
| E4 | TinyFish HTML extraction on a different Bengali product returned visible product overview text but omitted title, description and canonical in its extracted metadata. | A tool-specific extraction discrepancy; not proof raw server HTML lacks these fields. |
| E5 | Pinned `next.config.js` global `headers()` adds link-discovery `Link` headers, but no frame/referrer security headers. | High-confidence repository configuration gap; effective Hostinger/Cloudflare headers remain unverified. |
| E6 | `ProductJsonLd.tsx` already emits `sku`, validated GTIN when valid, conditional actual brand and Offer data. `BrandShell.tsx` provides alt on logo `<Image>`; `CategoryHero.tsx` uses decorative `alt=""`. | **Disproves** corresponding blanket claims in supplied draft; specific image/JSON-LD defects require actual element samples. |
| E7 | `getCachedProductBySlug.ts` uses React `cache()` to deduplicate metadata/page reads within a request. English product page has no explicit `force-dynamic`; homepage/category/brand pages do. | **Disproves** 'all pages always force-dynamic with no caching'. React cache is request-scoped, not a cross-request cache. |
| E8 | PerfBee sampled long titles on brand pages and short titles on Bengali product/category pages; duplicate title pair is two Dove shampoo variant URLs. | High confidence in exact page families; generic English product title formatter is **not** the root cause of every flagged title. |
| E9 | PerfBee's image missing-alt sample includes homepage and Bengali brand pages; missing-dimensions sample includes homepage, deals and brand routes. | High-confidence affected routes; exact responsible image elements/components still need DOM inspection. |
| E10 | PerfBee slow-response samples include Bengali product routes; TinyFish recorded 11.36 seconds for one Bengali Dano product and 2.996 seconds for English counterpart in separate single probes. | Directional only: not a statistically reliable TTFB baseline and not query attribution. |

**Primary source links**: [PerfBee fixes](https://dashboard.perfbee.com/#/brokenLinks?tab=fixes&site=87), [PerfBee crawl](https://dashboard.perfbee.com/#/brokenLinks?scan=3d61b6cd-4ec3-467c-bcf3-dd4a9adb6582), [TinyFish run](https://agent.tinyfish.ai/runs/5461881b-7f31-4402-a035-36d593d00b44). Exact source files are linked at each task via their repository paths, always relative to `apps/customer_storefront/` unless specified.

## Global constraints and mandatory release rules

1. **Read-only during investigation.** No code/data/config writes, PR, merge or deployment until a task-specific plan is approved.
2. Confirm actual production **deployment commit**, runtime version, response path and any Cloudflare/Hostinger transform before attributing a discrepancy to `main`.
3. Inspect **raw GET HTML and raw HTTP headers**, not just browser DOM, TinyFish semantic extraction or HTTP HEAD. Repeat representative requests with final URL and any 429/403/5xx recorded; never misclassify rate limits as SEO defects.
4. Use a representative URL matrix: `/`, `/bn`, English/Bengali product, English/Bengali category, English/Bengali brand, `/best/dealoftheweek`, redirect alias, 404, filtered category and a query-string variant.
5. Protect prices, stock availability, translation-review status, localization, shipping promises, checkout, login, payment, robots/sitemap access, analytics consent and structured data accuracy.
6. Check current Supabase egress and query counts before **any** cache, fetching or pre-rendering proposal; do not revive duplicate SSR/client fetches or the previously mitigated polling problem.
7. Do not add unverified claims to product copy or schema; do not label Lucky Store as a third-party product's manufacturer/brand. A missing identifier stays missing.
8. One independently reviewable PR per confirmed root cause; **human final PR review** and existing migration/release safeguards remain mandatory. No unapproved migration or automatic production rollout.
9. Preserve image CDN/optimizer security decisions. Do not turn on Next image optimization to hide dimension issues without a separate remote-redirect review.
10. Do not claim SEO ranking, conversion lift or predicted PerfBee score without measured evidence.

## Review focus — failure modes every implementer must test

- **Stale deployment or CDN variation:** source/production disagreement; record response fingerprint + deployed SHA and confirm fresh responses before code changes (Task 1).
- **Bengali without published translation:** title/canonical/hreflang remain valid, while fallback does not falsely claim translated content (Tasks 2–3).
- **Obsolete slug and filtered URL:** correct 308, correct indexability and canonical for final target, no redirect loop and no filter-based duplicate indexing (Task 3).
- **Unknown stock / changing price:** no stale purchase or availability signal after cache/header work (Tasks 4 and 8).
- **Bot throttling, streaming or partial HTML:** evidence script records 429 and partial/incomplete head separately from actual markup errors (Tasks 1–2).

---

## Phase 0 — Lock the reproducible baseline (must precede all fixes)

### Task 1 — HTTP evidence, deployment provenance and crawler reconciliation (P0 / diagnostics-only)

**Files:** Read `apps/customer_storefront/next.config.js`, `app/RootLayoutDocument.tsx`, `app/(english)/layout.tsx`, `app/(bengali)/layout.tsx`, `middleware.ts`, `seo/technical-monitor-automation.md`, `scripts/seo/technical_monitor.py` (verify present at target ref). **Proposed create on approval:** `apps/customer_storefront/e2e/seo-response-contract.spec.ts` and an evidence manifest under a reviewed audit-doc path, not a production endpoint.

**Interfaces:** Produces versioned `SeoResponseEvidence` for each sampled URL: requested URL, final URL, status, redirect chain, timestamp, `Content-Type`, response headers, raw-HTML hash, detected `head` close offset, canonical/head/body lists, hreflang, JSON-LD presence, word count by extractor, response bytes, TTFB, runtime/deploy identifier if exposed, and tool/transport limitation flags. Keep URLs/headers free of secrets before archiving.

- [ ] Save exact PerfBee URL-to-issue sample (at least 5 per shared template; include `/best/dealoftheweek`). Do not accept the template label as proof of a single root cause.
- [x] Confirm the current production deploy commit and relevant Hostinger/Cloudflare behavior; document **unknown** when evidence is unavailable. Evidence: `/api/health` and Hostinger run `42565359547` bind production to merged PR #608 commit `18fbc3acd32951c55c36bde45406768d56bd794e`; the prior `518725de...` baseline is historical.
- [x] Run an authorized, rate-limited series of `GET` requests with redirects recorded, including a second pass; treat `429` as inconclusive, not an HTML measurement. Evidence: `seo/evidence/2026-11-09/task1-manifest.json` (production GETs and local current-build probe).
- [x] Parse the literal server HTML and separately browser DOM for each representative URL. Compare all SEO tag locations and canonical URL resolutions; inspect any response `Link` header with `rel=canonical` independently of discovery `Link` headers. Evidence: manifest V2 commits `157166ed` + `71e5459d` preserve six raw routes with SHA-bracketed hashes/canonical resolution/full `Link` relation audit and separate six-route browser DOM observations; browser observations are explicitly non-coeval/not independently SHA-bracketed.
- [x] Record exact HTML sizes, response times and sampled request counts without changing monitoring or production configuration. Evidence: `seo/evidence/2026-11-09/task1-manifest.json`.
- [x] Add test fixture cases for (a) canonical under head, (b) canonical in body, (c) two contradictory canonicals, (d) header-vs-tag mismatch, (e) a streamed/partial response, and (f) 429. Verify parser/reporting handles all cases distinctly. Evidence: `apps/customer_storefront/app/lib/__tests__/seo-html-placement-contract.test.ts` (6/6 passing on `codex/perfbee-post-608`, 2026-11-09).

**Acceptance:** A reviewer can reproduce at least one flagged metadata case or identify exact capture limitation; no metadata repair is approved before this gate. Affected URLs and disputed hypotheses have evidence IDs. No files served by the storefront are changed.

## Phase 1 — Indexability and locale metadata

### Task 2 — Head placement and canonical discrepancy: minimal verified repair (P0, conditional)

**Files:** `app/RootLayoutDocument.tsx`, `app/(english)/layout.tsx`, `app/(bengali)/layout.tsx`, `app/(english)/product/[slug]/page.tsx`, `app/(bengali)/bn/product/[slug]/page.tsx`, `app/(english)/best/dealoftheweek/page.tsx`, `app/(bengali)/bn/best/dealoftheweek/page.tsx`; **proposed test:** `e2e/seo-response-contract.spec.ts`; existing `app/lib/__tests__/seo-routing-contract.test.ts`.

**Precondition:** Task 1 proves the mismatch on a complete non-throttled response and identifies the serving layer. **Do not indiscriminately delete root `alternates.canonical`:** Next metadata inheritance may override correctly and the observed browser document had one canonical, not two.

- [x] Write failing integration test asserting `head link[rel=canonical]` count **1**, `body link[rel=canonical]` count **0**, `body title` and SEO body meta count **0**, and no conflicting canonical `Link` header for English/Bengali/deals pages. Evidence: commits `bcb48c28` + `5c5ac0d1`; historical failing-shape fixtures prove detection and the Playwright contract fails closed on transport/browser limitations.
- [ ] Run `cd apps/customer_storefront && pnpm exec playwright test e2e/seo-response-contract.spec.ts` against reviewed staging; confirm it fails for the original symptom, not test setup. The original staging build is retired; ruling: do not fabricate a RED result. Current exact-SHA staging raw checks pass and full sandbox browser execution fails nonzero as a declared launch limitation.
- [x] Apply the smallest change at the proven fault: deployment skew, metadata merge, streaming/head handling, response transform or other traced cause. If removing a layout-level canonical is indicated, audit every route that relies on the default, including `/bn` and error/utility pages, before touching it.
- [x] Re-run the targeted test and existing SEO routing contracts; inspect **raw** staging HTML to ensure Next metadata tags stay in `head`, not moved client-side. Evidence: exact-SHA staging raw matrix 4/4 and routing/placement Vitest 77/77 passed; integrated browser DOM checks confirmed the same three routes, while automated Chromium remains sandbox-blocked and fails closed.

**Acceptance:** Each checked indexable page emits exactly one fully qualified canonical representing its intended locale, with zero conflicting canonical headers and no SEO tags outside head. The reported failing URL and `/best/dealoftheweek` pass. No new uncanonicalized page family or missing metadata.

### Task 3 — Hreflang, sitemap and redirects contract (P1, conditional)

**Files:** `app/lib/products/productMetadata.ts`, `app/(bengali)/bn/product/[slug]/page.tsx`, `app/sitemap.ts`, `middleware.ts`, `app/lib/__tests__/seo-routing-contract.test.ts`. **Potential create only if necessary:** `app/lib/seo/productAlternates.ts` with a single typed utility consuming `canonicalEnUrl: string`, `canonicalBnUrl: string`, and `isBengaliIndexable: boolean`; return exact `languages` mapping. Avoid naive string replacement on arbitrary URLs.

- [x] Compare reciprocal alternates from raw English/Bengali pages, sitemap, redirects and published Bengali translation eligibility for the same product IDs. Evidence: Task 3 report records the EN/BN Aarong pair, sitemap inclusion, reciprocal alternates, Radhuni locale-preserving 308s and the filtered-category canonical.
- [x] Add failing tests for valid English/Bengali pairs; untranslated or unpublished Bengali variants; stale slug 308; noindex/404; query/filtered URL; absent cross-locale partner. Explicitly test `en-BD`, `bn-BD`, `x-default` and no dead alternate URLs. Evidence: Task 3 report records RED/GREEN and mutation tests across the publication and redirect contracts.
- [x] Only if evidence proves divergent builders, centralize alternate construction once for both output paths; preserve route existence and locale-specific canonical semantics. Evidence: commit `def17ec5` added and reused the explicit product-alternate builder.
- [x] Re-run the targeted routing/metadata Vitest contracts on verification commit `58e2ccaffb9a123e12f857520637411c0a155fa0`; the route, HTML-placement and product-metadata files passed 121/121 tests, including unpublished/missing-table noindex fallback, genuine query-error propagation, canonical and reciprocal hreflang checks.
- [ ] Run reviewed staging HTTP tests against the latest PR head. No staging request evidence was gathered for `58e2ccaffb9a123e12f857520637411c0a155fa0` in this verification pass.

**Acceptance:** Hreflang targets return valid canonical 200 URLs, are reciprocal where appropriate, are represented consistently in the sitemap, and do not point to redirect aliases or nonexistent localized pages. No blanket '42 pages fixed' claim without a verified underlying list.

## Phase 2 — Low-risk shared security and accessibility

### Task 4 — Effective security headers (P1, independent PR after evidence)

**Files:** `apps/customer_storefront/next.config.js`; inspect Hostinger/Cloudflare response configuration and `cloudflare/workers/agent/src/headers.ts` only to avoid confusing an unrelated service's headers with storefront headers.

- [x] Capture **actual GET response** security headers on representative HTML and non-HTML endpoints at production and staging; check for contradictory headers upstream. Evidence: 2026-11-09 production/staging checks recorded in the SDD ledger found the expected headers and no duplicate/contradictory values on sampled routes.
- [ ] Add failing HTTP integration contract for `X-Frame-Options: SAMEORIGIN` **or** an explicitly reviewed `frame-ancestors` policy, and `Referrer-Policy: strict-origin-when-cross-origin` on storefront HTML.
- [x] Add the policy in the one effective deployment layer. Add `X-Content-Type-Options: nosniff` if missing, as a separate verified hardening check; keep CSP interactions intact. Evidence: PR #608 configures the storefront headers; sampled production and staging GET responses reported the effective policies.
- [ ] Verify frame behavior and required checkout/payment/auth redirects, external identity flows, media and embed requirements.

**Acceptance:** The effective production GET response—not only a test config—has approved headers; no duplicate/contradictory policies and no affected commerce integrations. Record PerfBee follow-up separately.

### Task 5 — Image accessibility and intrinsic sizing (P1, independent PRs if different owners)

**Files:** `app/components/CategoryHero.tsx`, `app/components/BrandShell.tsx`, `app/components/CatalogLayout.tsx` (inspect image children), `app/components/GridProductCard.tsx` (inspect), `app/components/updated/Header.tsx` (inspect), related image components referenced by the DOM.

- [x] Extract **exact missing-alt and missing-dimension image elements**, URLs, DOM path, component provenance and whether they are decorative or informative. The user-supplied draft's claim that `BrandShell` has no alt is false for its brand logo; `CategoryHero` intentionally uses `alt=""` for decorative images. Evidence: Task 5 audit traced 264 captured images to shared owners; zero lacked `alt`, four empty-alt images were decorative, and all 236 dimensionless images were reserved Next `fill` images.
- [ ] Add failing accessibility assertions: all informative images have specific alt; decorative images have empty alt and appropriate hidden semantics; no redundant product-name stuffing.
- [ ] Add layout assertions for absent intrinsic dimensions or equivalent reserved aspect ratio; for `fill` images, test sized containers and stable layout instead of assuming optimizer-disabled images lack dimensions.
- [ ] Make the smallest changes at actual image owners, preserving CDN responsive `srcset`, `picture`, `sizes`, and image optimizer security choices.
- [x] Run targeted Playwright image/CLS checks and visual screenshots at 320, 390, 768 and desktop widths; confirm product cards remain clickable and images have valid sources. Evidence: local browser checks at 320/390/768/1440 produced CLS 0, no horizontal overflow, zero missing `alt`/source attributes, visible clickable product links, and workspace screenshots; the 390 product route also showed CLS 0 and valid canonical/hreflang.

**Acceptance:** No informative image in the tested shared templates lacks meaningful alt; zero unreserved image-induced layout shift in sampled mobile views. Do not set fake `width=1200,height=192` on an asset with a different intrinsic ratio unless object-fit/container behavior is explicitly tested.

## Phase 3 — Metadata quality with page-specific evidence

### Task 6 — Titles, descriptions and duplicate pair remediation (P2)

**Files:** `app/lib/products/productMetadata.ts`, `app/(bengali)/bn/product/[slug]/page.tsx`, `app/(english)/brand/[slug]/page.tsx`, `app/(bengali)/bn/category/[slug]/page.tsx`, `app/lib/brandsData.ts`, existing metadata tests; **proposed create:** `app/lib/products/productMetadata.test.ts` if not already present.

**Observed families:** Long titles include English brand pages (Bashundhara, Dettol, Dove, PRAN); short titles include Bengali category and product pages; duplicate title URLs are `dove-shampoo-intensive-repair-330-ml--6e4bb7c3` and `dove-shampoo-intensive-repair-330ml--0cb22302`. Long descriptions include `/about`, deals and Bengali product prose. These are **not all fixed by changing the English `formatProductMetaTitle` 68-character branch**.

- [ ] Export every affected URL's title/description and underlying product or brand identity; classify collisions, genuine truncation, translation, and acceptable short brand names.
- [x] Test precise formatters using representative English/Bengali strings and Unicode-safe boundaries. Preserve product name/pack size and accurate price; avoid mechanical 48-character Bengali limits or truncating words mid-grapheme. Evidence: commit `ee001aeb` adds grapheme-safe title truncation regressions and implementation; 53/53 focused metadata tests, typecheck and scoped lint passed.
- [x] For short Bengali product titles, modify the **title generation path**, not `formatBengaliProductMetaDescription`. Confirm how absolute titles bypass root title templates.
- [ ] For long brand titles, revise `brand.titleEn` values where distinctive wording can be preserved. For duplicated product titles, establish whether the two product IDs are actual distinct SKUs; fix catalog identity or title presentation accordingly. Never canonicalize one legitimate SKU to another solely because titles match.
- [ ] Test meta description fallback separately from published Bengali descriptions; if longer than crawler threshold, edit for factual clarity without blindly truncating translated content or promises.
- [ ] Recheck exact flagged URL pairs with PerfBee and compare real titles/descriptions.

**Acceptance:** The targeted URL set has accurate, distinct, human-readable titles/descriptions; any remaining crawler-only threshold warnings are documented with a deliberate rationale. No fabricated prices, pack sizes, availability or language support. No promises about pixel widths or score lift.

### Task 7 — Duplicate H1 / descriptions and optional heading hygiene (P2)

**Files:** `app/(english)/page.tsx`, `app/(bengali)/bn/page.tsx`, category/brand/product page shells and components as indicated by actual offending URL list; `app/components/CategoryHero.tsx` already renders a semantic H1.

- [ ] Retrieve exact two-page pairs for `duplicate_h1` (fix 2319) and `duplicate_meta_description` (fix 2320). Do not treat duplicate headings across legitimate translated or related pages as automatically harmful.
- [ ] Add pair-wise assertions for unique intent and valid H1 per route. Inspect visible content and product identity before changing it.
- [ ] Correct only demonstrably accidental duplicates; run screenshots, heading structure and existing homepage tests.

**Acceptance:** Every confirmed duplicated metadata/H1 pair is disambiguated or explicitly accepted with reasoning and canonical correctness. Claimed `heading_level_skipped` remains out-of-scope unless reproduced independently.

## Phase 4 — Performance, data freshness and content quality

### Task 8 — Profile slow requests without changing cache policy (P1 discovery; any optimization is a separate PR)

**Files:** `app/lib/products/getCachedProduct.ts`, `app/(bengali)/bn/product/[slug]/page.tsx`, `app/lib/products/bengaliOverlay.ts`, `app/lib/products/getCachedCategories.ts`, `app/lib/products/getHomePageData.ts`, `app/(english)/brand/[slug]/page.tsx`, `app/(english)/category/[slug]/page.tsx`, `app/(bengali)/bn/category/[slug]/page.tsx`, Supabase service and existing recent egress remediation docs.

- [ ] Benchmark the 14 PerfBee slow URLs against 14 control pages: repeat cold/warm runs; record TTFB, total request time, bytes, cache status, locale, errors and sampled database RPC counts. Avoid broad unbounded telemetry or log scans.
- [ ] Trace duplicate product lookups, `item_translations`, cross-sell and brand multi-search calls; separate database latency, rendering, edge/CDN and client navigation costs.
- [ ] Specify freshness per data type: identity/description can use longer controlled freshness, but price, stock, checkout and availability require reviewed authoritative reads or explicit revalidation. Honor `availabilityUnknown` semantics.
- [ ] Add a performance test that measures call counts and response data freshness, and a test that sees an inventory/price change within the *approved* freshness SLA. Define SLA in review; do **not** assume `revalidate=300` is safe.
- [ ] Only then propose narrow cache, batching, pagination or query-shape changes. React `cache()` already provides per-request deduplication; do not wrap it blindly with `unstable_cache` or add 200 build-time product fetches.

**Acceptance:** Attribution is reproducible and the chosen fix yields measured latency improvement versus matched controls, zero failed commerce flows, **no unexpected increase in Supabase egress**, and no stale sellable stock/price beyond approved SLA. Claims about PerfBee's 14 pages fixed require a new measured run.

### Task 9 — Reduce oversized HTML while retaining crawler-visible data (P2 discovery; conditional optimization PR)

**Files:** `app/components/BrandShell.tsx`, `app/(english)/product/[slug]/ProductClient.tsx`, `app/components/seo/ProductJsonLd.tsx`, `app/components/seo/JsonLd.tsx`, shared headers/navigation, homepage/brand/deals templates.

- [ ] Download complete raw HTML from five `large_html` URLs and matched controls; attribute bytes to HTML text, React Flight/RSC payload, duplicated serialization, JSON-LD, inline SVG, scripts and other sections. Determine compression-aware transfer size and parse cost independently.
- [x] Identify redundant large blobs first; verify content is truly duplicated and not necessary to hydrate core interactions. Evidence: commit `8b002b5f` and Task 9 attribution show `experimental.inlineCss` duplicated the same 115,323-byte shared stylesheet in SSR HTML and Flight; component/data payloads were retained.
- [x] Add HTML budget and semantic-content contract tests before any change. Keep Product JSON-LD and essential product copy server-visible; do **not** defer JSON-LD with `afterInteractive` or put relevant text only behind a client-side API by default. Evidence: commit `1e6d3e38`; `npm run test:html-contract` passes built home/product byte budgets, hashed/loadable CSS, integrated canonical/hreflang/head placement, Product JSON-LD, body content, hydration assets and accessibility markers.
- [ ] Implement one bounded optimization at the verified contributor and compare bytes, TTFB, LCP/CLS and accessibility.

**Acceptance:** Significant measured HTML reduction for target route class without regression in raw-HTML product details, JSON-LD, mobile navigation, hydration, SEO metadata or Supabase egress. Any 500-KB threshold exception is documented, not masked.

### Task 10 — Genuine content enrichment (P3; do not SEO-stuff)

**Files:** `app/(english)/product/[slug]/ProductClient.tsx`, `app/components/CategoryHero.tsx`, `app/components/BrandShell.tsx`, `app/lib/brandsData.ts`, catalog enrichment and translation sources.

- [ ] Sample thin-content pages by **intent** (homepage, about, products, brands, categories, deals), and measure helpful *main-content* word counts in raw HTML; distinguish navigation/footer repetition from unique content.
- [ ] Verify existing product overview and specifications are present—TinyFish already retrieved them for a Dano example. Do not claim they are absent across the site.
- [ ] For pages actually lacking useful information, write factual product attributes, pack sizes, uses, brand/category differentiation, buying guidance or delivery constraints backed by catalog/approved policy. Allow concise product pages where 300 words are unnecessary.
- [ ] Where Bengali content is unpublished, preserve translation state and avoid invented Bengali copy. Add no health or performance claims unless substantiated.
- [ ] Test product detail display, language parity and indexable raw HTML with content snapshot assertions; verify no claims exceed published service radius or price guarantees.

**Acceptance:** Targeted pages genuinely help buyers make choices; content is accurate and accessible without JavaScript. Fewer 'thin' warnings is useful but **not** the sole acceptance criterion. No claim of automatic PerfBee score increase.

## Phase 5 — Crawl, regression review, and release (P1 gate)

### Task 11 — SEO monitor and smoke-test integration

**Files:** `scripts/seo/technical_monitor.py` (verify existence and interface at execution ref), existing monitor tests, `seo/runbook.md`, `.github/workflows/seo-codex-autopilot.yml` (only if directly relevant), proposed `e2e/seo-response-contract.spec.ts`.

- [x] Add bounded canonical/head/hreflang/header tests for target route classes; ensure bot 429 and tool errors become *verification limitations* rather than 'site passed' or 'site broken'. Evidence: commits `9668aef0` + `55162f9b`; 50/50 monitor tests pass.
- [x] Save raw-header/body evidence and sampled URL list as artifacts with known retention and storage-budget controls; do not reactivate unbounded logs or break existing artifact upload gates. Evidence: 12 MB inclusive cap, sensitive-header redaction, 14-day compressed artifact, and fail-closed upload/incident gating in commits `9668aef0` + `55162f9b`.
- [x] Assert a successful `200` raw HTML response has expected title, canonical, consistent locale, suitable visible content, and correct robots directives; check bilingual redirects and sitemap eligibility. Evidence: monitored response contract covers HTML and `X-Robots-Tag`, redirect locale, sitemap redirects/noindex/canonical mismatch, malformed inputs and bounded public sampling.
- [ ] Run focused Vitest tests, Playwright cases, typecheck, lint, build and existing SEO monitor tests before proposing a release. Record exact commands, commit SHA, timestamps and failing/untested checks.

**PR #609 follow-up (2026-11-10):** verification commit `58e2ccaffb9a123e12f857520637411c0a155fa0` adds regression coverage for Bengali translation errors/missing-table fallback and completed React stream segments. Fresh checks on this commit: targeted Vitest 121/121, `python3 -m unittest test_technical_monitor.py -v` 55/55, storefront TypeScript typecheck passed, scoped ESLint passed. The focused parser test confirms completed `S:` text counts once, while incomplete and genuinely hidden text do not count. Both CodeRabbit threads were replied to with this evidence and resolved. The prior commit `f502daf12cb44b71e8a2377c2d0a839dd4753cf6` had three passing Actions runs and two passing Vercel statuses; CI/Vercel checks for `58e2ccaffb9a123e12f857520637411c0a155fa0` were pending at the time of this note. No production build or local browser run was done; no production, staging, database, or deployment change was made.

**Acceptance:** The evidence is reviewable, reproducible and correctly distinguishes unsupported/unobserved conditions. All relevant checks pass in the *reviewed* environment with output attached. No CI security or artifact-integrity bypass.

### Task 12 — Controlled deployment, measurement and human sign-off

**Files:** No prescribed product changes; release/test documentation only. **Execution requires separate approval.**

- [ ] Obtain final PR-level review, including affected files, test evidence, diff, no unapproved DB migrations, and any existing production migration/release parity gates.
- [ ] Verify staging HTML, response headers, route/locale matrix, mobile screenshots, price/stock checkout flow, Supabase egress and Cloudflare/Hostinger layer behavior.
- [ ] Explicitly authorize deployment; only then run current approved release workflow. Retain rollback procedure and previous deployment identifier.
- [ ] Collect comparable post-release samples and a PerfBee crawl **beyond 250 pages when credits and scope allow**; retain original 250-page population for apples-to-apples comparison.
- [ ] Publish a before/after table: each of 16 issue categories, affected page counts on matched URL cohorts, checks executed, remaining caveats, HTML/latency changes, stock freshness and egress. Do not claim ranking or score lift without measured results.

**Acceptance:** Verified fixes resolved on intended deployed SHA; no new canonical, hreflang, metadata, commerce or database performance regressions; rollback tested/documented; owner signs off. Otherwise stop rollout and preserve evidence.

## Dependency order and PR boundaries

```
Task 1 evidence & provenance
    |
    +--> Task 2 head/canonical [ONLY if reproduced] --> Task 3 hreflang/sitemap
    |
    +--> Task 4 headers [independent, once serving layer known]
    +--> Task 5 image alt/sizing [component samples first]
    +--> Task 6 metadata titles/descriptions --> Task 7 duplicate pairs
    +--> Task 8 latency investigation --> conditional cache/query PR
    +--> Task 9 HTML attribution --> conditional payload PR
    +--> Task 10 useful content [after semantic verification]
                    |
               Task 11 regression & monitoring
                    |
               Task 12 human release gate
```

**Suggested standalone PRs:** canonical/head (if confirmed); hreflang (if confirmed); security headers; image alt; image dimensions; metadata copy by affected route type; duplicate metadata pairs; separately justified latency work; separately justified HTML payload work; useful content by page family; monitoring. Never bundle cache policy, page copy and canonical logic into one PR.

**Priority semantics:** P0 = evidence/indexability blocking investigation; P1 = bounded security/performance/accessibility issues and release gates; P2 = copy hygiene / measured HTML; P3 = page-specific content enrichment. This priority is **business risk**, not PerfBee's default rank or its estimated score contribution.

## Baseline issue tracking — all 16 actual PerfBee categories

| PerfBee fix ID | Finding | Pages | Owner task | Target disposition |
|---:|---|---:|---|---|
| 2331 | Thin content | 250 | 10 | Assess intent; add useful text where justified; exceptions allowed |
| 2318 | Canonical conflict | 143 | 1–2 | Reproduce, root-cause and correct, or document crawler limitation |
| 2322 | Missing alt | 73 | 5 | Fix verified informative-image gaps |
| 2327 | Missing frame protection | 250 | 4 | Effective server header verified |
| 2328 | Missing referrer policy | 250 | 4 | Effective server header verified |
| 2323 | Missing image dimensions | 243 | 5 | Correct actual image/layout sources |
| 2329 | SEO tags outside head | 143 | 1–2 | Prove raw vs DOM placement then correct |
| 2332 | Long titles | 28 | 6 | Review actual brand/product titles |
| 2333 | Short titles | 20 | 6 | Review actual Bengali category/product titles |
| 2330 | Slow response | 14 | 8 | Repeated latency and query attribution; conditional fix |
| 2324 | Large HTML | 89 | 9 | Byte attribution; conditional fix |
| 2325 | Long meta descriptions | 43 | 6 | Target pages, accurate concise copy |
| 2321 | Duplicate titles | 2 | 6 | Resolve Dove variant identity/titles |
| 2326 | Short meta descriptions | 5 | 6 | Expand only when useful/accurate |
| 2319 | Duplicate H1 | 2 | 7 | Verify pair and intent |
| 2320 | Duplicate meta descriptions | 2 | 7 | Verify pair and intent |

## Proposed verification commands (for future authorized implementation; **not executed now**)

```bash
cd apps/customer_storefront
pnpm exec vitest run app/lib/__tests__/seo-routing-contract.test.ts
pnpm exec playwright test e2e/seo-response-contract.spec.ts
pnpm run typecheck
pnpm run lint
pnpm run build

# From an authorized machine with production networking; GET is essential:
curl -sS -L --compressed -D headers.txt -o page.html \
  'https://www.luckystore1947.com/bn/product/aarong-standardized-milk-500-ml--3d7c76cf'
# Record status, chain, headers, and literal HTML; do not use curl -I alone.
```

For test-first implementation, each PR must show (1) an original failing regression test, (2) reviewed minimal change, (3) passing targeted test, (4) passing applicable suite/build/HTTP tests, (5) before/after production cohort evidence following deployment authorization. No unverified success statements.

## Final decision gate

**Plan status (2026-11-10): PR #609 is open at `58e2ccaffb9a123e12f857520637411c0a155fa0`; the two CodeRabbit findings have verified fixes, added regression coverage, replies and resolved threads.** The verified source/test commit is `58e2ccaffb9a123e12f857520637411c0a155fa0`. Keep Tasks 1–12 release acceptance distinct from source completion; staging HTTP validation, production deployment, post-deployment PerfBee recrawl, and human release sign-off remain unchecked. No merge or deployment is authorized by this status update. Never trust an automatic 95+ score projection, an invented schema gap, or a generic fix applied to 250 pages without diagnosis.
