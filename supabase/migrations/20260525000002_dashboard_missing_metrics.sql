create or replace function get_dashboard_missing_metrics(p_store_id uuid)
returns json as $$
declare
  result json;
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id from stores where id = p_store_id;

  select json_build_object(
    'toReceive', coalesce((
       select sum(current_balance) from parties 
       where tenant_id = v_tenant_id and type = 'customer' and current_balance > 0
    ), 0),
    'toGive', coalesce((
       select sum(current_balance) from parties 
       where tenant_id = v_tenant_id and type = 'supplier' and current_balance > 0
    ), 0),
    'totalBalance', coalesce((
       select sum(debit_amount - credit_amount) from ledger_entries le
       join ledger_accounts la on la.id = le.account_id
       where le.store_id = p_store_id and (la.name ilike '%cash%' or la.name ilike '%bank%' or la.name ilike '%bkash%')
    ), 0)
  ) into result;
  
  return result;
end;
$$ language plpgsql security definer;
