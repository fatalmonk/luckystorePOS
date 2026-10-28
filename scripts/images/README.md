# Image scripts

`migrate-images-to-r2.mjs` now runs read-only by default. It accepts only recognized legacy object prefixes in its dry-run report; an image migration requires `--execute`. Do not use that legacy upload flow for catalog imports; new imports use the authenticated ticket and CAS path documented in `data/catalog/README.md`.

`update_db_with_r2_urls.py` is disabled because it writes to the retired `public.products` table and bypasses tenant-scoped image CAS. The remaining one-off upload and sync scripts are retained for caller compatibility review; inspect and authorize each independently before use.

`legacy-image-reference.mjs` is a pure parser for `item-images/`, `product-images/`, `products/`, and brand-prefixed legacy paths. It strips query and fragment data and never fetches or writes.
