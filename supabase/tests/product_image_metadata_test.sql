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
  t uuid; t2 uuid; st uuid; st2 uuid; st3 uuid; item uuid; ext uuid; au uuid; staff uuid; ok boolean; k text;
begin
  insert into public.tenants(name) values('Image CAS proof') returning id into t;
  insert into public.tenants(name) values('Other tenant') returning id into t2;
  insert into public.stores(tenant_id,name,code) values(t,'CAS store','CAS-'||t) returning id into st;
  insert into public.stores(tenant_id,name,code) values(t,'Other store','CAS-OTHER-'||t) returning id into st2;
  insert into public.stores(tenant_id,name,code) values(t2,'Other tenant store','CAS-'||t2) returning id into st3;
  insert into auth.users(id,email) values(gen_random_uuid(),'image-proof-'||t||'@example.test') returning id into au;
  insert into public.users(id,auth_id,email,role,tenant_id,store_id) values(au,au,'image-proof-'||t||'@example.test','manager',t,st) returning id into staff;
  perform set_config('request.jwt.claim.sub',au::text,true);
  k := 'products/'||t||'/original.webp';
  insert into public.items(tenant_id,name,image_url,image_version) values(t,'CAS item','https://images.luckystore1947.com/'||k,999) returning id into item;
  insert into public.stock_levels(store_id,item_id,qty) values(st,item,1);
  if (select image_version from public.items where id=item) <> 1 then raise exception '[FAIL] arbitrary INSERT version'; end if;
  -- Browser/service direct updates cannot set the version, key or checksum.
  set local role service_role;
  update public.items set image_version=999,image_key='fabricated',image_checksum='fabricated' where id=item;
  reset role;
  if (select image_version<>1 or image_key is distinct from k or image_checksum is not null from public.items where id=item) then
    raise exception '[FAIL] direct metadata override'; end if;
  update public.items set price=123,name='Changed name',description='Changed description' where id=item;
  update public.stock_levels set qty=9 where store_id=st and item_id=item;
  if (select image_version from public.items where id=item)<>1 then raise exception '[FAIL] unrelated edits invalidate CAS'; end if;
  if public.publish_item_image_if_current(item,t,st,'stale',1,'products/'||t||'/new.webp','https://images.luckystore1947.com/products/'||t||'/new.webp','checksum') then
    raise exception '[FAIL] stale key'; end if;
  if public.publish_item_image_if_current(item,t,st,k,0,'products/'||t||'/new.webp','https://images.luckystore1947.com/products/'||t||'/new.webp','checksum') then
    raise exception '[FAIL] stale version'; end if;
  if public.publish_item_image_if_current(item,t,st2,k,1,'products/'||t||'/new.webp','https://images.luckystore1947.com/products/'||t||'/new.webp','checksum') then
    raise exception '[FAIL] cross store'; end if;
  if public.publish_item_image_if_current(item,t2,st3,k,1,'products/'||t2||'/new.webp','https://images.luckystore1947.com/products/'||t2||'/new.webp','checksum') then
    raise exception '[FAIL] cross tenant'; end if;
  ok := public.publish_item_image_if_current(item,t,st,k,1,'products/'||t||'/new.webp','https://images.luckystore1947.com/products/'||t||'/new.webp','checksum');
  if not ok or (select image_version<>2 or image_checksum is distinct from 'checksum' from public.items where id=item) then
    raise exception '[FAIL] matching CAS/version/checksum'; end if;
  if public.publish_item_image_if_current(item,t,st,k,1,'products/'||t||'/new.webp','https://images.luckystore1947.com/products/'||t||'/new.webp','checksum') then
    raise exception '[FAIL] CAS replay'; end if;
  if (select image_version from public.items where id=item)<>2 then raise exception '[FAIL] replay incremented version'; end if;
  -- Same URL publication still advances once and preserves the supplied checksum.
  if not public.publish_item_image_if_current(item,t,st,'products/'||t||'/new.webp',2,'products/'||t||'/new.webp','https://images.luckystore1947.com/products/'||t||'/new.webp','checksum-2') then
    raise exception '[FAIL] same URL CAS'; end if;
  update public.items set image_url='https://legacy.example/product.jpg' where id=item;
  if (select image_key is not null or image_checksum is not null or image_version<>4 from public.items where id=item) then
    raise exception '[FAIL] external URL inherited stale provenance'; end if;
  insert into public.items(tenant_id,name,image_url) values(t,'External legacy','https://legacy.example/other.jpg') returning id into ext;
  if (select image_key is not null from public.items where id=ext) then raise exception '[FAIL] fabricated external key'; end if;
  update public.items set image_url='https://images.luckystore1947.com/products/../ambiguous.webp' where id=ext;
  if (select image_key is not null from public.items where id=ext) then raise exception '[FAIL] ambiguous URL fabricated a key'; end if;
  if has_function_privilege('authenticated','public.publish_item_image_if_current(uuid,uuid,uuid,text,bigint,text,text,text)','EXECUTE') then
    raise exception '[FAIL] browser CAS privilege'; end if;
  raise notice '[PASS] image CAS: match, replay, stale key/version, unrelated price/stock/name/description, tenant/store, arbitrary version, checksum and legacy URLs';
end $$;
rollback;
