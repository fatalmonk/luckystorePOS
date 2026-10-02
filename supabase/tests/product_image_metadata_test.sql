-- Adversarial checks for the image metadata migration and image-only CAS.
-- Run only against the guarded disposable Supabase project.

begin;

do $$
begin
  if not (
    session_user = 'postgres.grxxenvdhfwzafzyykgo'
    or (session_user = 'postgres' and current_setting('application_name') = 'codex-disposable-grxxenvdhfwzafzyykgo')
  ) then
    raise exception 'image metadata tests may run only against the authorized disposable project';
  end if;
end $$;

do $$
declare
  v_tenant uuid;
  v_store uuid;
  v_item uuid;
  v_published boolean;
begin
  insert into public.tenants (name) values ('Image metadata test tenant') returning id into v_tenant;
  insert into public.stores (tenant_id, name) values (v_tenant, 'Image metadata test store') returning id into v_store;
  insert into public.items (tenant_id, sku, name, image_url) values (
    v_tenant, 'IMG-META-1', 'Image metadata test item', 'https://images.luckystore1947.com/products/' || v_tenant || '/IMG-META-1.webp?t=1'
  ) returning id into v_item;

  if (select image_key from public.items where id = v_item) <> 'products/' || v_tenant || '/IMG-META-1.webp' then
    raise exception '[FAIL] R2 URL backfill/trigger did not derive image_key';
  end if;
  if (select image_version from public.items where id = v_item) <> 1 then
    raise exception '[FAIL] initial image_version must be 1';
  end if;

  update public.items set price = 123 where id = v_item;
  if (select image_version from public.items where id = v_item) <> 1 then
    raise exception '[FAIL] unrelated product edits changed image_version';
  end if;

  v_published := public.publish_item_image_if_current(
    v_item, v_tenant, v_store,
    'products/' || v_tenant || '/IMG-META-1.webp', 1,
    'products/' || v_tenant || '/canva/session-1/1.webp',
    'https://images.luckystore1947.com/products/' || v_tenant || '/canva/session-1/1.webp',
    'checksum-1'
  );
  if not v_published then raise exception '[FAIL] current image CAS should publish'; end if;
  if (select image_version from public.items where id = v_item) <> 2 then
    raise exception '[FAIL] publish must increment image_version';
  end if;

  v_published := public.publish_item_image_if_current(
    v_item, v_tenant, v_store, 'products/' || v_tenant || '/IMG-META-1.webp', 1,
    'products/' || v_tenant || '/canva/session-2/1.webp',
    'https://images.luckystore1947.com/products/' || v_tenant || '/canva/session-2/1.webp', 'checksum-2'
  );
  if v_published then raise exception '[FAIL] stale image CAS must reject'; end if;

  raise notice '[PASS] image metadata, unrelated edit, successful CAS, and stale CAS checks';
end $$;

rollback;
