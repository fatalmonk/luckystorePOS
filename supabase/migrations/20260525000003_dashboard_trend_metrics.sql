create or replace function get_monthly_trend_metrics(p_store_id uuid)
returns json as $$
declare
  result json;
  v_sales_now numeric;
  v_sales_prev numeric;
  v_purch_now numeric;
  v_purch_prev numeric;
  v_exp_now numeric;
  v_exp_prev numeric;
begin
  -- Sales
  select coalesce(sum(total_amount), 0) into v_sales_now 
  from sales 
  where store_id = p_store_id and status = 'completed' 
    and date_trunc('month', created_at) = date_trunc('month', current_date);
    
  select coalesce(sum(total_amount), 0) into v_sales_prev 
  from sales 
  where store_id = p_store_id and status = 'completed' 
    and date_trunc('month', created_at) = date_trunc('month', current_date - interval '1 month');

  -- Purchases
  select coalesce(sum(amount), 0) into v_purch_now 
  from expenses 
  where store_id = p_store_id and category = 'Stock Purchase' 
    and date_trunc('month', expense_date) = date_trunc('month', current_date);

  select coalesce(sum(amount), 0) into v_purch_prev 
  from expenses 
  where store_id = p_store_id and category = 'Stock Purchase' 
    and date_trunc('month', expense_date) = date_trunc('month', current_date - interval '1 month');

  -- Expenses
  select coalesce(sum(amount), 0) into v_exp_now 
  from expenses 
  where store_id = p_store_id and coalesce(category, '') != 'Stock Purchase' 
    and date_trunc('month', expense_date) = date_trunc('month', current_date);

  select coalesce(sum(amount), 0) into v_exp_prev 
  from expenses 
  where store_id = p_store_id and coalesce(category, '') != 'Stock Purchase' 
    and date_trunc('month', expense_date) = date_trunc('month', current_date - interval '1 month');

  select json_build_object(
    'sales', json_build_object(
       'amount', v_sales_now,
       'trend', case when v_sales_prev = 0 then (case when v_sales_now > 0 then 100 else 0 end) else round(((v_sales_now - v_sales_prev) / v_sales_prev * 100), 2) end
    ),
    'purchase', json_build_object(
       'amount', v_purch_now,
       'trend', case when v_purch_prev = 0 then (case when v_purch_now > 0 then 100 else 0 end) else round(((v_purch_now - v_purch_prev) / v_purch_prev * 100), 2) end
    ),
    'expense', json_build_object(
       'amount', v_exp_now,
       'trend', case when v_exp_prev = 0 then (case when v_exp_now > 0 then 100 else 0 end) else round(((v_exp_now - v_exp_prev) / v_exp_prev * 100), 2) end
    )
  ) into result;

  return result;
end;
$$ language plpgsql security definer;
