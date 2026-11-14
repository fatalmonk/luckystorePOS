-- pg-delta: transaction=false
-- Concurrent builds avoid holding write-blocking locks while scanning these
-- live translation tables. Drop first so retries repair interrupted builds.
DROP INDEX CONCURRENTLY IF EXISTS public.category_translations_search_terms_gin_idx;
CREATE INDEX CONCURRENTLY category_translations_search_terms_gin_idx
  ON public.category_translations USING gin (search_terms);

DROP INDEX CONCURRENTLY IF EXISTS public.item_translations_published_lookup_idx;
CREATE INDEX CONCURRENTLY item_translations_published_lookup_idx
  ON public.item_translations (item_id, tenant_id) WHERE review_status = 'published';

DROP INDEX CONCURRENTLY IF EXISTS public.category_translations_published_lookup_idx;
CREATE INDEX CONCURRENTLY category_translations_published_lookup_idx
  ON public.category_translations (category_id, tenant_id) WHERE review_status = 'published';
