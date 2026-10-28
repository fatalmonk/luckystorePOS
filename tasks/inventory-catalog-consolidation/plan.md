# Inventory, Catalog, and Product Image Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish one documented and versioned catalog workflow that keeps product records, per-store stock, image bytes, and import batches in their proper authoritative systems while removing duplicate and unsafe paths gradually.

**Architecture:** Supabase `public.items` remains the product master and `stock_levels` remains store-scoped stock; Cloudflare R2 remains the image-byte store. A repository-owned `data/catalog/` control plane holds schemas, templates, provenance manifests, staged batches, validation results, and runbooks, not a second copy of live inventory. Existing CSV formats become input adapters to one validated, tenant-scoped import path; new image publications use the existing Worker ticket and database compare-and-swap (CAS) flow, while old URLs and object keys continue to work.

**Tech Stack:** Supabase Postgres and Edge Functions, existing Cloudflare Images Worker/R2, TypeScript/React admin, Python catalog reconciliation scripts, CSV/JSON Schema, repository tests.

**Spec:** User request plus `INVENTORY-SHEET-RECONCILIATION-DESIGN.md`, `INVENTORY-SHEET-RECONCILIATION-PLAN.md`, and the current contracts listed below. No separate end-to-end consolidation spec exists.

## Global Constraints

- Keep `public.items` as the live product master; do not recreate `public.products` or `public.inventory_items`.
- Keep per-store quantity in `public.stock_levels`; distinguish product changes from stock-setting or stock-adjustment operations.
- Treat SKUs as tenant-scoped identifiers. Preserve existing values; do not enforce a universal SKU pattern or silently generate random SKUs.
- Match records deterministically by item ID or unique exact SKU/barcode only. Duplicate or ambiguous matches require human resolution; names and model guesses never authorize joins or writes.
- Resolve tenant and store scope from the authenticated session and verify it server-side. Never trust a CSV `store_code` or `tenant_id` as authorization.
- A dry run must make no Supabase database, Supabase Storage, R2, or other remote write.
- Keep R2 credentials server-side. New user-facing image uploads use scoped Worker tickets and publish through `publish_item_image_if_current`.
- Never rename or delete existing image object keys during consolidation. Preserve old URLs and key layouts because the image Worker serves them with long-lived immutable caching.
- Keep all locally managed product packshots in one flat, Git-ignored directory: `data/catalog/images/`. Product-image binaries must not be tracked or added to any GitHub branch; use the approved R2 image service for runtime delivery.
- Deduplicate by exact SHA-256 first. Treat perceptual/near-duplicate matches as review candidates, not automatic deletion. Remove an orphan only after exact item, code, campaign, and R2-reference checks.
- Preserve both current import formats with explicit adapters until their callers are migrated and measured; do not change their visible headers as the first step.
- Do not perform live catalog, stock, or R2 writes as part of this plan. Require a separately reviewed target environment, tenant/store scope, exact mapping, and explicit execution authorization for each live batch.
- Keep secrets, live exports, and binary assets out of Git. Store only approved non-sensitive manifests and checksums; use ignored staging for raw files.
- Unity Catalog is not the operational source of truth. Consider a governed analytics mirror only as a separate, read-only decision after the operational workflow is stable.

## Review Focus

- A duplicate SKU or barcode within one tenant must fail preview as ambiguous, while the same code in another tenant remains valid.
- Product-only imports must not alter stock; stock imports must state whether quantity is absolute or a delta and must bind to a verified store.
- Dry runs with image attachments must produce the same remote state before and after execution.
- Image upload success followed by a stale database image version must not replace the current image; the rejected object must be reported for safe cleanup without deleting any referenced object.
- Existing images from R2 legacy prefixes, Supabase Storage, and external HTTPS URLs must remain readable throughout rollout; only positively mapped items may be migrated.

---

## Current-State Evidence

