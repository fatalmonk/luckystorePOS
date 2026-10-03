-- Canva Connect Phase 1. All writes and credential reads are server-only.
create table public.canva_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  store_id uuid not null references public.stores(id),
  user_id uuid not null references public.users(id),
  canva_user_id text,
  canva_team_id text,
  granted_scopes text[] not null default '{}',
  capability_state jsonb not null default '{}',
  status text not null default 'revoked' check (status in (
    'connected_ready','connected_missing_autofill','connected_missing_brand_template',
    'reauthorization_required','revoked')),
  access_token_expires_at timestamptz,
  generation bigint not null default 0 check (generation >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, store_id, user_id),
  unique (id, tenant_id, store_id, user_id)
);

create table public.canva_connection_credentials (
  connection_id uuid primary key references public.canva_connections(id) on delete cascade,
  encrypted_access_token text not null,
  encrypted_refresh_token text not null,
  key_version text not null,
  token_expires_at timestamptz not null,
  refresh_id uuid,
  refresh_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((refresh_id is null) = (refresh_started_at is null))
);

create table public.canva_oauth_states (
  state_hash text primary key check (state_hash ~ '^[a-f0-9]{64}$'),
  connection_id uuid not null references public.canva_connections(id) on delete cascade,
  generation bigint not null,
  encrypted_verifier text not null,
  key_version text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at <= created_at + interval '10 minutes')
);

create table public.canva_approved_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  store_id uuid not null references public.stores(id),
  canva_template_id text not null,
  name text not null,
  purpose text not null,
  expected_width integer not null check (expected_width > 0),
  expected_height integer not null check (expected_height > 0),
  expected_page_count integer not null check (expected_page_count > 0),
  expected_dataset_schema jsonb not null check (jsonb_typeof(expected_dataset_schema) = 'object'),
  enabled boolean not null default false,
  approved_by uuid not null references public.users(id),
  approved_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, store_id, canva_template_id),
  unique (id, tenant_id, store_id)
);

create table public.canva_product_designs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  store_id uuid not null references public.stores(id),
  user_id uuid not null references public.users(id),
  item_id uuid not null references public.items(id),
  connection_id uuid not null,
  canva_user_id text not null,
  canva_team_id text,
  approved_template_id uuid not null,
  asset_upload_job_id text,
  asset_id text,
  autofill_job_id text,
  design_id text,
  export_job_id text,
  source_image_key text,
  source_image_checksum text,
  source_image_version bigint not null check (source_image_version >= 0),
  previous_canonical_image_key text,
  pending_key text,
  pending_checksum text,
  pending_width integer check (pending_width > 0),
  pending_height integer check (pending_height > 0),
  pending_bytes bigint check (pending_bytes > 0),
  editor_correlation_state_hash text unique,
  consumed_return_jti text unique,
  returned_at timestamptz,
  status text not null default 'created' check (status in (
    'created','asset_uploading','asset_uploaded','autofilling','design_ready',
    'editing','returned','exporting','normalizing','pending_review','published',
    'rejected','failed','cancelled')),
  failure_stage text check (failure_stage in ('asset','autofill','editor','return','export','normalize','review','publish')),
  normalized_error_code text,
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  published_by uuid references public.users(id),
  published_at timestamptz,
  rejected_by uuid references public.users(id),
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (connection_id, tenant_id, store_id, user_id)
    references public.canva_connections(id, tenant_id, store_id, user_id),
  foreign key (approved_template_id, tenant_id, store_id)
    references public.canva_approved_templates(id, tenant_id, store_id)
);

create function public.canva_validate_scope() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
declare v_user uuid;
begin
  if tg_table_name = 'canva_approved_templates' then v_user := new.approved_by;
  else v_user := new.user_id; end if;
  if not exists (
    select 1 from public.users u join public.stores s on s.id = u.store_id and s.tenant_id = u.tenant_id
    where u.id = v_user and u.tenant_id = new.tenant_id and u.store_id = new.store_id
      and u.role in ('owner','manager','admin')
  ) then raise exception 'CANVA_SCOPE_DENIED'; end if;
  if tg_table_name = 'canva_product_designs' then
    if not exists (select 1 from public.items i join public.stock_levels sl on sl.item_id = i.id
      where i.id = new.item_id and i.tenant_id = new.tenant_id and sl.store_id = new.store_id)
    or not exists (select 1 from public.canva_approved_templates t
      where t.id = new.approved_template_id and t.enabled)
    or not exists (select 1 from public.canva_connections c
      where c.id = new.connection_id and c.status = 'connected_ready'
        and c.canva_user_id = new.canva_user_id and c.canva_team_id is not distinct from new.canva_team_id)
    then raise exception 'CANVA_SESSION_DENIED'; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger canva_connections_scope before insert or update on public.canva_connections
