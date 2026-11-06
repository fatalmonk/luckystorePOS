-- Forward-only Security Tests fix: recognize case and default-port variants of the preview host.
-- Restrict the preview image namespace to CAS publication for the dedicated
-- Security Tests tenant. Production image URL derivation remains unchanged.
CREATE OR REPLACE FUNCTION public.sync_item_image_metadata()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF NEW.image_url ~* '^https://lucky-store-images-preview\.luckystore-1947\.workers\.dev(\.)?(:[0-9]+)?(/|$)' THEN
    IF NEW.tenant_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000001'::uuid THEN
      RAISE EXCEPTION 'Preview image URLs are restricted to the Security Tests tenant';
    END IF;
    IF tg_op = 'INSERT' THEN
      RAISE EXCEPTION 'Preview image URLs require CAS publication';
    ELSIF NEW.image_url IS DISTINCT FROM OLD.image_url
       AND (current_user <> 'postgres'
            OR NEW.image_version IS DISTINCT FROM OLD.image_version + 1) THEN
      RAISE EXCEPTION 'Preview image URLs require CAS publication';
    END IF;
  END IF;
  IF tg_op = 'INSERT' THEN
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

  IF NEW.image_url ~ '^https://images\.luckystore1947\.com/(products|categories)/[-A-Za-z0-9_./]+([?][^#]*)?$'
     AND split_part(split_part(NEW.image_url, '?', 1), 'https://images.luckystore1947.com/', 2) !~ '(^|/)[.]{1,2}(/|$)|//|/$' THEN
    NEW.image_key := split_part(split_part(NEW.image_url, '?', 1), 'https://images.luckystore1947.com/', 2);
  ELSIF tg_op = 'UPDATE'
     AND current_user = 'postgres'
     AND NEW.image_version = OLD.image_version + 1
     AND NEW.tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
     AND NEW.image_url ~* '^https://lucky-store-images-preview\.luckystore-1947\.workers\.dev(\.)?(:[0-9]+)?/(products|categories)/[-A-Za-z0-9_./]+([?][^#]*)?$'
     AND split_part(split_part(NEW.image_url, '?', 1), '/', 4) || '/' || split_part(split_part(NEW.image_url, '?', 1), '/', 5) !~ '(^|/)[.]{1,2}(/|$)|//|/$' THEN
    NEW.image_key := regexp_replace(split_part(NEW.image_url, '?', 1), '^https://[^/]+/', '');
  ELSE
    -- External/ambiguous URLs never inherit the previous object's key.
    NEW.image_key := NULL;
  END IF;
  RETURN NEW;
END;
$function$;
