-- Multi-product Phase 2A runs. No editor return, export or canonical-image writes.
create table public.canva_design_runs (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id),
 store_id uuid not null references public.stores(id),
 user_id uuid not null references public.users(id),
 connection_id uuid not null,
 connection_generation bigint not null,
 template_id uuid not null,
 request_id uuid not null,
 products jsonb not null check(jsonb_typeof(products)='array' and jsonb_array_length(products) between 1 and 5),
 assets jsonb not null default '[]' check(jsonb_typeof(assets)='array'),
 status text not null default 'created' check(status in ('created','asset_uploading','autofilling','design_ready','failed')),
 autofill_job_id text,
 design_id text,
 error_code text,
 lease_id uuid,
 lease_started_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id,request_id),
 foreign key(connection_id,tenant_id,store_id,user_id) references public.canva_connections(id,tenant_id,store_id,user_id),
 foreign key(template_id,tenant_id,store_id) references public.canva_approved_templates(id,tenant_id,store_id)
);
alter table public.canva_design_runs enable row level security;
revoke all on public.canva_design_runs from public,anon,authenticated;
grant select on public.canva_design_runs to authenticated;
grant all on public.canva_design_runs to service_role;
create policy canva_runs_owned on public.canva_design_runs for select to authenticated using (
 exists(select 1 from public.users u where u.auth_id=auth.uid() and u.id=user_id
 and u.tenant_id=canva_design_runs.tenant_id and u.store_id=canva_design_runs.store_id
 and u.role in ('owner','manager','admin'))
);

