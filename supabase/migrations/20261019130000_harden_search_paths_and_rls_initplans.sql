-- Migration: 20261019130000_harden_search_paths_and_rls_initplans.sql
-- Description: Hardens function search_path, revokes anon privileges on maintenance RPCs,
--              enables RLS on rate_limits, sets security_invoker on stock ledger views,
--              drops duplicate index on sales, and eliminates all 44 auth_rls_initplan warnings
--              by caching (select auth.uid()).

-- 1. Lock search_path on mutable functions
ALTER FUNCTION public.extract_package_quantity(text) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.extract_package_quantity_numeric(text) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.get_retail_kpis(uuid, integer) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.handle_updated_at() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.normalize_bilingual_product_name(text) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.set_item_translations_updated_at() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.trg_fn_auto_assign_payment_method_ledger_account() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.trg_fn_sync_ledger_entry_columns() SET search_path = public, extensions, pg_temp;

-- 2. Ensure RLS on public tables and security_invoker on stock views
ALTER TABLE IF EXISTS public.rate_limits ENABLE ROW LEVEL SECURITY;

ALTER VIEW IF EXISTS public.v_stock_ledger_balance SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_stock_ledger_daily SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_stock_ledger_summary SET (security_invoker = true);

-- 3. Restrict internal maintenance RPCs from anonymous access
REVOKE EXECUTE ON FUNCTION public.clean_competitor_prices(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clean_competitor_prices(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.rematch_unmatched_competitor_prices(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rematch_unmatched_competitor_prices(uuid, integer) TO authenticated, service_role;

-- 4. Remove duplicate constraint and index on sales(sale_number)
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_receipt_number_key;

-- 5. Optimize 44 RLS policies (eliminate per-row auth.uid() re-evaluations)

ALTER POLICY "items_select_tenant_isolated" ON public."items" USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = (select auth.uid())) AND (u.tenant_id = items.tenant_id)))));

ALTER POLICY "reminders_select" ON public."reminders" USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = (select auth.uid())) AND (u.tenant_id = reminders.tenant_id)))));

ALTER POLICY "reminders_insert" ON public."reminders" WITH CHECK ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = (select auth.uid())) AND (u.tenant_id = reminders.tenant_id) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));

ALTER POLICY "Managers can delete daily_sales" ON public."daily_sales" USING (((store_id IN ( SELECT users.store_id
   FROM users
  WHERE (users.auth_id = (select auth.uid())))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = (select auth.uid())) AND (users.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));

ALTER POLICY "la_select" ON public."ledger_accounts" USING ((EXISTS ( SELECT 1
   FROM (stores s
     JOIN users u ON ((u.auth_id = (select auth.uid()))))
  WHERE ((s.id = ledger_accounts.store_id) AND (u.tenant_id = s.tenant_id) AND ((u.role = ANY (ARRAY['admin'::text, 'manager'::text])) OR (u.store_id = ledger_accounts.store_id))))));

ALTER POLICY "lb_select" ON public."ledger_batches" USING ((EXISTS ( SELECT 1
   FROM (stores s
     JOIN users u ON ((u.auth_id = (select auth.uid()))))
  WHERE ((s.id = ledger_batches.store_id) AND (u.tenant_id = s.tenant_id) AND ((u.role = ANY (ARRAY['admin'::text, 'manager'::text])) OR (u.store_id = ledger_batches.store_id))))));

ALTER POLICY "le_select" ON public."ledger_entries" USING ((EXISTS ( SELECT 1
   FROM ((ledger_batches lb
     JOIN stores s ON ((s.id = lb.store_id)))
     JOIN users u ON ((u.auth_id = (select auth.uid()))))
  WHERE ((lb.id = ledger_entries.batch_id) AND (u.tenant_id = s.tenant_id) AND ((u.role = ANY (ARRAY['admin'::text, 'manager'::text])) OR (u.store_id = lb.store_id))))));

ALTER POLICY "sales_select_cashier" ON public."sales" USING ((EXISTS ( SELECT 1
   FROM (stores s
     JOIN users u ON ((u.auth_id = (select auth.uid()))))
  WHERE ((s.id = sales.store_id) AND (u.tenant_id = s.tenant_id) AND (u.id = sales.cashier_id) AND (u.store_id = sales.store_id)))));

ALTER POLICY "sales_select_manager" ON public."sales" USING ((EXISTS ( SELECT 1
   FROM (stores s
     JOIN users u ON ((u.auth_id = (select auth.uid()))))
  WHERE ((s.id = sales.store_id) AND (u.tenant_id = s.tenant_id) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));

ALTER POLICY "si_select" ON public."sale_items" USING ((EXISTS ( SELECT 1
   FROM ((sales s
     JOIN stores st ON ((st.id = s.store_id)))
     JOIN users u ON ((u.auth_id = (select auth.uid()))))
  WHERE ((s.id = sale_items.sale_id) AND (u.tenant_id = st.tenant_id) AND ((u.role = ANY (ARRAY['admin'::text, 'manager'::text])) OR ((u.id = s.cashier_id) AND (u.store_id = s.store_id)))))));

ALTER POLICY "sp_select" ON public."sale_payments" USING ((EXISTS ( SELECT 1
   FROM ((sales s
     JOIN stores st ON ((st.id = s.store_id)))
     JOIN users u ON ((u.auth_id = (select auth.uid()))))
  WHERE ((s.id = sale_payments.sale_id) AND (u.tenant_id = st.tenant_id) AND ((u.role = ANY (ARRAY['admin'::text, 'manager'::text])) OR ((u.id = s.cashier_id) AND (u.store_id = s.store_id)))))));

ALTER POLICY "item_translations_staff_select" ON public."item_translations" USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = (select auth.uid())) AND (u.tenant_id = item_translations.tenant_id)))));

