# Meta catalogue exporter — release gates

This branch only generates a local CSV. It does not upload, host, schedule, or import a feed into Commerce Manager. Do not merge for scheduled-feed use until the serving design and product-policy review are approved.

1. Deploy the storefront `/api/products` change first: it now supplies `productPath` using the canonical storefront slug helper and pages the RPC beyond 1,000 records. Run the exporter against that version; an older API will fail closed.
2. Verify that the public API belongs to the intended store/tenant, that its stock projection reflects the intended sellable stock, and that paging returns all products. `limit=100&offset=...` must return the exact requested slice, sequential pages, and an accurate `hasMore` flag. The storefront calls `search_storefront_catalog_v2`; migration `20261015165958_bound_storefront_catalog_search.sql` orders by `i.name ASC, i.id ASC` so equal names keep a deterministic position across pages. Confirm that migration is applied in the target environment. The exporter checks response shape and duplicate IDs, but no API-only client can prove that an otherwise valid `hasMore: false` is truthful or detect every omission; a verified minimum and previous-feed drop guard provide additional protection, not a completeness proof.
3. Review the assortment against Meta Commerce Policies and set `META_FEED_ALLOWED_CATEGORIES` explicitly to approved public category names. Category approval is a business decision; the exporter does not guess.
4. Set `META_FEED_MIN_ITEMS` to a verified floor based on the approved assortment. A 10% drop relative to the previous feed also stops replacement; investigate legitimate large changes and review the old feed before starting a new output path.
5. Run `node --test scripts/marketing/export-meta-catalog.test.mjs`, then generate into a private output path using `META_FEED_OUTPUT`. Check CSV, images, landing links, price, inventory, and a Meta test import before hosting. Protect any scheduled feed URL and make generation finish before Meta fetches it. Do not place service-role credentials in the feed job.

The exporter now rejects WebP/SVG feed URLs and checks JPEG/PNG bytes for at least 500 × 500 pixels and no more than 8 MB. Existing storefront WebP images need suitable JPEG/PNG variants before a feed can be generated. The Lipton Pure Tea and Nazirshail Premium rows stay excluded until the brand printed on their packaging is verified.

Meta product data specifications: https://www.facebook.com/business/help/120325381656392
