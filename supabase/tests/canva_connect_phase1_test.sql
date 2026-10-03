-- Standalone proof requires the Phase 1 migration on the disposable target.
begin;
do $$ begin
  if not (session_user = 'postgres.grxxenvdhfwzafzyykgo' or
    (session_user='postgres' and current_setting('application_name')='codex-disposable-grxxenvdhfwzafzyykgo'))
  then raise exception 'DISPOSABLE_PROJECT_REQUIRED'; end if;
end $$;

do $$
declare t uuid; t2 uuid; st uuid; st2 uuid; st3 uuid; u uuid; u2 uuid; u3 uuid; u4 uuid; auth_user uuid; c uuid;
  r jsonb; generation bigint; refresh uuid := gen_random_uuid(); template uuid; item uuid;
  scopes jsonb := '["profile:read","asset:write","design:content:read","design:content:write","design:meta:read","brandtemplate:meta:read","brandtemplate:content:read"]';
begin
  insert into public.tenants(name) values('Canva proof') returning id into t;
  insert into public.tenants(name) values('Canva other tenant') returning id into t2;
  insert into public.stores(tenant_id,name,code) values(t,'Canva store','CANVA-'||t) returning id into st;
  insert into public.stores(tenant_id,name,code) values(t2,'Other store','CANVA-'||t2) returning id into st2;
  insert into public.stores(tenant_id,name,code) values(t,'Same tenant other store','CANVA-OTHER-'||t) returning id into st3;
  insert into auth.users(id,email) values(gen_random_uuid(),'canva-proof-'||t||'@example.test') returning id into auth_user;
  insert into public.users(id,auth_id,email,role,tenant_id,store_id)
    values(auth_user,auth_user,'canva-proof-'||t||'@example.test','manager',t,st) returning id into u;
  insert into auth.users(id,email) values(gen_random_uuid(),'canva-other-'||t2||'@example.test') returning id into u2;
  insert into public.users(id,auth_id,email,role,tenant_id,store_id)
    values(u2,u2,'canva-other-'||t2||'@example.test','manager',t2,st2);
  insert into auth.users(id,email) values(gen_random_uuid(),'canva-store-'||t||'@example.test') returning id into u3;
  insert into public.users(id,auth_id,email,role,tenant_id,store_id)
    values(u3,u3,'canva-store-'||t||'@example.test','manager',t,st3);
  insert into auth.users(id,email) values(gen_random_uuid(),'canva-peer-'||t||'@example.test') returning id into u4;
  insert into public.users(id,auth_id,email,role,tenant_id,store_id)
    values(u4,u4,'canva-peer-'||t||'@example.test','manager',t,st);
  r := public.canva_connection_transition('start',u,t,st,jsonb_build_object('state_hash',repeat('a',64),'encrypted_verifier','test-ciphertext','key_version','test'));
  c := (r->>'connection_id')::uuid; generation := (r->>'generation')::bigint;
  if c is null then raise exception '[FAIL] start'; end if;
  if public.canva_connection_transition('consume',u2,t2,st2,jsonb_build_object('state_hash',repeat('a',64)))->>'result'='consumed' then
    raise exception '[FAIL] cross tenant state'; end if;
  begin
    perform public.canva_connection_transition('consume',u,t,st2,'{}');
    raise exception '[FAIL] cross store actor accepted';
  exception when raise_exception then if sqlerrm<>'CANVA_SCOPE_DENIED' then raise; end if; end;
  if public.canva_connection_transition('consume',u,t,st,jsonb_build_object('state_hash',repeat('b',64)))->>'result'<>'invalid_state' then
    raise exception '[FAIL] state mismatch'; end if;
  update public.canva_oauth_states set expires_at=now()-interval '1 second' where connection_id=c;
  if public.canva_connection_transition('consume',u,t,st,jsonb_build_object('state_hash',repeat('a',64)))->>'result'<>'invalid_state' then
    raise exception '[FAIL] expired state'; end if;
  update public.canva_oauth_states set expires_at=now()+interval '1 minute' where connection_id=c;
  r := public.canva_connection_transition('consume',u,t,st,jsonb_build_object('state_hash',repeat('a',64)));
  if r->>'result'<>'consumed' then raise exception '[FAIL] state consumption'; end if;
  if public.canva_connection_transition('consume',u,t,st,jsonb_build_object('state_hash',repeat('a',64)))->>'result'<>'invalid_state' then
    raise exception '[FAIL] state replay'; end if;
  r := public.canva_connection_transition('complete',u,t,st,jsonb_build_object(
    'generation',generation,'state_hash',repeat('a',64),'encrypted_access_token','encrypted-access',
    'encrypted_refresh_token','encrypted-refresh','key_version','test','expires_at',now()+interval '1 hour',
    'scopes',scopes,'canva_user_id','canva-test-user','canva_team_id','canva-test-team',
    'capability_state',jsonb_build_object('capabilities',jsonb_build_array('autofill','brand_template')),'status','connected_ready'));
  if r->>'result'<>'saved' then raise exception '[FAIL] complete'; end if;
  if public.canva_connection_transition('claim',u,t,st,jsonb_build_object('connection_id',c,'refresh_id',refresh))->>'result'<>'valid' then
    raise exception '[FAIL] valid credentials'; end if;
  update public.canva_connection_credentials set token_expires_at=now() where connection_id=c;
  if public.canva_connection_transition('claim',u,t,st,jsonb_build_object('connection_id',c,'refresh_id',refresh))->>'result'<>'claimed' then
    raise exception '[FAIL] expired refresh claim'; end if;
  if public.canva_connection_transition('claim',u,t,st,jsonb_build_object('connection_id',c,'refresh_id',gen_random_uuid()))->>'result'<>'busy' then
    raise exception '[FAIL] concurrent refresh must be busy'; end if;
  r := public.canva_connection_transition('rotate',u,t,st,jsonb_build_object('connection_id',c,'generation',generation,'refresh_id',refresh,
    'encrypted_access_token','rotated-access','encrypted_refresh_token','rotated-refresh','key_version','test',
    'expires_at',now()+interval '1 hour','scopes',scopes));
  if r->>'result'<>'saved' or (select encrypted_refresh_token is distinct from 'rotated-refresh' or refresh_id is not null from public.canva_connection_credentials where connection_id=c)
  then raise exception '[FAIL] transactional token rotation'; end if;

  insert into public.canva_approved_templates(tenant_id,store_id,canva_template_id,name,purpose,expected_width,expected_height,
    expected_page_count,expected_dataset_schema,enabled,approved_by,approved_at)
  values(t,st,'allowlisted-template','Proof','product image',1024,1024,1,'{}',true,u,now()) returning id into template;
  insert into public.items(tenant_id,name) values(t,'Canva session item') returning id into item;
  insert into public.stock_levels(store_id,item_id,qty) values(st,item,1);
  begin
    insert into public.canva_product_designs(tenant_id,store_id,user_id,item_id,connection_id,canva_user_id,canva_team_id,approved_template_id,source_image_version)
    values(t,st,u,item,c,'canva-test-user','canva-test-team',gen_random_uuid(),0);
    raise exception '[FAIL] arbitrary template';
  exception when foreign_key_violation then null;
    when raise_exception then if sqlerrm<>'CANVA_SESSION_DENIED' then raise; end if; end;
  insert into public.canva_product_designs(tenant_id,store_id,user_id,item_id,connection_id,canva_user_id,canva_team_id,approved_template_id,source_image_version)
    values(t,st,u,item,c,'canva-test-user','canva-test-team',template,0);

  -- Actual authenticated role reads and privilege checks, not service-role RLS simulation.
  perform set_config('request.jwt.claim.sub',auth_user::text,true);
  set local role authenticated;
  if (select count(*) from public.canva_connections)<>1 then raise exception '[FAIL] own connection RLS'; end if;
  if (select count(*) from public.canva_approved_templates)<>1 then raise exception '[FAIL] own template RLS'; end if;
  if (select count(*) from public.canva_product_designs)<>1 then raise exception '[FAIL] own session RLS'; end if;
  begin perform * from public.canva_connection_credentials; raise exception '[FAIL] credential SELECT';
  exception when insufficient_privilege then null; end;
  begin delete from public.canva_connection_credentials; raise exception '[FAIL] credential DELETE';
  exception when insufficient_privilege then null; end;
  begin insert into public.canva_connection_credentials(connection_id,encrypted_access_token,encrypted_refresh_token,key_version,token_expires_at)
    values(c,'plain','plain','test',now()); raise exception '[FAIL] credential INSERT';
  exception when insufficient_privilege then null; end;
  begin update public.canva_connection_credentials set encrypted_refresh_token='plain'; raise exception '[FAIL] credential UPDATE';
  exception when insufficient_privilege then null; end;
  reset role;
  perform set_config('request.jwt.claim.sub',u2::text,true);
  set local role authenticated;
  if exists(select 1 from public.canva_connections) or exists(select 1 from public.canva_approved_templates) then
    raise exception '[FAIL] foreign identity RLS'; end if;
  reset role;
  perform set_config('request.jwt.claim.sub',u3::text,true);
  set local role authenticated;
  if exists(select 1 from public.canva_connections) or exists(select 1 from public.canva_approved_templates)
    or exists(select 1 from public.canva_product_designs) then raise exception '[FAIL] same tenant cross store RLS'; end if;
  reset role;
  perform set_config('request.jwt.claim.sub',u4::text,true);
  set local role authenticated;
  if exists(select 1 from public.canva_connections) or exists(select 1 from public.canva_product_designs)
    then raise exception '[FAIL] same store other user ownership'; end if;
  if (select count(*) from public.canva_approved_templates)<>1 then raise exception '[FAIL] allowlist shared within authorized store'; end if;
  reset role;
  update public.users set role='stock' where id=u4;
  set local role authenticated;
  if exists(select 1 from public.canva_approved_templates) then raise exception '[FAIL] unauthorized role template RLS'; end if;
  reset role;
  if has_function_privilege('authenticated','public.canva_connection_transition(text,uuid,uuid,uuid,jsonb)','EXECUTE') then
    raise exception '[FAIL] browser transition privilege'; end if;
  r := public.canva_connection_transition('disconnect',u,t,st,'{}');
  if r->>'result'<>'revoked' or exists(select 1 from public.canva_connection_credentials where connection_id=c) then
    raise exception '[FAIL] disconnect invalidation'; end if;
  if public.canva_connection_transition('rotate',u,t,st,jsonb_build_object('connection_id',c,'generation',generation,'refresh_id',refresh))->>'result'<>'superseded' then
    raise exception '[FAIL] disconnect fencing'; end if;
  r := public.canva_connection_transition('start',u,t,st,jsonb_build_object('state_hash',repeat('c',64),'encrypted_verifier','test-ciphertext','key_version','test'));
  generation := (r->>'generation')::bigint;
  perform public.canva_connection_transition('consume',u,t,st,jsonb_build_object('state_hash',repeat('c',64)));
  perform public.canva_connection_transition('complete',u,t,st,jsonb_build_object(
    'generation',generation,'state_hash',repeat('c',64),'encrypted_access_token','encrypted-access',
    'encrypted_refresh_token','encrypted-refresh','key_version','test','expires_at',now(),
    'scopes',scopes,'canva_user_id','canva-test-user','canva_team_id','canva-test-team',
    'capability_state',jsonb_build_object('capabilities',jsonb_build_array('autofill','brand_template')),'status','connected_ready'));
  perform public.canva_connection_transition('claim',u,t,st,jsonb_build_object('connection_id',c,'refresh_id',refresh));
  update public.canva_connection_credentials set refresh_started_at=now()-interval '61 seconds' where connection_id=c;
  r := public.canva_connection_transition('claim',u,t,st,jsonb_build_object('connection_id',c,'refresh_id',gen_random_uuid()));
  if r->>'result'<>'reauthorization_required'
    or exists(select 1 from public.canva_connection_credentials where connection_id=c)
    then raise exception '[FAIL] abandoned refresh lineage was reused'; end if;
  r := public.canva_connection_transition('start',u,t,st,jsonb_build_object('state_hash',repeat('d',64),'encrypted_verifier','test-ciphertext','key_version','test'));
  generation := (r->>'generation')::bigint;
  perform public.canva_connection_transition('consume',u,t,st,jsonb_build_object('state_hash',repeat('d',64)));
  perform public.canva_connection_transition('complete',u,t,st,jsonb_build_object(
    'generation',generation,'state_hash',repeat('d',64),'encrypted_access_token','encrypted-access',
    'encrypted_refresh_token','encrypted-refresh','key_version','test','expires_at',now()+interval '1 hour',
    'scopes',scopes,'canva_user_id','canva-test-user','canva_team_id','canva-test-team',
    'capability_state','{}'::jsonb,'status','connected_ready'));
  r := public.canva_connection_transition('claim',u,t,st,jsonb_build_object('connection_id',c,'refresh_id',refresh));
  if r->>'result'<>'reauthorization_required'
    or exists(select 1 from public.canva_connection_credentials where connection_id=c)
    then raise exception '[FAIL] unknown capabilities were accepted'; end if;
  if (select image_version from public.items where id=item)<>0 then raise exception '[FAIL] Canva changed image'; end if;
  raise notice '[PASS] Canva SQL: scope, expired/mismatched/replayed state, credential ACL, real RLS, allowlist, refresh claim/rotation and disconnect fencing';
end $$;
rollback;
