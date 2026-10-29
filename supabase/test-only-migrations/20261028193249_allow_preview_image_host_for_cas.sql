-- Permit the isolated Security Tests image Worker while preserving the
-- production host, tenant key scope, checksum validation, and service-only CAS.
CREATE OR REPLACE FUNCTION public.publish_item_image_if_current(
  p_item_id uuid,
  p_tenant_id uuid,
  p_store_id uuid,
  p_source_image_key text,
  p_source_image_version bigint,
  p_new_image_key text,
  p_new_image_url text,
  p_new_image_checksum text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_rows integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.stores s WHERE s.id = p_store_id AND s.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Invalid store for tenant';
  END IF;
  IF p_new_image_key IS NOT NULL AND (
    p_new_image_key !~ ('^products/' || p_tenant_id::text || '/[-A-Z0-9_]+-[0-9a-f-]{36}\.webp$') OR
    coalesce(p_new_image_checksum !~ '^[0-9a-f]{64}$', true) OR
    p_new_image_url IS NULL OR
    split_part(p_new_image_url, '?', 1) NOT IN (
      'https://images.luckystore1947.com/' || p_new_image_key,
      'https://lucky-store-images-preview.luckystore-1947.workers.dev/' || p_new_image_key
    ) OR
    position('#' IN p_new_image_url) > 0
  ) THEN
    RAISE EXCEPTION 'Invalid tenant image publication metadata';
  ELSIF p_new_image_url IS NOT NULL OR p_new_image_checksum IS NOT NULL THEN
    RAISE EXCEPTION 'URL and checksum must be NULL when image key is NULL';
  END IF;

  UPDATE public.items
  SET image_key = p_new_image_key,
      image_url = p_new_image_url,
      image_checksum = p_new_image_checksum,
      image_version = image_version + 1,
      updated_at = now()
  WHERE id = p_item_id
    AND tenant_id = p_tenant_id
    AND image_key IS NOT DISTINCT FROM p_source_image_key
    AND image_version = p_source_image_version;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$function$;

-- Keep the test project's image provenance trigger in sync with the preview
-- Worker host accepted by the CAS function above.
CREATE OR REPLACE FUNCTION public.sync_item_image_metadata()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.image_version := CASE WHEN NEW.image_url IS NULL THEN 0 ELSE 1 END;
    NEW.image_checksum := NULL;
  ELSIF current_user = 'postgres' AND NEW.image_version = OLD.image_version + 1 THEN
    -- Only the security-definer CAS publisher may supply this transition.
    NULL;
  ELSIF NEW.image_url IS DISTINCT FROM OLD.image_url THEN
    NEW.image_version := OLD.image_version + 1;
    NEW.image_checksum := NULL;
  ELSE
    NEW.image_version := OLD.image_version;
    NEW.image_checksum := OLD.image_checksum;
  END IF;

  IF NEW.image_url ~ '^https://(images\.luckystore1947\.com|lucky-store-images-preview\.luckystore-1947\.workers\.dev)/(products|categories)/[-A-Za-z0-9_./]+([?][^#]*)?$'
    AND split_part(
      split_part(NEW.image_url, '?', 1),
      CASE WHEN NEW.image_url LIKE 'https://images.luckystore1947.com/%'
        THEN 'https://images.luckystore1947.com/'
        ELSE 'https://lucky-store-images-preview.luckystore-1947.workers.dev/'
      END,
      2
    ) !~ '(^|/)[.]{1,2}(/|$)|//|/$' THEN
    NEW.image_key := split_part(
      split_part(NEW.image_url, '?', 1),
      CASE WHEN NEW.image_url LIKE 'https://images.luckystore1947.com/%'
        THEN 'https://images.luckystore1947.com/'
        ELSE 'https://lucky-store-images-preview.luckystore-1947.workers.dev/'
      END,
      2
    );
  ELSE
    NEW.image_key := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.publish_item_image_if_current(uuid, uuid, uuid, text, bigint, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_item_image_if_current(uuid, uuid, uuid, text, bigint, text, text, text)
  TO service_role;;
