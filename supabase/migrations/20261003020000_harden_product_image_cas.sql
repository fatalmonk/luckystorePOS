-- Repair image provenance and bind publication to store catalog membership.
-- Apply after 20261003010000; unknown URLs retain their URL but no invented key.
create or replace function public.sync_item_image_metadata()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if tg_op = 'INSERT' then
    new.image_version := case when new.image_url is null then 0 else 1 end;
    new.image_checksum := null;
  elsif current_user = 'postgres' and new.image_version = old.image_version + 1 then
    -- Only the security-definer CAS publisher may supply this transition.
    null;
  elsif new.image_url is distinct from old.image_url then
    new.image_version := old.image_version + 1;
    new.image_checksum := null;
  else
    new.image_version := old.image_version;
    new.image_checksum := old.image_checksum;
  end if;

  if new.image_url ~ '^https://images\.luckystore1947\.com/(products|categories)/[-A-Za-z0-9_./]+([?][^#]*)?$'
    and split_part(split_part(new.image_url, '?', 1), 'https://images.luckystore1947.com/', 2) !~ '(^|/)[.]{1,2}(/|$)|//|/$' then
    new.image_key := split_part(split_part(new.image_url, '?', 1), 'https://images.luckystore1947.com/', 2);
  else
    -- External/ambiguous URLs never inherit the previous object's key.
    new.image_key := null;
  end if;
  return new;
end;
$function$;

drop trigger if exists items_sync_image_metadata on public.items;
create trigger items_sync_image_metadata
before insert or update of image_url, image_key, image_checksum, image_version
on public.items
for each row execute function public.sync_item_image_metadata();

-- Normalize after installing the stricter trigger, so the old trigger cannot
-- reconstruct an ambiguous key during this update.
update public.items set image_key = null
where image_url is null or image_url !~ '^https://images\.luckystore1947\.com/(products|categories)/[-A-Za-z0-9_./]+([?][^#]*)?$'
  or split_part(split_part(image_url, '?', 1), 'https://images.luckystore1947.com/', 2) ~ '(^|/)[.]{1,2}(/|$)|//|/$';

-- The mutation gate is intentionally not callable by browser roles. Trusted
-- server functions may use it after resolving all values from their session.
create or replace function public.publish_item_image_if_current(
  p_item_id uuid,
  p_tenant_id uuid,
  p_store_id uuid,
  p_source_image_key text,
  p_source_image_version bigint,
  p_new_image_key text,
  p_new_image_url text,
  p_new_image_checksum text
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_rows integer;
begin
  if not exists (
    select 1 from public.stores s
    where s.id = p_store_id and s.tenant_id = p_tenant_id
  ) then
    raise exception 'Invalid store for tenant';
  end if;

  update public.items
  set image_key = p_new_image_key,
      image_url = p_new_image_url,
      image_checksum = p_new_image_checksum,
      image_version = image_version + 1,
      updated_at = now()
  where id = p_item_id
    and tenant_id = p_tenant_id
    and exists (
      select 1 from public.stock_levels sl
      where sl.item_id = p_item_id and sl.store_id = p_store_id
    )
    and image_key is not distinct from p_source_image_key
    and image_version = p_source_image_version;

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$function$;

revoke all on function public.publish_item_image_if_current(
  uuid, uuid, uuid, text, bigint, text, text, text
) from public, anon, authenticated;
grant execute on function public.publish_item_image_if_current(
  uuid, uuid, uuid, text, bigint, text, text, text
) to service_role;