ALTER POLICY "item_translations_admin_manager_insert" ON public."item_translations" WITH CHECK (((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = (select auth.uid())) AND (u.tenant_id = item_translations.tenant_id) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))) AND (EXISTS ( SELECT 1
   FROM items i
  WHERE ((i.id = item_translations.item_id) AND (i.tenant_id = item_translations.tenant_id))))));

ALTER POLICY "Users can view other income of their tenant" ON public."other_income" USING ((tenant_id = ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = (select auth.uid())))));

ALTER POLICY "Users can insert other income of their tenant" ON public."other_income" WITH CHECK ((tenant_id = ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = (select auth.uid())))));

ALTER POLICY "Users can update other income of their tenant" ON public."other_income" USING ((tenant_id = ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = (select auth.uid()))))) WITH CHECK ((tenant_id = ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = (select auth.uid())))));

ALTER POLICY "Users can delete other income of their tenant" ON public."other_income" USING ((tenant_id = ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = (select auth.uid())))));

ALTER POLICY "item_translations_admin_manager_update" ON public."item_translations" USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = (select auth.uid())) AND (u.tenant_id = item_translations.tenant_id) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = (select auth.uid())) AND (u.tenant_id = item_translations.tenant_id) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))) AND (EXISTS ( SELECT 1
   FROM items i
  WHERE ((i.id = item_translations.item_id) AND (i.tenant_id = item_translations.tenant_id))))));

ALTER POLICY "item_translations_admin_manager_delete" ON public."item_translations" USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = (select auth.uid())) AND (u.tenant_id = item_translations.tenant_id) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));

ALTER POLICY "cashiers add sales" ON public."sales" WITH CHECK ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = (select auth.uid())) AND (users.role = ANY (ARRAY['cashier'::text, 'manager'::text, 'admin'::text]))))));

ALTER POLICY "users_select_own" ON public."users" USING ((auth_id = (select auth.uid())));

ALTER POLICY "canva_connections_read" ON public."canva_connections" USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = (select auth.uid())) AND (u.id = canva_connections.user_id) AND (u.tenant_id = canva_connections.tenant_id) AND (u.store_id = canva_connections.store_id) AND (u.role = ANY (ARRAY['owner'::text, 'manager'::text, 'admin'::text]))))));

ALTER POLICY "canva_templates_read" ON public."canva_approved_templates" USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = (select auth.uid())) AND (u.tenant_id = canva_approved_templates.tenant_id) AND (u.store_id = canva_approved_templates.store_id) AND (u.role = ANY (ARRAY['owner'::text, 'manager'::text, 'admin'::text]))))));

