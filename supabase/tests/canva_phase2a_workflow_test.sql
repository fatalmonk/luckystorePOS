-- Caller must install the migration and wrap this proof in a disposable-only rollback.
do $$
declare c public.canva_connections; t uuid; item uuid; r jsonb; again jsonb; claim jsonb;
 req uuid:=gen_random_uuid(); lease uuid:=gen_random_uuid(); run uuid;
begin
 select cc.* into c from public.canva_connections cc join public.tenants t on t.id=cc.tenant_id
 where t.name='Canva OAuth acceptance test' and cc.status='connected_ready';
 if not found then raise exception 'READY_DISPOSABLE_CONNECTION_REQUIRED'; end if;
 perform set_config('request.jwt.claim.sub',c.user_id::text,true);
 insert into public.items(tenant_id,name,price,image_url) values(c.tenant_id,'Phase 2A SQL fixture',50,
  'https://images.luckystore1947.com/products/test.webp') returning id into item;
 insert into public.stock_levels(store_id,item_id,qty) values(c.store_id,item,0);
 insert into public.canva_approved_templates(tenant_id,store_id,canva_template_id,name,purpose,
  expected_width,expected_height,expected_page_count,expected_dataset_schema,enabled,approved_by,approved_at)
 values(c.tenant_id,c.store_id,'proof-'||req,'Proof','SQL proof',1080,1350,1,
  '{"product_1_image":{"type":"image"},"product_1_name":{"type":"text"},"product_1_price":{"type":"text"}}',true,c.user_id,now()) returning id into t;
 r:=public.canva_run_transition('start',c.user_id,c.tenant_id,c.store_id,
  jsonb_build_object('request_id',req,'template_id',t,'item_ids',jsonb_build_array(item)));
 run:=(r->>'id')::uuid;
 if r->'products'->0->>'name'<>'Phase 2A SQL fixture' or (r->'products'->0->>'price')::numeric<>50 then raise exception 'SNAPSHOT_FAILED'; end if;
 again:=public.canva_run_transition('start',c.user_id,c.tenant_id,c.store_id,
  jsonb_build_object('request_id',req,'template_id',t,'item_ids',jsonb_build_array(item)));
 if again->>'id'<>run::text then raise exception 'IDEMPOTENCY_FAILED'; end if;
 begin
  perform public.canva_run_transition('start',c.user_id,c.tenant_id,c.store_id,
   jsonb_build_object('request_id',req,'template_id',t,'item_ids',jsonb_build_array(gen_random_uuid())));
  raise exception 'CONFLICT_ACCEPTED';
 exception when raise_exception then if sqlerrm<>'CANVA_REQUEST_CONFLICT' then raise; end if; end;
 begin
  perform public.canva_run_transition('start',c.user_id,c.tenant_id,gen_random_uuid(),
   jsonb_build_object('request_id',req,'template_id',t,'item_ids',jsonb_build_array(item)));
  raise exception 'FOREIGN_STORE_ACCEPTED';
 exception when raise_exception then if sqlerrm<>'CANVA_SCOPE_DENIED' then raise; end if; end;
 begin
  perform public.canva_run_transition('start',c.user_id,c.tenant_id,c.store_id,
   jsonb_build_object('request_id',gen_random_uuid(),'template_id',t,'item_ids',jsonb_build_array(gen_random_uuid())));
  raise exception 'FOREIGN_ITEM_ACCEPTED';
 exception when raise_exception then if sqlerrm<>'CANVA_PRODUCTS_DENIED' then raise; end if; end;
 claim:=public.canva_run_transition('claim',c.user_id,c.tenant_id,c.store_id,jsonb_build_object('run_id',run,'lease_id',lease));
 if claim->>'result'<>'claimed' then raise exception 'CLAIM_FAILED'; end if;
 again:=public.canva_run_transition('claim',c.user_id,c.tenant_id,c.store_id,jsonb_build_object('run_id',run,'lease_id',gen_random_uuid()));
 if again->>'result'<>'busy' then raise exception 'CONCURRENT_CLAIM_FAILED'; end if;
 begin
  perform public.canva_run_transition('save',c.user_id,c.tenant_id,c.store_id,
   jsonb_build_object('run_id',run,'lease_id',gen_random_uuid(),'status','design_ready','assets','[]'::jsonb));
  raise exception 'STALE_LEASE_ACCEPTED';
 exception when raise_exception then if sqlerrm<>'CANVA_FLOW_SUPERSEDED' then raise; end if; end;
 update public.canva_design_runs set lease_started_at=now()-interval '61 seconds' where id=run;
 perform public.canva_run_transition('claim',c.user_id,c.tenant_id,c.store_id,jsonb_build_object('run_id',run,'lease_id',gen_random_uuid()));
 if not exists(select 1 from public.canva_design_runs where id=run and status='failed' and error_code='CANVA_OUTCOME_UNKNOWN') then raise exception 'ABANDONED_RETRIED'; end if;
 perform set_config('canva.proof_user',c.user_id::text,true);
 perform set_config('canva.proof_run',run::text,true);
end $$;
set local role authenticated;
do $$ begin
 if not exists(select 1 from public.canva_design_runs where id=current_setting('canva.proof_run')::uuid) then raise exception 'OWN_RUN_HIDDEN'; end if;
 begin
  insert into public.canva_design_runs(id) values(gen_random_uuid());
  raise exception 'BROWSER_WRITE_ACCEPTED';
 exception when insufficient_privilege then null; end;
 if has_function_privilege('authenticated','public.canva_run_transition(text,uuid,uuid,uuid,jsonb)','execute') then raise exception 'BROWSER_RPC_PRIVILEGE'; end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 if exists(select 1 from public.canva_design_runs where id=current_setting('canva.proof_run')::uuid) then raise exception 'FOREIGN_RUN_VISIBLE'; end if;
end $$;
reset role;