for each row execute function public.canva_validate_scope();
create trigger canva_templates_scope before insert or update on public.canva_approved_templates
for each row execute function public.canva_validate_scope();
create trigger canva_designs_scope before insert or update on public.canva_product_designs
for each row execute function public.canva_validate_scope();

alter table public.canva_connections enable row level security;
alter table public.canva_connection_credentials enable row level security;
alter table public.canva_oauth_states enable row level security;
alter table public.canva_approved_templates enable row level security;
alter table public.canva_product_designs enable row level security;
revoke all on public.canva_connections, public.canva_connection_credentials, public.canva_oauth_states,
  public.canva_approved_templates, public.canva_product_designs from public, anon, authenticated;
grant select on public.canva_connections, public.canva_approved_templates, public.canva_product_designs to authenticated;
grant all on public.canva_connections, public.canva_connection_credentials, public.canva_oauth_states,
  public.canva_approved_templates, public.canva_product_designs to service_role;

create policy canva_connections_read on public.canva_connections for select to authenticated using (
  exists (select 1 from public.users u where u.auth_id = auth.uid() and u.id = user_id
    and u.tenant_id = canva_connections.tenant_id and u.store_id = canva_connections.store_id
    and u.role in ('owner','manager','admin')));
create policy canva_templates_read on public.canva_approved_templates for select to authenticated using (
  exists (select 1 from public.users u where u.auth_id = auth.uid()
    and u.tenant_id = canva_approved_templates.tenant_id and u.store_id = canva_approved_templates.store_id
    and u.role in ('owner','manager','admin')));
create policy canva_designs_read on public.canva_product_designs for select to authenticated using (
  exists (select 1 from public.users u where u.auth_id = auth.uid() and u.id = user_id
    and u.tenant_id = canva_product_designs.tenant_id and u.store_id = canva_product_designs.store_id
    and u.role in ('owner','manager','admin')));

