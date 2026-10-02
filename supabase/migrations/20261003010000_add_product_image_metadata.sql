-- Product image provenance and optimistic-concurrency metadata.
-- Existing URLs are preserved. Keys are recovered only when the URL is from
-- the Lucky Store image worker; unknown external URLs remain nullable.

alter table public.items
  add column if not exists image_key text,
  add column if not exists image_checksum text,
  add column if not exists image_version bigint;

update public.items
set image_key = case
  when image_url ~ '^https://images\.luckystore1947\.com/' then
    split_part(split_part(image_url, '?', 1), 'https://images.luckystore1947.com/', 2)
  else image_key
end,
image_version = case
  when image_version is not null then image_version
  when image_url is null then 0
  else 1
end
where image_key is null or image_version is null;

alter table public.items
  alter column image_version set default 0,
  alter column image_version set not null,
  add constraint items_image_version_nonnegative check (image_version >= 0);

create index if not exists items_image_key_idx
  on public.items (tenant_id, image_key)
  where image_key is not null;

create or replace function public.sync_item_image_metadata()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if tg_op = 'INSERT' then
    if new.image_url is not null and new.image_version = 0 then
      new.image_version := 1;
    end if;
  elsif new.image_url is distinct from old.image_url then
    -- A caller that supplies a new image_version (the trusted publish gate)
    -- has already performed the version transition. Ordinary product edits
    -- get an automatic image-only version bump here.
    if new.image_version = old.image_version then
      new.image_version := old.image_version + 1;
    end if;
    new.image_checksum := null;
  end if;

  if new.image_url is null then
    new.image_key := null;
  elsif new.image_url ~ '^https://images\.luckystore1947\.com/' then
    new.image_key := split_part(split_part(new.image_url, '?', 1), 'https://images.luckystore1947.com/', 2);
  end if;
  return new;
end;
$function$;

drop trigger if exists items_sync_image_metadata on public.items;
create trigger items_sync_image_metadata
before insert or update of image_url, image_key, image_checksum, image_version
on public.items
for each row execute function public.sync_item_image_metadata();

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
