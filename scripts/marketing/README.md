# Meta catalogue exporter — release gates

This branch only generates a local CSV. It does not upload, host, schedule, or import a feed into Commerce Manager. Do not merge for scheduled-feed use until the serving design and product-policy review are approved.

1. Deploy the storefront `/api/products` change first: it now supplies `productPath` using the canonical storefront slug helper and pages the RPC beyond 1,000 records. Run the exporter against that version; an older API will fail closed.
2. Verify that the public API belongs to the intended store/tenant, that its stock projection reflects the intended sellable stock, and that paging returns all products. `limit=100&offset=...` must return sequential pages and an accurate `hasMore` flag. The current code checks shape and duplicates, but no API-only client can prove that an otherwise valid `hasMore: false` is truthful; a verified minimum and previous-feed drop guard provide additional protection, not a completeness proof.
3. Review the assortment against Meta Commerce Policies and set `META_FEED_ALLOWED_CATEGORIES` explicitly to approved public category names. Category approval is a business decision; the exporter does not guess.
4. Set `META_FEED_MIN_ITEMS` to a verified floor based on the approved assortment. A 10% drop relative to the previous feed also stops replacement; investigate legitimate large changes and review the old feed before starting a new output path.
5. Run `node --test scripts/marketing/export-meta-catalog.test.mjs`, then generate into a private output path using `META_FEED_OUTPUT`. Check CSV, images, landing links, price, inventory, and a Meta test import before hosting. Protect any scheduled feed URL and make generation finish before Meta fetches it. Do not place service-role credentials in the feed job.

Meta product data specifications: https://www.facebook.com/business/help/120325381656392