-- Single server-only transactional gate. Locks always begin with the connection
-- row, including disconnect and reconnect, to fence every in-flight operation.
create function public.canva_connection_transition(
  p_action text, p_user_id uuid, p_tenant_id uuid, p_store_id uuid, p_data jsonb default '{}'
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare c public.canva_connections; k public.canva_connection_credentials;
  s public.canva_oauth_states; v_result jsonb;
begin
  if not exists (select 1 from public.users u join public.stores st on st.id = u.store_id and st.tenant_id = u.tenant_id
    where u.id = p_user_id and u.tenant_id = p_tenant_id and u.store_id = p_store_id
      and u.role in ('owner','manager','admin')) then raise exception 'CANVA_SCOPE_DENIED'; end if;
  if p_action = 'start' then
    insert into public.canva_connections(tenant_id,store_id,user_id) values(p_tenant_id,p_store_id,p_user_id)
    on conflict (tenant_id,store_id,user_id) do nothing;
  end if;
  select * into c from public.canva_connections
  where user_id = p_user_id and tenant_id = p_tenant_id and store_id = p_store_id
    and (p_data->>'connection_id' is null or id = (p_data->>'connection_id')::uuid) for update;
  if c.id is null then return jsonb_build_object('result','missing'); end if;
  select * into k from public.canva_connection_credentials where connection_id = c.id for update;

  if p_action = 'start' then
    update public.canva_connections set generation = generation + 1, status = 'reauthorization_required',
      access_token_expires_at = null, capability_state = '{}' where id = c.id returning * into c;
    delete from public.canva_connection_credentials where connection_id = c.id;
    delete from public.canva_oauth_states where connection_id = c.id;
    insert into public.canva_oauth_states(state_hash,connection_id,generation,encrypted_verifier,key_version,expires_at)
    values(p_data->>'state_hash',c.id,c.generation,p_data->>'encrypted_verifier',p_data->>'key_version',now()+interval '5 minutes');
    return jsonb_build_object('result','started','connection_id',c.id,'generation',c.generation,
      'credentials',case when k.connection_id is null then null else to_jsonb(k) end);
  elsif p_action = 'consume' then
    select * into s from public.canva_oauth_states
    where state_hash = p_data->>'state_hash' and connection_id = c.id and generation = c.generation
      and consumed_at is null and expires_at > now() for update;
    if s.state_hash is null then return jsonb_build_object('result','invalid_state'); end if;
    update public.canva_oauth_states set consumed_at = now(), encrypted_verifier = 'consumed'
      where state_hash = s.state_hash;
    return jsonb_build_object('result','consumed','connection_id',c.id,'generation',c.generation,
      'encrypted_verifier',s.encrypted_verifier,'key_version',s.key_version);
  elsif p_action = 'disconnect' then
    update public.canva_connections set generation = generation + 1,status = 'revoked',
      access_token_expires_at = null, capability_state = '{}' where id = c.id;
    delete from public.canva_connection_credentials where connection_id = c.id;
    delete from public.canva_oauth_states where connection_id = c.id;
    return jsonb_build_object('result','revoked','connection_id',c.id,
      'credentials',case when k.connection_id is null then null else to_jsonb(k) end);
  elsif p_action = 'claim' then
    if c.status <> 'connected_ready' or k.connection_id is null
      or (c.capability_state->'capabilities' @> '["autofill","brand_template"]'::jsonb) is not true
      or not (c.granted_scopes @> array['profile:read','asset:write','design:content:read','design:content:write','design:meta:read','brandtemplate:meta:read','brandtemplate:content:read']) then
      if c.status = 'connected_ready' then
        delete from public.canva_connection_credentials where connection_id = c.id;
        update public.canva_connections set status = 'reauthorization_required',generation = generation+1,
          access_token_expires_at = null where id = c.id;
      end if;
      return jsonb_build_object('result','reauthorization_required');
    end if;
    if k.refresh_id is not null then
      if k.refresh_started_at < now() - interval '60 seconds' then
        -- Never reuse a possibly consumed refresh token after worker death.
        delete from public.canva_connection_credentials where connection_id = c.id;
        update public.canva_connections set status = 'reauthorization_required', generation = generation+1,
          access_token_expires_at = null where id = c.id;
        return jsonb_build_object('result','reauthorization_required');
      end if;
      return jsonb_build_object('result','busy');
    end if;
    if k.token_expires_at > now() + interval '90 seconds' then
      return jsonb_build_object('result','valid','generation',c.generation,'credentials',to_jsonb(k));
    end if;
    update public.canva_connection_credentials set refresh_id = (p_data->>'refresh_id')::uuid,
      refresh_started_at = now(),updated_at = now() where connection_id = c.id returning * into k;
    return jsonb_build_object('result','claimed','generation',c.generation,'credentials',to_jsonb(k));
  elsif p_action in ('complete','rotate','fail','invalidate') then
    if c.generation <> (p_data->>'generation')::bigint or p_data->>'generation' is null then
      return jsonb_build_object('result','superseded');
    end if;
    if p_action = 'invalidate' then
      delete from public.canva_connection_credentials where connection_id = c.id;
      update public.canva_connections set status = 'reauthorization_required', generation = generation+1,
        access_token_expires_at = null where id = c.id;
      return jsonb_build_object('result','reauthorization_required');
    elsif p_action = 'complete' then
      if not exists (select 1 from public.canva_oauth_states where connection_id = c.id
        and generation = c.generation and state_hash = p_data->>'state_hash' and consumed_at is not null)
        or k.connection_id is not null or c.status <> 'reauthorization_required'
      then return jsonb_build_object('result','superseded'); end if;
    elsif k.refresh_id is distinct from (p_data->>'refresh_id')::uuid or k.refresh_id is null then
      return jsonb_build_object('result','superseded');
    end if;
    if p_action = 'fail' then
      delete from public.canva_connection_credentials where connection_id = c.id;
      update public.canva_connections set status = 'reauthorization_required',generation = generation+1,
        access_token_expires_at = null where id = c.id;
      return jsonb_build_object('result','reauthorization_required');
    end if;
    insert into public.canva_connection_credentials(connection_id,encrypted_access_token,encrypted_refresh_token,key_version,token_expires_at)
    values(c.id,p_data->>'encrypted_access_token',p_data->>'encrypted_refresh_token',p_data->>'key_version',(p_data->>'expires_at')::timestamptz)
    on conflict(connection_id) do update set encrypted_access_token=excluded.encrypted_access_token,
      encrypted_refresh_token=excluded.encrypted_refresh_token,key_version=excluded.key_version,
      token_expires_at=excluded.token_expires_at,refresh_id=null,refresh_started_at=null,updated_at=now();
    update public.canva_connections set access_token_expires_at=(p_data->>'expires_at')::timestamptz,
      granted_scopes=array(select jsonb_array_elements_text(p_data->'scopes')),
      canva_user_id=coalesce(p_data->>'canva_user_id',canva_user_id),
      canva_team_id=case when p_action='complete' then p_data->>'canva_team_id' else canva_team_id end,
      capability_state=coalesce(p_data->'capability_state',capability_state),
      status=coalesce(p_data->>'status',status) where id=c.id returning * into c;
    if p_action='complete' then delete from public.canva_oauth_states where connection_id=c.id; end if;
    return jsonb_build_object('result','saved','connection',to_jsonb(c));
  end if;
  raise exception 'CANVA_INVALID_ACTION';
end $$;
revoke all on function public.canva_connection_transition(text,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.canva_connection_transition(text,uuid,uuid,uuid,jsonb) to service_role;
revoke all on function public.canva_validate_scope() from public,anon,authenticated;