- The repository has already declared `public.items` the canonical catalog and decommissioned the legacy `public.products` and `public.inventory_items` tables (`supabase/migrations/20261007220000_decommission_legacy_products_and_inventory_items.sql`).
- SKU and barcode uniqueness is tenant-scoped (`supabase/migrations/20260921183345_tenant_scoped_item_identifiers.sql`). Image URL, object key, checksum, and version are tracked on `items` with a server-side CAS publication function (`supabase/migrations/20261003010000_add_product_image_metadata.sql`).
- The admin CSV flow uses friendly headings and directly inserts into `items` (`apps/admin_web/src/features/import/ImportProductsPage.tsx`). The Edge Function accepts a wider operational CSV/JSON shape and handles item matching and stock (`supabase/functions/import-inventory/index.ts`). These are two write paths.
- The Edge Function currently uploads image attachments into Supabase Storage `item-images`; its attachment upload happens before the `isDryRun` write guard. A dry run can therefore change remote storage and must not be used as a safe gate until fixed.
- Admin image uploads instead use tenant-scoped upload tickets through the image Worker, immutable keys such as `products/{tenantId}/{SKU}-{UUID}.webp`, and `publish-product-image`/CAS (`apps/admin_web/src/lib/images.ts`, `apps/admin_web/src/lib/r2.ts`, `supabase/functions/issue-image-upload-ticket/index.ts`, `supabase/functions/publish-product-image/index.ts`).
- Image tooling is split among `scripts/images/`, `scripts/ops/`, `catalog-images/`, `data/inventory/`, and `templates/`. Legacy examples include root `products/{SKU}.webp` paths, brand subdirectories, an image migrator that only recognizes `product-images/`, and a DB updater targeting decommissioned `public.products`.
- A live GitHub audit of all 11 current branch tips found 134 image files per tree, mostly application/brand artwork, and one product packshot path on every tip: `social-media/catalogue-images/DE-AMA-GEN-0.75.png` (927,217 bytes; blob SHA `ae2c4663d6d71ede9c2f587459a23c08c84c4c66`). The image is an AMA coffee packshot; exact-path search found no checked-out source reference. This is a current-tree audit, not a history purge.
- A local reachable-ref walk found 1,127 distinct image pathnames, including retired Polar and other product packshots. These historical objects are not all present in current trees. Removing them from history would require coordinated history rewriting and force-pushing affected branches; the plan does not do that silently.
- `scripts/catalog/reconcile_inventory_snapshots.py` and its design already define a useful read-only rule: match by unique item ID or exact unique SKU, report ambiguity, and keep semantic suggestions review-only.
- The current template and inventory batches do not all share the same field set or naming convention. The incoming 38-product beverage batch is a candidate pilot, but its SKU-to-image mapping and final environment must still be checked immediately before any live execution.
- `tasks/plan.md` and `tasks/todo.md` are already used by an unrelated admin-layout task; leave them untouched. This plan and its checklist live in dedicated paths.

### Independent Sol Review

- Sol confirmed that the Edge import uploads image attachments to Supabase Storage before its dry-run guard, while admin uploads already use R2 tickets and database CAS. The unified preview must be proven free of remote writes before it is used as a gate.
- Sol confirmed tenant-scoped SKU/barcode uniqueness and the `items.image_key`/checksum/version metadata. Preserve those controls and do not impose a new global SKU format.
- Sol identified a legacy R2 migrator that does not recognize the Edge import’s `item-images` objects and a database URL updater targeting the retired `public.products` table. Treat both as migration hazards, not canonical paths.
- Sol found no evidence that Unity Catalog owns operational catalog data; the Databricks client is read-only analytics/discovery. Keep Unity Catalog outside the operational cutover.

### Current GitHub Image Cleanup Status

- The AMA coffee packshot was copied byte-for-byte to ignored local storage at `data/catalog/images/DE-AMA-GEN-0.75.png` (927,217 bytes; SHA-256 `8c45d1250a5df3ee445563ce42d338086d4f78e0ee43a37b047384dca3a823da`). Its tracked source copy was removed locally.
- PR #562 was merged to `main` as `0f5e5f72fb6bc7ce508e7cd153b977913e81e207`. A live tree audit then confirmed the packshot path absent from all 12 GitHub branch tips and the folder ignore rule present on each tip. The same small deletion/ignore commit was applied to existing branches, including the open checkout-related PR branch.
- This removes the image from current branch trees, not from old Git commits. A local reachable-ref audit still finds 1,127 image pathnames in historical trees. No history rewrite or force push was done; purging old blobs would require a separate impact review.
- The complete local `catalog-images/`, `social-media/catalogue-images/`, other source folders, and R2 objects still need the manifest-driven centralization, duplicate/orphan review, and live-reference checks in Task 6.

## Decisions and Target Layout

- Canonical repository control plane:

  ```text
  data/catalog/
    README.md
    contracts/catalog-import-v1.schema.json
    templates/catalog-import-v1.csv
    images/                      # one flat, Git-ignored local product-image library
    batches/<batch-id>/
      source.csv                 # optional, approved non-sensitive source snapshot
      normalized.csv             # canonical import rows
      image-map.csv              # exact item/SKU-to-image mapping and source URL
      checksums.sha256           # staged asset integrity
      preview.json               # dry-run result and reviewed decisions
      apply-report.json          # written only after an authorized execution
  ```