ALTER POLICY "canva_designs_read" ON public."canva_product_designs" USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = (select auth.uid())) AND (u.id = canva_product_designs.user_id) AND (u.tenant_id = canva_product_designs.tenant_id) AND (u.store_id = canva_product_designs.store_id) AND (u.role = ANY (ARRAY['owner'::text, 'manager'::text, 'admin'::text]))))));

ALTER POLICY "canva_runs_owned" ON public."canva_design_runs" USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = (select auth.uid())) AND (u.id = canva_design_runs.user_id) AND (u.tenant_id = canva_design_runs.tenant_id) AND (u.store_id = canva_design_runs.store_id) AND (u.role = ANY (ARRAY['owner'::text, 'manager'::text, 'admin'::text]))))));

ALTER POLICY "lpq_select_staff" ON public."ledger_posting_queue" USING ((store_id = ( SELECT users.store_id
   FROM users
  WHERE (users.auth_id = (select auth.uid())))));

ALTER POLICY "idempotency_keys_tenant_isolated" ON public."idempotency_keys" USING ((tenant_id = ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = (select auth.uid())))));

ALTER POLICY "customer_reminders_tenant_isolated" ON public."customer_reminders" USING ((tenant_id = ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = (select auth.uid())))));

ALTER POLICY "followup_notes_tenant_isolated" ON public."followup_notes" USING ((tenant_id = ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = (select auth.uid())))));

ALTER POLICY "journal_batches_tenant_isolated" ON public."journal_batches" USING ((tenant_id = ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = (select auth.uid())))));

ALTER POLICY "social_posts_tenant_isolation" ON public."social_posts" USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = (select auth.uid())) AND (users.tenant_id = social_posts.tenant_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = (select auth.uid())) AND (users.tenant_id = social_posts.tenant_id)))));

ALTER POLICY "Users can view daily_sales of their store" ON public."daily_sales" USING ((store_id IN ( SELECT users.store_id
   FROM users
  WHERE (users.auth_id = (select auth.uid())))));

ALTER POLICY "Managers can insert daily_sales" ON public."daily_sales" WITH CHECK (((store_id IN ( SELECT users.store_id
   FROM users
  WHERE (users.auth_id = (select auth.uid())))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = (select auth.uid())) AND (users.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));

ALTER POLICY "Managers can update daily_sales" ON public."daily_sales" USING (((store_id IN ( SELECT users.store_id
   FROM users
  WHERE (users.auth_id = (select auth.uid())))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = (select auth.uid())) AND (users.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));

ALTER POLICY "audit_logs_select_staff" ON public."audit_logs" USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = (select auth.uid())) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));

ALTER POLICY "pot_select" ON public."pos_override_tokens" USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = (select auth.uid())) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));

ALTER POLICY "sal_select" ON public."sale_audit_log" USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = (select auth.uid())) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));

ALTER POLICY "ap_select" ON public."accounting_periods" USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = (select auth.uid())) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));

ALTER POLICY "import_runs_admin_manager_select" ON public."import_runs" USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = (select auth.uid())) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));

ALTER POLICY "tenants_select_own" ON public."tenants" USING ((id = ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = (select auth.uid())))));

ALTER POLICY "accounts_select_tenant" ON public."accounts" USING ((tenant_id = ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = (select auth.uid())))));

ALTER POLICY "categories_manage_authorized" ON public."categories" USING (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = (select auth.uid())) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = (select auth.uid())) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));

ALTER POLICY "stock_transfer_items_select_tenant" ON public."stock_transfer_items" USING (((EXISTS ( SELECT 1
   FROM stock_transfers st
  WHERE ((st.id = stock_transfer_items.transfer_id) AND ((st.from_store_id = get_current_user_store_id()) OR (st.to_store_id = get_current_user_store_id()))))) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = (select auth.uid())) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));

ALTER POLICY "purchase_order_items_select_tenant" ON public."purchase_order_items" USING (((EXISTS ( SELECT 1
   FROM purchase_orders po
  WHERE ((po.id = purchase_order_items.po_id) AND (po.store_id = get_current_user_store_id())))) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = (select auth.uid())) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));
