# Image scripts

`migrate-images-to-r2.mjs` is a read-only legacy-reference report. Its former direct R2 upload and `items.image_url` mutation path is decommissioned; `--execute` fails before loading credentials or connecting to Supabase. Use the authenticated ticket and CAS publication path documented in `data/catalog/README.md` for a separately approved batch.

`update_db_with_r2_urls.py` is disabled because it writes to the retired `public.products` table and bypasses tenant-scoped image CAS. The remaining one-off upload and sync scripts are retained for caller compatibility review; inspect and authorize each independently before use.

`legacy-image-reference.mjs` is a pure parser for `item-images/`, `product-images/`, `products/`, and brand-prefixed legacy paths. It strips query and fragment data and never fetches or writes.