- Live product facts are not copied into a permanent checked-in “master inventory” CSV. A live export is a timestamped audit snapshot, not another authority. Store values, cost, and price changes remain subject to existing privileged write and audit controls.
- Version 1 separates `product` fields (tenant-scoped SKU, optional barcode, name, brand, category, cost/price/MRP, active state, image reference) from `stock` intent (none, absolute set, or delta; store resolved from authenticated scope). Each batch records its contract version and source provenance.
- Preserve the two current column sets as adapters: the admin template’s `Product Name`/`Sales Price (৳)`/`Purchase Price (৳)`/`Item Code (SKU)` format and the operational `name,barcode,sku,...,stock_qty,store_code,image_url` format. Adapters normalize to the versioned contract; the server validates and writes.
- All local source, generated, approved, and unresolved product-image candidates are collected under the single flat `data/catalog/images/` root and indexed by a manifest; staging/role distinctions live in manifest fields, not in duplicate folder trees. The directory is ignored by Git and has a tracked policy file that makes accidental image adds fail CI.
- New image bytes are checksummed, converted/validated, and uploaded through the existing authorized image Worker. Once an item ID and store are resolved, publish the URL/key/checksum through the current CAS gate. Use the current tenant-scoped immutable key format for new objects only; keep all legacy key layouts readable.
- The central catalog directory is a control plane for batch inputs and provenance, not a replacement for Supabase or R2. Historical folders are indexed first and moved only when callers are found and compatibility paths are proven.

## Dependency Graph

```text
Task 1: discover and classify sources
   ├──> Task 2: central catalog contracts and batch layout
   ├──> Task 3: safe preview and one validated import write path
   └──> Task 4: one image ingest and publication path
                Tasks 2–4 ──> Task 5: map legacy data and image references
                Task 5 ────> Task 6: central image library, dedupe, and Git cleanup
                Task 6 ────> Task 7: canary rollout and retire duplicate paths
```

## Implementation Tasks

### Task 1: Build a Read-Only Catalog and Asset Inventory

**Files:**
- Modify: `scripts/catalog/reconcile_inventory_snapshots.py`
- Modify: `scripts/catalog/test_reconcile_inventory_snapshots.py`
- Modify: `scripts/catalog/README.md`
- Create: `data/catalog/README.md`
- Create: `data/catalog/source-inventory.schema.json`
- Create: `data/catalog/source-inventory.json` (metadata and hashes only)

**Interfaces:**
- Consumes: approved local inventory exports, repository file paths, configured R2 listing access when explicitly available; no remote mutations.
- Produces: deterministic source inventory entries with source path, source kind, owner/authority, format, item key when known, object key/URL when known, file size/hash, current callers, status (`canonical`, `adapter`, `legacy`, `unresolved`), and migration notes.

- [x] **Step 1: Add synthetic reconciliation tests** for unique exact SKU, duplicate SKU ambiguity, tenant-scoped duplicates, an old image prefix, an external URL, and a missing file; verify no network calls or writes.
- [x] **Step 2: Run the focused tests**

  Run: `PYTHONPATH=. python3 scripts/catalog/test_reconcile_inventory_snapshots.py`

  Expected: the new tests fail until the manifest behavior is implemented; all existing tests continue to pass.

- [x] **Step 3: Extend deterministic inventory reporting** to classify the known inventory, templates, image directories, importer implementations, upload scripts, schema migrations, and image URL consumers. Reuse exact-ID/exact-SKU matching; do not infer a match from product name or image similarity.
- [x] **Step 4: Generate and inspect a metadata-only manifest** for `data/inventory/`, `catalog-images/`, `templates/`, `scripts/catalog/`, `scripts/images/`, `scripts/ops/`, `apps/admin_web/src/features/import/`, relevant Supabase functions/migrations, and the image Worker. Record unresolved and duplicate mappings explicitly.
- [x] **Step 5: Verify determinism and read-only behavior** by generating the manifest twice and comparing outputs and repository status.

  Run: `PYTHONPATH=. python3 scripts/catalog/reconcile_inventory_snapshots.py --help`

  Expected: documented command arguments; manifest hashes and order are stable; no database or storage writes.

**Acceptance criteria:** Every known source and caller is classified; each canonical owner is named; ambiguous records remain unresolved; repeat runs produce the same report; no product, stock, URL, bucket, or object changes.

### Task 2: Establish the Central Contract and Batch Workspace

**Files:**
- Create: `data/catalog/contracts/catalog-import-v1.schema.json`
- Create: `data/catalog/templates/catalog-import-v1.csv`
- Create: `scripts/catalog/test_catalog_import_contract.py`
- Modify: `data/catalog/README.md`
- Create: `data/catalog/.gitignore` or the repository ignore rules for `data/catalog/staging/`
- Modify: `scripts/catalog/README.md`

