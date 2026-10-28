# Inventory, Catalog, and Product Image Consolidation — Task List

Plan: [`plan.md`](plan.md)

## Progress

- [x] Plan reviewed and approved
- [x] Task 1: Read-only catalog and asset inventory
- [x] Checkpoint 1: Authority map approved after verifying deployed Worker settings and first-party importer callers
- [x] Task 2: Central contract and batch workspace
- [x] Checkpoint 2: Contract semantics approved
- [x] Task 3: Side-effect-free preview and unified import path
- [x] Checkpoint 3: Preview proven free of remote writes; approved by user
- [x] Task 4: Unified R2 ingest and publication
- [x] Checkpoint 4: Ticket/CAS behavior proven by fixtures
- [x] Task 5: Reconcile existing catalog files and image references; unresolved mappings remain explicit
- [x] Remove the confirmed packshot from all 12 GitHub branch tips (PR #562 merged; old Git history preserved)
- [x] Task 6: Centralize image copies, record source/R2 disposition, and keep packshots out of GitHub; retain unresolved aliases and R2 candidates pending exact evidence
- [x] Task 6 Step 6: Record conservative disposition; no local or R2 deletion met the evidence threshold
- [x] Task 6 Step 9: Reconcile R2 keys, current item references, hashes, and cache status; retain every object pending unresolved checks
- [x] Checkpoint 5: Image-library manifest, duplicate groups, orphan evidence, Git cleanup list, and R2 deletion list reviewed; unresolved source aliases and R2 candidates remain preserved
- [ ] Task 7: Authorized pilot, measurement, and gradual retirement (in progress)
- [x] Checkpoint 6: User approved exact Security Test pilot batch `security-test-preview-20261028-01`; applied and verified 2 creates, 1 unchanged, zero errors. Task 7 measurement/retirement remains open.
- [x] Task 7 Steps 1–2: Prepare and review the exact three-row pilot batch and preview evidence.
- [x] Task 7 Step 4: Fresh read-only comparison of all three pilot items and project/tenant/store counts; no R2 write.
- [x] Task 7 Step 5: Authorized rollback rehearsal removed only the two test-created items; batch audit preserved and no R2 objects deleted.
- [x] Task 7 Step 3 image publication: after Security Tests-only CAS/metadata repairs, user approved/applied batch `bf8e1cb9-beb4-4d59-ba0e-0df4397cc5ea` / hash `935b2c8ae7342b2f4d1881db20a6f76998e6ea245e43f2594fb2ddbe06a647a4`. Result: completed, 0 create/0 update/1 unchanged; fixture inactive with zero stock rows. Preview object key is linked at image_version 3; GET returned valid WebP (2,618 bytes, SHA-256 matches). Earlier failed-attempt candidate objects remain in preview R2 pending reference review; none deleted.
- [ ] Task 7 Steps 6–7: Monitoring, bounded expansion, and usage-evidence-based retirement remain open.
- [x] Production code deployment: core import/CAS migrations, JWT-verified image ticket/publication v17, and admin UI fix at commit `391e80b` are active; read-only production preview and postcheck passed. No catalog apply or R2 write.

## Dependency Order

```text
Task 1
 ├─> Task 2 ─> Task 3 ─┐
 └────────────────> Task 4 ─> Task 5 ─> Task 6 ─> Task 7
```

Do not execute any live import or image upload without separate authorization for the exact batch, environment, tenant/store, and bucket. Do not rename or delete existing image keys.
