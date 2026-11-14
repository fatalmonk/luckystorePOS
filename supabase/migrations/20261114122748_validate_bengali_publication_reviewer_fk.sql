-- VALIDATE CONSTRAINT scans existing rows without holding the write-blocking
-- lock used by ADD FOREIGN KEY. Keep lock waits and validation time bounded.
-- If legacy orphan attribution exists, remediate before retrying this phase.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE public.item_translations
  VALIDATE CONSTRAINT item_translations_reviewed_by_fkey;
ALTER TABLE public.item_translations
  VALIDATE CONSTRAINT item_translations_published_by_fkey;
ALTER TABLE public.category_translations
  VALIDATE CONSTRAINT category_translations_reviewed_by_fkey;
ALTER TABLE public.category_translations
  VALIDATE CONSTRAINT category_translations_published_by_fkey;

COMMIT;