**Interfaces:**
- Consumes: Task 1 source inventory and existing inventory reconciliation design.
- Produces: `CatalogImportBatchV1 = { contract_version: 1, batch_id: string, source: string, requested_store_id?: string, rows: Array<{ source_row: number, product: { sku: string, barcode?: string | null, name: string, brand?: string | null, category?: string | null, cost?: number | null, price?: number | null, mrp?: number | null, is_active?: boolean }, stock: { mode: 'none' | 'set' | 'delta', quantity?: number }, image?: { kind: 'url', url: string } | { kind: 'asset', path: string, sha256: string } }> }`. `requested_store_id` is a user selection only; the server must verify it belongs to the authenticated user/tenant. `product` carries master values; `stock` is an explicit `none | set | delta`; image assets include a checksum and provenance.

- [x] **Step 1: Add schema fixtures/tests** covering valid product-only rows, stock set/delta rows, missing SKU, duplicate tenant SKU/barcode, invalid price/cost, unsafe/malformed image reference, and unsupported schema version.
- [x] **Step 2: Run schema/contract tests**

  Run: `python3 -m unittest scripts.catalog.test_catalog_import_contract`

  Expected: tests fail before the contract validator exists; no remote dependencies.

- [x] **Step 3: Define the canonical v1 fields and validation rules** in JSON Schema. Keep `tenant_id` and `store_id` out of untrusted row authorization; distinguish blank/unknown from zero; preserve source value and row provenance; never normalize away a meaningful SKU character.
- [x] **Step 4: Add adapters and examples** for both current CSV contracts. Preserve their existing headers and show the exact normalized result; ensure legacy rows without stock intent normalize to `none`, never an implicit stock write.
- [x] **Step 5: Document `data/catalog/batches/<batch-id>/` lifecycle**: source capture, normalization, exact-match review, image map/checksum, preview, approved apply report. Ignore raw staging bytes and secrets; commit only sanitized templates, schemas, and metadata.
- [x] **Step 6: Run contract and existing reconciliation tests**

  Run: `python3 -m unittest scripts.catalog.test_catalog_import_contract && PYTHONPATH=. python3 scripts/catalog/test_reconcile_inventory_snapshots.py`

  Expected: both suites pass; examples validate; no live changes.

**Acceptance criteria:** One versioned contract defines product, stock, and image semantics. Both old file formats map losslessly or report unsupported fields. Ambiguous identifiers fail closed. No live inventory export or binary source image is committed.

### Task 3: Make Preview Side-Effect-Free and Route Imports Through One Validated Path

**Files:**
- Modify: `supabase/functions/import-inventory/index.ts`
- Modify: `apps/admin_web/src/features/import/ImportProductsPage.tsx`
- Modify: `apps/admin_web/src/components/ImportWizard.tsx` only if required by the adapter
- Create: `supabase/functions/import-inventory/index_test.ts`
- Create: `apps/admin_web/src/features/import/ImportProductsPage.test.tsx`
- Modify: `data/catalog/README.md`

**Interfaces:**
- Consumes: Task 2 v1 normalized batch and the current caller’s authenticated Supabase session.
- Produces: a request `{ operation: 'preview' | 'apply', batch: CatalogImportBatchV1, idempotency_key?: string, approved_preview_hash?: string }` and a response `{ batch_id, preview_hash, counts: { create, update, unchanged, ambiguous, invalid }, rows: Array<{ source_row, item_id?: string, outcome, field_diffs, warnings, errors }> }`. `preview_hash` binds apply to the previewed normalized data; apply also re-resolves and checks current item/image versions before writing.

- [x] **Step 1: Add regression tests using fake database/storage clients** proving dry-run attachment imports do not call Supabase Storage, R2, or database mutation APIs; include malformed data, duplicate SKU, wrong tenant/store, and retry cases.
- [x] **Step 2: Run focused Edge Function tests**

  Run: `deno test --allow-env supabase/functions/import-inventory/index_test.ts`

  Expected: dry-run side-effect tests fail against the current attachment behavior.

- [x] **Step 3: Move every image upload and all mutation calls behind the apply-only branch.** Preview may validate image bytes/metadata locally or in memory, but cannot allocate remote objects, tokens, or database rows.
- [x] **Step 4: Add a v1 adapter to the existing Edge Function** and route the admin importer through it; remove direct `items.insert` from the admin page only after preview/apply semantics preserve existing product-only behavior. Keep legacy CSV mappings until telemetry proves callers have moved.
- [x] **Step 5: Resolve tenant and store from verified user/session data.** Ignore row tenant IDs as authority; map a legacy `store_code` only through a server-side tenant-owned store lookup. Require an explicit stock mode and reject conflicting or ambiguous stock updates.
- [x] **Step 6: Make apply idempotent and report partial failures** with a batch ID, stable row IDs, and an auditable result. Preserve item IDs, prices, barcode/SKU values, and unchanged stock when the normalized intent is product-only.
- [x] **Step 7: Verify all contracts and scopes**

  Run: `deno test --allow-env supabase/functions/import-inventory/`

  Run: `cd apps/admin_web && rtk test npm run test -- ImportProductsPage`

  Expected: tests prove preview leaves all remote systems unchanged; apply uses the same server validator for both input formats; tenant/store violations fail closed.

