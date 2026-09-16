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
| 5b214258-3bf9-4a99-9c58-0f95e1a7930e | CC-TRI-14 | Trident Pineapple Twist Chewing Gum | Chocolates & Candies |  |  |  |  | PENDING_EVIDENCE |
| 5830390b-4eef-4685-965e-de21d8e4ae7e | IC-POL-CAR-2 | Polar Carnival Butterscotch | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| e8771528-0444-4659-ba97-d71e7a8ff438 | IC-POL-CAR | Polar Carnival Vanilla | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| 6df59696-6647-4c08-8cd4-4a137da6326b | IC-POL-CAR-3 | Polar Carnival Vanilla | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| fc6d963a-1d54-42d0-8b6b-47825cf94f11 | IC-POL-CHO | Polar Chocobar | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| 4ca03fce-c4b6-493a-af3d-d6c941bfba68 | IC-POL-CHO-2 | Polar Chocodelight | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| 2e948079-ebb6-498f-b14a-fda18fbbf721 | IC-POL-COF | Polar Coffee 1L | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| 8f7ce150-2419-408f-bd99-db8daa8f9b05 | IC-POL-CRU | Polar Crunchy | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| 54a7520e-a90e-42ec-884f-c8f4d25abaac | IC-POL-D1L | Polar Doi 1 Liter | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| 70a322a1-cab7-4504-bf0e-999118e6fcc6 | IC-POL-DS1 | Polar Double Sundae 1 Liter | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| 0aa0a385-a936-4c28-8b3c-6755436804c1 | IC-POL-ESS | Polar Essora | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| 1ba3a780-6e7b-4d8a-b451-36a959a823e6 | IC-POL-HAZ | Polar Hazelnut | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| 604e6bb0-6042-4daf-adb9-12a4f9738ef4 | IC-POL-ICE | Polar Ice Lolly | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| c1895793-84d3-492d-93eb-1c56383cecc4 | IC-POL-K1L-2 | Polar Kheer 1 Liter | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| 79e0ece1-0c5e-4e2f-a003-d2f37b73fafb | IC-POL-K1L | Polar Kheer 1/2 Liter | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| b77e2fe6-53c0-4fc5-8de3-31cec1e1f510 | IC-POL-MAL | Polar Malai | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| f2d567f0-f15c-4296-8884-d2e45f7dce68 | IC-POL-MAN-2 | Polar Mango 1L | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| 236b5858-c7f0-449d-b1f5-2b534620635c | IC-POL-MAN | Polar Mango/Chocolate Cup | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| 39d85f5f-9ca7-40b9-8fd2-d4f7118de8ce | IC-POL-PRE | Polar Premium Cup | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| bc7de70f-e4d8-42e7-8e83-ecccbbfd7a72 | IC-POL-RV1 | Polar Red Velvet 1L | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| 94c748e3-6bed-4898-950d-2ad2ae9deb08 | IC-POL-R1L | Polar Regular 1 Liter | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| 2c367e44-91b4-4fcf-84a3-09e9dcecdbc7 | IC-POL-ROB | Polar Robusto | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| d132ec9d-3175-440b-b1ac-d4cbfea8e55b | IC-POL-ROY | Polar Royal Sundae | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| fe31ca90-6d1b-4ee8-9d69-1b34c2544190 | IC-POL-SNC | Polar Shell N Core | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| 2233c416-8337-461f-a167-88dcee05b3d5 | IC-POL-SHO | Polar Shor Malai | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| fcefa591-3172-43b2-b174-a63802108a7a | IC-POL-TOR | Polar Tornado | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| eca88367-4d03-4562-b7e8-88ef2eea38c7 | IC-POL-TR1 | Polar Tub Regular 1/2 Liter | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| be49558d-34d6-4f54-ab67-0d8b96efd59e | IC-POL-ZM1 | Polar Zafran Malai 1 Liter | Ice-Cream |  |  |  |  | PENDING_EVIDENCE |
| 169e4ac0-80cf-4dc7-8266-f8cad832eb9b | IC-SAV-EA | Savoy Ekdom Aam | Ice-Cream | MANUFACTURER | https://www.savoybd.com/products | 2026-09-16 | exactName, category | PENDING_EVIDENCE |
| 697ec1bf-8b16-4d34-b692-2d206443493f | IC-SAV-IKV | Savoy iKone Vanilla | Ice-Cream | MANUFACTURER | https://www.savoybd.com/products | 2026-09-16 | exactName, category | PENDING_EVIDENCE |
| 5cdfbe00-fc86-4ffd-87e1-80dc1fdea4ba | IC-SAV-LOL-ORG | Savoy Orange Lolly | Ice-Cream | MANUFACTURER | https://www.savoybd.com/products | 2026-09-16 | exactName, category | PENDING_EVIDENCE |
| 524f084a-e3be-4fdd-a637-dcacc3cc3afa | IC-SAV-RVT | Savoy Red Velvet Temptation Cake 1KG | Ice-Cream | MANUFACTURER | https://www.savoybd.com/products | 2026-09-16 | exactName, category | PENDING_EVIDENCE |
| f49fa080-07f8-4ec3-926a-6f64e315802f | NOO-BUL-DSP | Buldak Ramen 2x Spicy | Noodles |  |  |  |  | PENDING_EVIDENCE |
| 315a1ef1-49ef-470e-a0ff-818aa0400739 | NOO-BUL-3XS | Buldak Ramen 3x Spicy | Noodles |  |  |  |  | PENDING_EVIDENCE |
| 0c815bf1-c506-44f5-88dd-b504db60d7af | NOO-BUL-CHE-CUP | Buldak Ramen Cheese Cup | Noodles |  |  |  |  | PENDING_EVIDENCE |
| e04a2efd-9a26-411a-9984-eaf227f72cdc | NOO-BUL-CCA | Buldak Ramen Cream Carbonara | Noodles |  |  |  |  | PENDING_EVIDENCE |
| b79a6606-3eb8-425e-bf53-57c5788dc7ea | NOO-BUL-2XS | Buldak Ramen Noodles 2x Spicy Cup | Noodles |  |  |  |  | PENDING_EVIDENCE |
| 8169739f-dd49-4588-928e-837a22faa388 | NOO-BUL-ORG | Buldak Ramen Original | Noodles |  |  |  |  | PENDING_EVIDENCE |
| 4bbb76d4-f058-430f-9fd1-87db15d71b5c | NOO-BUL-ORG-CUP | Buldak Ramen Original Cup | Noodles |  |  |  |  | PENDING_EVIDENCE |
| 7fd83cfc-2eac-45d1-aa90-0002ca5a0222 | NOO-BUL-QTC | Buldak Ramen Quattro Cheese | Noodles |  |  |  |  | PENDING_EVIDENCE |
| 841b013d-e7bd-46a6-9e69-282f84aa2781 | NOO-BUL-ROS | Buldak Ramen Rose | Noodles |  |  |  |  | PENDING_EVIDENCE |
| ed4f74c8-0f74-47f0-94e2-a6f874f83f80 | OIL-001 | Cooking Oil 1L | Uncategorized |  |  |  |  | PENDING_EVIDENCE |
| 067da398-cb65-45c9-9699-bff6f336acbe | EGGS-001 | Eggs (12 pcs) | Uncategorized |  |  |  |  | PENDING_EVIDENCE |
| ead2ba9a-ac6c-468a-9ba7-c37d680df38c | MILK-001 | Fresh Milk 1L | Uncategorized |  |  |  |  | PENDING_EVIDENCE |
| 65825560-b557-4851-9cab-d0ed62154c4f | RG-KTR-PRM | Katari Atob 25KG (Premium) | Uncategorized |  |  |  |  | PENDING_EVIDENCE |
| d1d1bb2c-804c-4bac-bfff-b004083bc90e | VEG-002 | Onions 1kg | Uncategorized |  |  |  |  | PENDING_EVIDENCE |
| e6ab32eb-c5ef-4f19-9f94-c62488bf76a4 | VEG-001 | Potatoes 1kg | Uncategorized |  |  |  |  | PENDING_EVIDENCE |
| e806eb88-d7df-42f8-8aa9-11f8881e85b0 | RICE-BAS-001 | Premium Basmati Rice 5kg | Uncategorized |  |  |  |  | PENDING_EVIDENCE |

No database update is authorized by this artifact. Promotion requires exact-SKU
evidence review and a separate, explicitly authorized backfill change.
