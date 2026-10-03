# Canva Phase 2A live API acceptance

Date: 2026-10-03 (Asia/Dhaka).

Environment: disposable Supabase project `grxxenvdhfwzafzyykgo`; local admin callback `http://127.0.0.1:5173/canva-connect/callback`. Production was not changed.

The first section records the initial server-side provider probe. The application implementation and browser acceptance are recorded below.

## Verified

- Live OAuth identity/capabilities, disconnect credential deletion, and reconnect succeeded.
- Added `asset:read` after upload-status polling returned HTTP 403; all 38 core tests passed. The disposable Edge Function was redeployed with JWT verification enabled.
- Approved replacement template `EAHW5zquM_4`: one page, 1080 × 1350 px (Canva UI). Dataset exactly matches five image fields plus ten text fields.
- Five URL asset upload jobs completed successfully. The initial job was reused after reauthorization.
- Design autofill job completed successfully. Generated design was not opened or exported.

## Products

| Slot | Product | Price (BDT) |
|---|---|---:|
| 1 | Samyang Buldak Ramen 2X Cup 70g | 150 |
| 2 | Samyang Buldak Ramen Original Cup 70g | 150 |
| 3 | Chupa Chups Best of Lollipops (6Pcs Bundle) - 72g | 30 |
| 4 | Bellame Chocolate Digestive Biscuits 135g | 50 |
| 5 | Marks Powder 1000gm | 945 |

## Provider job evidence

Autofill job: `31f10112-67d0-4eae-a60f-b1193e6c913e`.
Generated design: `DAHW5zmdaSs`.

- Slot 1: upload `a686b564-1241-426d-85b2-ce137008d722`, asset `MAHW5yEJ5mk`, status `success`.
- Slot 2: upload `2e47dae5-cc77-4c53-aa64-db8445f16111`, asset `MAHW58rXABU`, status `success`.
- Slot 3: upload `989288e4-1bf3-464a-ac17-84469e5f4745`, asset `MAHW5_gYHxo`, status `success`.
- Slot 4: upload `fc0de13a-7977-44a9-a485-e6e394791026`, asset `MAHW59VhSKk`, status `success`.
- Slot 5: upload `6b56d3e3-52c6-4c56-bee2-7ae559867f3c`, asset `MAHW5_EY24g`, status `success`.

## Remaining after the initial probe

- Real token refresh and provider revocation effectiveness remain unverified.
- Inspect generated text fit and image placement only when editor review is authorized.
- Implement the Phase 2A application workflow with tenant/store/item authorization, approved-template enforcement, job persistence, and replay protection before treating this probe as application E2E.
- No production rollout, editor return, export, or canonical product-image changes were performed.

## Application workflow and refresh follow-up

The real provider refresh test passed using `CanvaService.getValidCanvaAccessToken`: access and refresh ciphertext changed, the refresh claim cleared, expiry advanced, and the refreshed access token retrieved Canva identity. The probe intentionally expired only the disposable credential timestamp.

Phase 2A now has `/canva-designs`, ordered store-catalog selection, enabled approved-template selection, server-derived immutable product/image snapshots, a durable multi-product run table, request-id idempotency, bounded processing/resume, and `design_ready` termination. Workflow endpoints are authenticated and scoped to the staff tenant/store/user; credentials remain server-only. The existing single-item `canva_product_designs` table is reserved for the later editor/publication workflow; batches use `canva_design_runs`.

Template dataset fields/types are checked live before each provider step. Page count and pixel dimensions are recorded from approved Canva UI evidence; the Brand Template API does not return pixel dimensions, so runtime layout drift is not automatically detected. Layout approval remains pending and the current template is for test use only.

Validation: 45 Deno tests, 6 Canva UI tests, TypeScript, scoped lint, admin build, and guarded rollback SQL assertions for store/item authorization, idempotency/conflict, concurrent lease, stale lease, abandoned claim, browser ACL and own/foreign RLS passed. SQL fixture prices are numeric (50.00), and the proof compares numerically. An SQL alias conflict and a React effect lint finding were corrected before deployment.

Only migration `20261003040000_canva_phase2a_workflow.sql` and Edge Function v3 were deployed to `grxxenvdhfwzafzyykgo`. Five catalog fixtures were added to the isolated test tenant/store with zero stock; production was not changed. Source key/version/checksum/URL or connection-generation changes fence processing. Ambiguous provider creation or abandoned processing fails closed, without automatic duplicate creation. URL-upload APIs are provider preview APIs; production readiness requires confirming their suitability for the intended integration.

## Application browser acceptance

The authenticated local `/canva-designs` workspace selected the five isolated catalog fixtures and approved replacement template, created a durable run, resumed it after a reload, and completed all five uploads plus autofill. Persisted state is `design_ready`, design `DAHW55oOv3w`, five products and five resolved assets, an autofill job ID, and no remaining processing lease. A separate unprocessed test run remains available in the workspace; it was not advanced or deleted. No editor link, return/export action, or production change was performed.

```json
{"run_id" : "f1b85e2f-6f58-4a43-b264-8b528f3d525d", "status" : "design_ready", "product_count" : 5, "asset_count" : 5, "resolved_assets" : 5, "autofill_job_id" : "186be221-7bec-44ca-80cc-873dd990017a", "design_id" : "DAHW55oOv3w", "lease_released" : true, "template" : "EAHW5zquM_4"}
```