**Acceptance criteria:** Both import entry points use one server-side validation and apply path; dry run is provably read-only including image attachments; product-only batches cannot change stock; retries do not duplicate rows or stock effects; existing field mappings remain compatible.

### Task 4: Unify New Image Ingest and Publication on the Existing R2 Controls

**Files:**
- Modify: `supabase/functions/import-inventory/index.ts`
- Modify: `supabase/functions/issue-image-upload-ticket/index.ts` only if a batch-specific scoped capability is needed
- Modify: `supabase/functions/publish-product-image/index.ts` only if batch publication needs a server-verified extension
- Modify: `apps/admin_web/src/lib/images.ts` and `apps/admin_web/src/lib/r2.ts` only for shared client behavior
- Modify: image function tests and Worker tests
- Create: `scripts/catalog/validate_image_manifest.py` and `scripts/catalog/test_validate_image_manifest.py` only if no current validator covers this contract

**Interfaces:**
- Consumes: a validated row/item ID, verified tenant/store, staged image bytes, expected checksum, and current item image key/version.
- Produces: an immutable tenant-scoped R2 key, public URL, checksum, and CAS publication result. A rejected publication returns a conflict and leaves the currently referenced object untouched.

- [x] **Step 1: Add tests for correct tenant key, content type/size, ticket scope, image checksum, version conflict, upload retry, and cleanup of only a newly created unreferenced object.** Assert no code path directly exposes R2 credentials.
- [x] **Step 2: Run focused Worker/function/admin image tests**

  Run: `deno test --allow-env supabase/functions/issue-image-upload-ticket/ supabase/functions/publish-product-image/`

  Expected: ticket authorization, tenant boundary, CAS conflict, checksum, and no-side-effect preview tests pass.

- [x] **Step 3: Implement one attachment path** that uses the current Worker upload authorization and the existing `publish_item_image_if_current` CAS; do not publish through a direct `items.image_url` update.
- [x] **Step 4: Use the configured environment’s public base URL and verified bucket binding.** Keep the existing new-object key convention `products/{tenantId}/{SKU}-{UUID}.webp`; never hard-code a bucket, tenant ID, or deployment target into a batch manifest.
- [x] **Step 5: Preserve resumability and safety** when upload succeeds but DB publication fails. Record an unreferenced upload in the apply report; clean it only after confirming no item references the key and never remove a legacy key.
- [x] **Step 6: Verify dry run remains network-write-free and apply behavior remains version-safe**

  Run: image Worker/function/admin focused tests above.

  Expected: ticket authorization, tenant boundary, CAS conflict, checksum, and no-side-effect preview tests pass.

**Acceptance criteria:** New image imports and admin uploads use the same R2 authorization and CAS publication semantics. Dry run creates no object. Old R2 paths, Supabase Storage URLs, and external image URLs continue to resolve during transition.

### Task 5: Reconcile Existing Catalog Files and Image References Without Breaking Readers

**Files:**
- Modify: `scripts/catalog/reconcile_inventory_snapshots.py` and tests
- Modify: `scripts/images/migrate-images-to-r2.mjs` and tests/docs
- Deprecate or replace only after caller review: `scripts/images/update_db_with_r2_urls.py`, `scripts/images/upload_to_r2.py`, `scripts/images/sync_catalog_to_r2.py`, related one-off upload scripts
- Create: `data/catalog/batches/legacy-reconciliation/` metadata manifests (no source binaries)
- Update: `catalog-images/` and `data/inventory/` references only after compatibility checks

**Interfaces:**
- Consumes: the source inventory, read-only Supabase/R2 snapshots, exact SKU/item ID mappings, content hashes, and current URL/key references.
- Produces: a reviewable report of mapped, duplicate, missing, externally hosted, Supabase Storage, legacy R2, and unresolved images; an explicit allowlist of proposed backfills.

- [x] **Step 1: Add synthetic tests** for `item-images`, `product-images`, legacy `products/{SKU}.webp`, tenant-scoped keys, brand prefixes, duplicate SKUs, query strings, null URLs, and missing R2 objects.
- [x] **Step 2: Extend the migrator in dry-run mode first** to recognize all known key formats and report exactly which parser rule matched; unsupported or ambiguous forms remain unchanged.
- [x] **Step 3: Audit every script caller and URL consumer** before changing paths. Add compatibility aliases or retain old scripts as thin adapters that call the unified pipeline; mark genuinely unsafe/decommissioned scripts clearly.
- [x] **Step 4: Generate per-item before/after mapping and checksums** from read-only snapshots. Do not upload or change DB URLs in this task until a specific batch is approved.
- [x] **Step 5: Test path serving and storefront/admin behavior** for both old and new key layouts, then verify the proposed manifest is a complete exact mapping or explicitly lists unresolved rows.

