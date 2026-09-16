---
meta:
  contentType: EvidenceIntake
  status: PENDING_EVIDENCE
---

# Catalog enrichment evidence intake

This is a claim-free intake register for the active catalog items whose database
description is blank. It is intentionally not a copywriting dataset and must not
be used to backfill `items.description` until exact-SKU evidence is attached.

## Read-only inventory snapshot

Verified from the production Supabase catalog on 2026-09-16:

| Catalog category | Missing descriptions |
| --- | ---: |
| Chocolates & Candies | 1 |
| Ice-Cream | 31 |
| Noodles | 9 |
| Uncategorized | 7 |
| **Total** | **48** |

## Evidence record schema

Each candidate requires one record with:

| Field | Required value |
| --- | --- |
| `product_id` | Exact production `items.id` UUID |
| `sku` | Exact internal SKU, if present |
| `catalog_name` | Current production `items.name` |
| `category` | Current category name or `uncategorized` |
| `evidence_source` | Packaging capture or official manufacturer source |
| `source_reference` | URL, capture identifier, or controlled file reference |
| `captured_at` | Evidence capture/verification date |
| `supported_fields` | Field-level list such as `brand`, `netQuantity`, `storageInstructions` |
| `status` | `PENDING_EVIDENCE`, `READY_FOR_REVIEW`, or `REJECTED` |

## Intake rows

Populate one row per exact SKU only after a catalog read identifies its UUID and
current name. Do not infer facts from neighboring products, category names, or
similarly packaged variants.

| product_id | sku | catalog_name | category | evidence_source | source_reference | captured_at | supported_fields | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  | Chocolates & Candies |  |  |  |  | PENDING_EVIDENCE |
|  |  |  | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
|  |  |  | Noodles |  |  |  |  | PENDING_EVIDENCE |
|  |  |  | Uncategorized |  |  |  |  | PENDING_EVIDENCE |

No database update is authorized by this artifact. Promotion requires exact-SKU
evidence review and a separate, explicitly authorized backfill change.
