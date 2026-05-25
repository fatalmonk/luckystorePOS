create or replace function get_cashflow_data(p_store_id uuid, p_days int)
returns json as $$
declare
  result json;
begin
  with date_series as (
    select generate_series(current_date - (p_days - 1) * interval '1 day', current_date, '1 day'::interval)::date as date
  ),
  daily_stats as (
    select 
      sale_date as date, 
      sum(total_sales) as money_in,
      sum(stock_purchase + daily_expense) as money_out
    from daily_sales
    where store_id = p_store_id
    group by sale_date
  )
  select json_agg(
    json_build_object(
      'day', to_char(ds.date, 'Mon DD'),
      'income', coalesce(s.money_in, 0),
      'outcome', coalesce(s.money_out, 0)
    )
  ) into result
  from date_series ds
  left join daily_stats s on ds.date = s.date;

  return coalesce(result, '[]'::json);
end;
$$ language plpgsql security definer;