**Acceptance criteria:** No image URL is rewritten by fuzzy matching; no key is renamed or deleted; all old URL prefixes remain served; every proposed database update identifies exact item ID, old URL/key/version, new URL/key/checksum, and rollback value; the legacy `products` updater is no longer available as an active write path.

**Implementation evidence:** `data/catalog/batches/legacy-reconciliation/` contains the 680-row current item image reference manifest, 706 source-image candidates, and a separate 1,067-object R2 review list. The item snapshot had 651 current `products/` key references present in the R2 metadata listing, 29 legacy/external references requiring exact review, 8 items without images, and one duplicate `image_url` group. Source-image matching found 503 unscoped filename/SKU candidates and 203 without an exact SKU candidate; none is approved for backfill. R2 SHA-256 values were unavailable, so 416 unreferenced product keys remain deletion candidates only. No DB URL or R2 object changed.

### Task 6: Centralize Product Images, Deduplicate, Remove Orphans, and Keep Them out of GitHub

**Files:**
- Move/copy after manifest capture: product packshots from `catalog-images/`, `social-media/catalogue-images/`, `apps/*/public/products/`, `data/inventory/`, and external task artifact folders into `data/catalog/images/`
- Create: `data/catalog/image-manifest.csv` (metadata only; no image bytes)
- Create: `scripts/catalog/check_no_tracked_product_images.py` and its tests
- Modify: root `.gitignore` to track only approved catalog metadata while keeping `data/catalog/images/` ignored
- Create: `social-media/catalogue-images/.gitignore` to keep product-image binaries out while allowing Markdown audit notes
- Modify: `.github/workflows/ci.yml` to run the tracked-product-image guard
- Remove from current default-branch tree after preservation: `social-media/catalogue-images/DE-AMA-GEN-0.75.png`
- Update: exact code/creative references to use R2 URLs or the central local manifest, only where a live reference exists

**Interfaces:**
- Consumes: Task 1 inventory, exact item/SKU map, file hashes, app/marketing references, current DB image references, and read-only R2 object metadata when authorized.
- Produces: one flat local image library plus `image-manifest.csv` rows containing original path, canonical filename, SHA-256, perceptual hash (candidate detection only), item ID/SKU if exact, role (`source`, `processed`, `approved`, `unmatched`), duplicate group, existing URLs/object keys, use/reference status, and disposition (`keep`, `deduplicate`, `orphan-review`, `unresolved`).

- [x] **Step 1: Add tests for the image manifest and Git guard** covering exact duplicate bytes, same image under two names, near-duplicate hashes, filename collisions, no SKU match, duplicate SKU, current DB reference, app/marketing reference, ignored central path, and a product image accidentally tracked outside the central path.
- [x] **Step 2: Run focused tooling tests**

  Run: `python3 -m unittest scripts.catalog.test_product_image_library`

  Expected: exact-hash grouping, collision-safe names, ignored central paths, and tracked packshots are covered by passing tests.

- [x] **Step 3: Inventory all local and remote candidates** including current GitHub default/all active branch trees, locally reachable Git history, product-photo directories, image artifacts, and R2 keys. Keep app logos, icons, screenshots, banners, and other non-product design assets out of the packshot manifest unless verified as product images.
- [x] **Step 4: Copy verified product images into the central flat directory** using collision-safe names based on exact item/SKU plus role and hash prefix; retain the original path and full hash in the manifest. Copy before removing any tracked or source file. Confirm every copy hash matches.
- [x] **Step 5: Identify exact duplicates by SHA-256.** Retain one canonical local file per exact-byte group and list every original path as an alias. Use perceptual hashes only to suggest visually similar candidates; review crops, package variants, language, sizes, and labels before removal.
- [x] **Step 6: Identify orphans and make a disposition report.** A file is not deletable solely because it has no filename/SKU match. Check exact product IDs/SKUs, image URLs/keys in `items`, source provenance, code/marketing references, R2 references, and campaign use. The 2026-10-29 report retains all unresolved local aliases and R2 candidates; the manifest records per-alias reference-scan signals and unresolved disposition. No file met the evidence threshold for deletion. See `data/catalog/batches/legacy-reconciliation/image-disposition-report.md`.
- [x] **Step 7: Add Git prevention and clean current trees.** Keep `data/catalog/images/` ignored under the root `data/` rule while explicitly allowing approved schemas/docs/manifests; ignore product-image binaries in the legacy catalogue-images source folder; add a CI guard that rejects tracked product-packshot paths and image files inside the central library, with a narrow allowlist for application UI assets. Delete the current-tree AMA packshot only after the centralized copy and hash are verified. Keep source artifacts outside Git.
- [x] **Step 8: Remove confirmed product-image files from the default branch via a reviewed PR** and migrate any code or campaign references first. Sweep other active branches with their owners/PRs; do not force-push or rewrite repository history in this task.
- [x] **Step 9: Reconcile R2 object duplicates/orphans** from a read-only key/hash/reference report. The 2026-10-29 disposition reconciles all 1,067 product-prefix objects and retains all of them; 416 candidates still need old-URL/code/campaign and cache/retention review. No exact deletion list is approved. See `data/catalog/batches/legacy-reconciliation/r2-disposition-report.md`.
- [x] **Step 10: Verify centralization and policy**

  Run: `python3 -m unittest scripts.catalog.test_product_image_library`

  Run: `python3 scripts/catalog/check_no_tracked_product_images.py`

  Expected: every discovered source is accounted for, the central folder is Git-ignored, no product packshot is tracked in the accepted tree, all retained assets have manifest hashes, and duplicate/orphan deletions have explicit evidence.