create function public.canva_run_transition(p_action text,p_user_id uuid,p_tenant_id uuid,p_store_id uuid,p_data jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare c public.canva_connections; t public.canva_approved_templates; r public.canva_design_runs;
 ids uuid[]; products jsonb; expected jsonb; slot integer; field text; kind text;
begin
 if not exists(select 1 from public.users u join public.stores s on s.id=u.store_id and s.tenant_id=u.tenant_id
 where u.id=p_user_id and u.tenant_id=p_tenant_id and u.store_id=p_store_id and u.role in ('owner','manager','admin'))
 then raise exception 'CANVA_SCOPE_DENIED'; end if;
 select * into c from public.canva_connections where user_id=p_user_id and tenant_id=p_tenant_id and store_id=p_store_id for update;
 if not found or c.status<>'connected_ready' then raise exception 'CANVA_REAUTHORIZATION_REQUIRED'; end if;
 if p_action='start' then
  select * into r from public.canva_design_runs where user_id=p_user_id and request_id=(p_data->>'request_id')::uuid;
  if found then
   if r.template_id<>(p_data->>'template_id')::uuid or
    (select jsonb_agg(x->>'id' order by ord) from jsonb_array_elements(r.products) with ordinality q(x,ord))<>p_data->'item_ids'
   then raise exception 'CANVA_REQUEST_CONFLICT'; end if;
   return to_jsonb(r)-'lease_id';
  end if;
  select * into t from public.canva_approved_templates where id=(p_data->>'template_id')::uuid and tenant_id=p_tenant_id and store_id=p_store_id and enabled;
  if not found then raise exception 'CANVA_TEMPLATE_DENIED'; end if;
  select array_agg(value::uuid order by ord) into ids from jsonb_array_elements_text(p_data->'item_ids') with ordinality q(value,ord);
  if coalesce(cardinality(ids),0) not between 1 and 5 or cardinality(ids)<>(select count(distinct x) from unnest(ids) x)
  then raise exception 'CANVA_PRODUCTS_INVALID'; end if;
  expected:='{}'::jsonb;
  for slot in 1..cardinality(ids) loop
   foreach field in array array['image','name','price'] loop
    kind:=case when field='image' then 'image' else 'text' end;
    expected:=expected||jsonb_build_object('product_'||slot||'_'||field,jsonb_build_object('type',kind));
   end loop;
  end loop;
  if t.expected_dataset_schema<>expected then raise exception 'CANVA_TEMPLATE_DATASET_MISMATCH'; end if;
  select jsonb_agg(jsonb_build_object('id',i.id,'name',i.name,'price',i.price,'image_url',i.image_url,
    'image_key',i.image_key,'image_version',i.image_version,'image_checksum',i.image_checksum) order by q.ord)
   into products from unnest(ids) with ordinality q(id,ord) join public.items i on i.id=q.id
   where i.tenant_id=p_tenant_id and i.is_active is distinct from false and i.price>=0 and length(i.name) between 1 and 180
    and i.image_url is not null and exists(select 1 from public.stock_levels sl where sl.item_id=i.id and sl.store_id=p_store_id);
  if coalesce(jsonb_array_length(products),0)<>cardinality(ids) then raise exception 'CANVA_PRODUCTS_DENIED'; end if;
  insert into public.canva_design_runs(tenant_id,store_id,user_id,connection_id,connection_generation,template_id,request_id,products)
   values(p_tenant_id,p_store_id,p_user_id,c.id,c.generation,t.id,(p_data->>'request_id')::uuid,products) returning * into r;
  return to_jsonb(r)-'lease_id';
 end if;
 select * into r from public.canva_design_runs where id=(p_data->>'run_id')::uuid and user_id=p_user_id and tenant_id=p_tenant_id and store_id=p_store_id for update;
 if not found then raise exception 'CANVA_RUN_DENIED'; end if;
 if r.connection_generation<>c.generation or not exists(select 1 from public.canva_approved_templates where id=r.template_id and enabled)
 then raise exception 'CANVA_FLOW_SUPERSEDED'; end if;
 if not exists(select 1 from public.canva_approved_templates approved where approved.id=r.template_id
  and approved.expected_dataset_schema=(select jsonb_object_agg('product_'||sidx||'_'||fname,
   jsonb_build_object('type',case when fname='image' then 'image' else 'text' end))
   from generate_series(1,jsonb_array_length(r.products)) sidx cross join unnest(array['image','name','price']) fname))
 then raise exception 'CANVA_TEMPLATE_DATASET_MISMATCH'; end if;
 if p_action='claim' and exists(select 1 from jsonb_array_elements(r.products) p where not exists(
  select 1 from public.items i join public.stock_levels sl on sl.item_id=i.id
  where i.id=(p->>'id')::uuid and i.tenant_id=p_tenant_id and sl.store_id=p_store_id
   and i.image_version=(p->>'image_version')::bigint
   and i.image_key is not distinct from p->>'image_key'
   and i.image_url is not distinct from p->>'image_url'
   and i.image_checksum is not distinct from p->>'image_checksum'))
 then raise exception 'CANVA_SOURCE_CHANGED'; end if;
 if p_action='claim' then
  if r.status in ('design_ready','failed') then return jsonb_build_object('result','terminal','run',to_jsonb(r)-'lease_id'); end if;
  if r.lease_id is not null then
   if r.lease_started_at<now()-interval '60 seconds' then
    update public.canva_design_runs set status='failed',error_code='CANVA_OUTCOME_UNKNOWN',lease_id=null,updated_at=now() where id=r.id;
    return jsonb_build_object('result','terminal');
   end if;
   return jsonb_build_object('result','busy');
  end if;
  update public.canva_design_runs set lease_id=(p_data->>'lease_id')::uuid,lease_started_at=now() where id=r.id returning * into r;
  select * into t from public.canva_approved_templates where id=r.template_id;
  return jsonb_build_object('result','claimed','run',to_jsonb(r),'template',to_jsonb(t));
 elsif p_action='save' then
  if r.lease_id is distinct from (p_data->>'lease_id')::uuid then raise exception 'CANVA_FLOW_SUPERSEDED'; end if;
  update public.canva_design_runs set assets=p_data->'assets',status=p_data->>'status',
   autofill_job_id=p_data->>'autofill_job_id',design_id=p_data->>'design_id',error_code=p_data->>'error_code',
   lease_id=null,lease_started_at=null,updated_at=now() where id=r.id returning * into r;
  return to_jsonb(r)-'lease_id';
 end if;
 raise exception 'CANVA_ACTION_INVALID';
end $$;
revoke all on function public.canva_run_transition(text,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.canva_run_transition(text,uuid,uuid,uuid,jsonb) to service_role;
