create or replace function get_retail_kpis(p_store_id uuid, p_days integer default 30)
returns json as $$
declare
  result json;
begin
  with sale_stats as (
    select 
      s.id,
      s.total_amount,
      coalesce(sum(si.qty), 0) as total_items,
      coalesce(sum(si.cost * si.qty), 0) as total_cogs
    from sales s
    left join sale_items si on si.sale_id = s.id
    where s.store_id = p_store_id
      and s.status = 'completed'
      and s.created_at >= (now() - (p_days || ' days')::interval)
    group by s.id, s.total_amount
  )
  select json_build_object(
    'atv', case when count(id) > 0 then sum(total_amount)::numeric / count(id) else 0 end,
    'upt', case when count(id) > 0 then sum(total_items)::numeric / count(id) else 0 end,
    'gross_margin_pct', case 
      when sum(total_amount) > 0 
      then ((sum(total_amount) - sum(total_cogs))::numeric / sum(total_amount)::numeric) * 100 
      else 0 
    end,
    'total_transactions', count(id)
  ) into result
  from sale_stats;
  
  return result;
end;
$$ language plpgsql;