**Acceptance criteria:** All local product packshots are in the single `data/catalog/images/` directory; exact duplicates and verified orphans are removed with a retained audit manifest; uncertain/near duplicates stay for review; product images are blocked from future Git commits and absent from the default branch’s current tree; R2 and DB references still resolve; old keys and Git history remain untouched unless a separately reviewed history-purge operation is approved.

### Task 7: Pilot, Measure, and Retire Duplicate Entry Points Gradually

**Files:**
- Modify: `data/catalog/README.md` and applicable runbooks
- Modify: migration/import documentation for actual callers only
- Create: a sanitized pilot manifest and signed-off validation report under `data/catalog/batches/<batch-id>/`
- Remove no legacy files in this task unless all criteria below are met

**Interfaces:**
- Consumes: approved normalized batch, reviewed SKU/image manifest, selected deployment environment and bucket, tenant/store scope, and preflight database/R2 snapshots.
- Produces: a controlled pilot report with deterministic row outcomes, before/after checks, rollback instructions, and a go/no-go decision for expanding rollout.

- [x] **Step 1: Prepare a pilot without executing writes.** A mixed three-row pilot is recorded in `data/catalog/batches/security-test-preview-20261028/`; it includes an existing product with a legacy image URL, two new products, explicit stock modes, and a preview-only synthetic image. The exact batch hash and image checksum are recorded.
- [x] **Step 2: Require review of preflight output**: target environment, authenticated tenant/store, verified bucket binding, expected creates/updates, prices/costs, stock mode, image URLs/keys/checksums, duplicates, and rollback snapshot. The exact Security Tests project, tenant/store, batch hash, and preview results were reviewed and approved; see the pilot report.
- [x] **Step 3: Execute only after separate explicit authorization** for that exact reviewed batch. The product/stock batch and separate image-publication pilot were explicitly authorized and applied only in Security Tests. The synthetic image batch completed with 0 creates, 0 updates, and 1 unchanged row; the inactive fixture now points to image version 3. No production data was changed. Do not use a service-role shell shortcut or broad bulk SQL.
- [x] **Step 4: Compare before/after snapshots** for item IDs, tenant, SKU, barcode, category, price/cost/MRP, active state, stock levels, image URL/key/checksum/version, and R2 object checksums. Product/stock snapshots matched. The image pilot's stored checksum, version 3, 2,618-byte WebP response, and downloaded R2 body SHA-256 match (`f4b5322fdac59fb25869b1b616c08f7d72689babb66b92f6c34365facc06d3bf`). The inactive fixture has default cost/price 0.00 and no stock rows.
- [x] **Step 5: Test rollback on a non-production fixture first.** After explicit user authorization, rolled back only the two exact Security Tests pilot-created items by tenant and item ID, after fresh dependency checks. The import audit rows were preserved; no stock or R2 object was deleted. See `data/catalog/batches/security-test-preview-20261028/rollback-verification.json`.
- [ ] **Step 6: Expand in bounded batches** only when the pilot has zero unexplained differences. The 24-hour Security Tests log window (2026-10-27 19:53–2026-10-28 19:53 UTC) recorded `import-inventory`: 15 POST/200, 3 POST/500, 17 OPTIONS/200; `issue-image-upload-ticket`: 4 POST/200; `publish-product-image`: 1 POST/200, 2 POST/409, 1 POST/500. A sanitized handler log attributes the publish 500 to `Invalid tenant image publication metadata`; the preview-host allowlist migration was applied afterward. The two 409s follow retry-object writes and precede the test-only preview-key metadata migration, but request logs cannot distinguish CAS-conflict from post-publish metadata-confirmation responses; since CAS runs first, a 409 alone does not prove the item pointer is unchanged. The three importer 500s have no matching batch/import-run records or diagnostic error events; function-edge metadata shows generic `EDGE_FUNCTION_ERROR` and a 3,803-byte request, the same size/header group as five successful requests. Payload is unavailable, so causes remain unexplained. All three preview Worker URLs returned 200 `image/webp` (2,618 bytes). A corrected query of `function_edge_logs` for 19:53–20:21 UTC returned no function requests; this 28-minute no-traffic interval is not sustained monitoring. The production preview POST at 20:58:11 UTC returned 200 (628 bytes); a separate 936-byte POST returned 500 at 20:58:46 UTC with generic `EDGE_FUNCTION_ERROR`. Its response was application/json, 313 bytes, consistent with the deployed handler's outer catch returning an exception response; the request body/content-type and response body are not retained, so the exception text is unrecoverable. No `import_runs` row appeared in the nearby window. The target item still matches the staged product fields (`updated_at` remains 2026-10-25), has one stock row (qty 2), and has no stock movement since the error window. A further 654-byte POST returned 200 at 21:02:03 UTC; its operation/caller cannot be identified from available metadata. No POST appeared after 21:02 through the 21:12 UTC log check. Correlated v55 function logs showed only Boot/Log info events, with no handler diagnostic. Only ~14 minutes had elapsed since preview; this is not sustained clean monitoring. Expansion remains NO-GO.
- [ ] **Step 7: Deprecate old templates/scripts only after** caller search, usage evidence, compatibility period, and a removal review. Scoped search found the new v1 admin preview/apply caller, the Flutter legacy multipart importer using `dry_run`, and legacy Edge Function deploy/test scripts. Caller metadata shows importer requests used macOS Chrome; five successful POSTs carried `supabase-js/2.110.0; runtime=web`, while ten successful POSTs and all three 500s had no client-info header. This suggests browser activity but cannot map requests to a specific code caller, determine payload format, or prove mobile usage is absent. Keep adapters and scripts; usage and sunset criteria are not met.

