-- Keep row validation out of the publication-hardening migration's
-- access-exclusive ALTER TABLE transaction. NOT VALID still enforces new
-- writes while deferring legacy-row scans to the following migration.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '20s';

ALTER TABLE public.item_translations
  ADD CONSTRAINT item_translations_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES public.users(id) NOT VALID,
  ADD CONSTRAINT item_translations_published_by_fkey
    FOREIGN KEY (published_by) REFERENCES public.users(id) NOT VALID;

ALTER TABLE public.category_translations
  ADD CONSTRAINT category_translations_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES public.users(id) NOT VALID,
  ADD CONSTRAINT category_translations_published_by_fkey
    FOREIGN KEY (published_by) REFERENCES public.users(id) NOT VALID;

COMMIT;
