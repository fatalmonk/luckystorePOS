-- pg-delta: transaction=false
-- Build the category hierarchy index without blocking category writes for the
-- duration of the table scan. Drop/rebuild makes retries safe after an
-- interrupted concurrent build leaves an invalid index behind.

DROP INDEX CONCURRENTLY IF EXISTS public.idx_categories_parent_id;

CREATE INDEX CONCURRENTLY idx_categories_parent_id
  ON public.categories(parent_id);