**Production readiness:** See `production-readiness.md`. The staged one-row candidate at `data/catalog/batches/production-preview-readiness-20261029/batch.json` was previewed through the v1 admin UI using the same product values (brand/MRP included), stock mode `none`, no category/image. The UI generated a distinct request batch ID/hash (`28b557d5-5854-45af-81e9-3bfb5731fd38`; `227f89ac…c889a3`) from the CSV, and reported 0 create, 0 update, 1 unchanged, 0 ambiguous/invalid. Pre/post reads matched the existing item, image pointer, and stock-row count. Production `import-inventory` v55 and admin UI commit `a686db9a` are active with JWT/auth. The legacy branch still uploads attachments before its `dry_run` guard. The v1 preview returns before audit/apply RPCs, stock writes, image CAS, or R2; no migration was needed. No apply or production data/image change occurred.

**Acceptance criteria:** The pilot changes only reviewed rows and objects; all independent checks agree; rollback is rehearsed; legacy URLs and input formats still work; old write paths are removed only after verified migration and caller sunset. No drop/delete/archive is bundled with initial cutover.

## Checkpoints

1. **Ownership checkpoint:** approve Task 1’s authority map; do not proceed while any live table, stock owner, bucket binding, or import caller is ambiguous.
2. **Contract checkpoint:** approve v1 semantics and compatibility adapters before changing import code.
3. **Safety checkpoint:** dry-run regression passes with zero remote writes before preview is used to approve any data batch.
4. **Image checkpoint:** validate tenant scoping and CAS behavior using test fixtures before enabling image attachments in the importer.
5. **Image-library checkpoint:** approve the flat local manifest, exact duplicate groups, orphan evidence, Git cleanup list, and separate R2 object deletion list.
6. **Migration checkpoint:** inspect exact checksums and item/image mappings; unresolved records are excluded from apply.
7. **Pilot checkpoint:** separate authorization is required for the exact environment, bucket, tenant/store, batch hash, and intended changes before any live mutation.

## Rollback and Compatibility

- Keep old import column mappings as adapters; rollback is routing callers back to the prior UI entry while keeping the shared validator read-only.
- Preserve old URLs and R2 object keys. Reverting an image publication changes only the DB pointer through a version-aware server path; do not delete the new or old object during rollback.
- Keep the central local image library ignored and recoverable from its source manifest during the transition. Git history cleanup is not part of ordinary file deletion; if bytes must be erased from historical Git objects, prepare a separate branch/PR impact review and explicit force-push plan.
- Capture preflight snapshots with stable item IDs, identifiers, pricing, stock, and image metadata. Never restore rows by name or SKU alone when item ID is available.
- Do not introduce a schema migration or change SKU/index rules unless Task 1 proves a specific gap. Any required migration must be additive, tenant-safe, backward compatible, and separately reviewed.
- If a pilot shows unexplained item/stock/image differences, stop the rollout, keep all objects, restore only reviewed pointers if needed, and return to preview/reconciliation.
