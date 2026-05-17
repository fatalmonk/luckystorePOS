DROP POLICY IF EXISTS reminders_delete ON public.reminders; CREATE POLICY reminders_delete ON public.reminders AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.tenant_id = reminders.tenant_id) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
DROP POLICY IF EXISTS reminders_insert ON public.reminders; CREATE POLICY reminders_insert ON public.reminders AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.tenant_id = reminders.tenant_id) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
DROP POLICY IF EXISTS reminders_select ON public.reminders; CREATE POLICY reminders_select ON public.reminders AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.tenant_id = reminders.tenant_id)))));
DROP POLICY IF EXISTS reminders_update ON public.reminders; CREATE POLICY reminders_update ON public.reminders AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.tenant_id = reminders.tenant_id) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
DROP POLICY IF EXISTS stock_ledger_insert_authenticated ON public.stock_ledger; CREATE POLICY stock_ledger_insert_authenticated ON public.stock_ledger AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])) AND (u.tenant_id IN ( SELECT stores.tenant_id
           FROM stores
          WHERE (stores.id = stock_ledger.store_id)))))));
DROP POLICY IF EXISTS stock_ledger_read_authenticated ON public.stock_ledger; CREATE POLICY stock_ledger_read_authenticated ON public.stock_ledger AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.tenant_id IN ( SELECT stores.tenant_id
           FROM stores
          WHERE (stores.id = stock_ledger.store_id)))))));
DROP POLICY IF EXISTS audit_logs_select_staff ON public.audit_logs; CREATE POLICY audit_logs_select_staff ON public.audit_logs AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
DROP POLICY IF EXISTS lpq_select_staff ON public.ledger_posting_queue; CREATE POLICY lpq_select_staff ON public.ledger_posting_queue AS PERMISSIVE FOR SELECT TO authenticated USING ((store_id = ( SELECT users.store_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS "Service role can manage competitor prices" ON public.competitor_prices; CREATE POLICY "Service role can manage competitor prices" ON public.competitor_prices AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Users can view competitor prices for their store" ON public.competitor_prices; CREATE POLICY "Users can view competitor prices for their store" ON public.competitor_prices AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM auth.users
  WHERE ((users.id = auth.uid()) AND ((users.raw_user_meta_data ->> 'current_store_id'::text) = (competitor_prices.store_id)::text)))));
DROP POLICY IF EXISTS accounts_select_tenant ON public.accounts; CREATE POLICY accounts_select_tenant ON public.accounts AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS ap_select ON public.accounting_periods; CREATE POLICY ap_select ON public.accounting_periods AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
DROP POLICY IF EXISTS customer_reminders_tenant_isolated ON public.customer_reminders; CREATE POLICY customer_reminders_tenant_isolated ON public.customer_reminders AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS crl_insert ON public.close_review_log; CREATE POLICY crl_insert ON public.close_review_log AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM users actor
  WHERE ((actor.auth_id = ( SELECT auth.uid() AS uid)) AND (actor.id = close_review_log.reviewer_user_id) AND (actor.store_id = close_review_log.store_id) AND (actor.role = ANY (ARRAY['manager'::text, 'admin'::text, 'owner'::text]))))));
DROP POLICY IF EXISTS crl_select ON public.close_review_log; CREATE POLICY crl_select ON public.close_review_log AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM users actor
  WHERE ((actor.auth_id = ( SELECT auth.uid() AS uid)) AND ((actor.role = ANY (ARRAY['admin'::text, 'owner'::text])) OR ((actor.role = 'manager'::text) AND (actor.store_id = close_review_log.store_id)))))));
DROP POLICY IF EXISTS crl_update ON public.close_review_log; CREATE POLICY crl_update ON public.close_review_log AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM users actor
  WHERE ((actor.auth_id = ( SELECT auth.uid() AS uid)) AND (actor.role = ANY (ARRAY['admin'::text, 'owner'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM users actor
  WHERE ((actor.auth_id = ( SELECT auth.uid() AS uid)) AND (actor.role = ANY (ARRAY['admin'::text, 'owner'::text]))))));
DROP POLICY IF EXISTS "Managers can insert daily_sales" ON public.daily_sales; CREATE POLICY "Managers can insert daily_sales" ON public.daily_sales AS PERMISSIVE FOR INSERT TO public WITH CHECK (((store_id IN ( SELECT users.store_id
   FROM users
  WHERE (users.auth_id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));
DROP POLICY IF EXISTS "Managers can update daily_sales" ON public.daily_sales; CREATE POLICY "Managers can update daily_sales" ON public.daily_sales AS PERMISSIVE FOR UPDATE TO public USING (((store_id IN ( SELECT users.store_id
   FROM users
  WHERE (users.auth_id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));
DROP POLICY IF EXISTS "Users can view daily_sales of their store" ON public.daily_sales; CREATE POLICY "Users can view daily_sales of their store" ON public.daily_sales AS PERMISSIVE FOR SELECT TO public USING ((store_id IN ( SELECT users.store_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS categories_delete_tenant_scoped ON public.categories; CREATE POLICY categories_delete_tenant_scoped ON public.categories AS PERMISSIVE FOR DELETE TO authenticated USING (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.store_id = u.store_id))))));
DROP POLICY IF EXISTS categories_insert_tenant_scoped ON public.categories; CREATE POLICY categories_insert_tenant_scoped ON public.categories AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.store_id = u.store_id)))));
DROP POLICY IF EXISTS categories_manage_authorized ON public.categories; CREATE POLICY categories_manage_authorized ON public.categories AS PERMISSIVE FOR ALL TO authenticated USING (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));
DROP POLICY IF EXISTS categories_select_tenant_isolated ON public.categories; CREATE POLICY categories_select_tenant_isolated ON public.categories AS PERMISSIVE FOR SELECT TO authenticated USING (((store_id = get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = get_current_user_tenant_id()))))));
DROP POLICY IF EXISTS categories_update_tenant_scoped ON public.categories; CREATE POLICY categories_update_tenant_scoped ON public.categories AS PERMISSIVE FOR UPDATE TO authenticated USING (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.store_id = u.store_id)))))) WITH CHECK (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.store_id = u.store_id))))));
DROP POLICY IF EXISTS batches_no_client_access ON public.batches; CREATE POLICY batches_no_client_access ON public.batches AS PERMISSIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS idempotency_keys_tenant_isolated ON public.idempotency_keys; CREATE POLICY idempotency_keys_tenant_isolated ON public.idempotency_keys AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS item_batches_select_tenant_isolated ON public.item_batches; CREATE POLICY item_batches_select_tenant_isolated ON public.item_batches AS PERMISSIVE FOR SELECT TO authenticated USING (((store_id = get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = get_current_user_tenant_id()))))));
DROP POLICY IF EXISTS item_batches_write_authorized ON public.item_batches; CREATE POLICY item_batches_write_authorized ON public.item_batches AS PERMISSIVE FOR ALL TO authenticated USING (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));
DROP POLICY IF EXISTS followup_notes_tenant_isolated ON public.followup_notes; CREATE POLICY followup_notes_tenant_isolated ON public.followup_notes AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS import_runs_admin_manager_select ON public.import_runs; CREATE POLICY import_runs_admin_manager_select ON public.import_runs AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
DROP POLICY IF EXISTS journal_batches_tenant_isolated ON public.journal_batches; CREATE POLICY journal_batches_tenant_isolated ON public.journal_batches AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS items_manage_authorized ON public.items; CREATE POLICY items_manage_authorized ON public.items AS PERMISSIVE FOR ALL TO authenticated USING (((tenant_id = get_current_user_tenant_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((tenant_id = get_current_user_tenant_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));
DROP POLICY IF EXISTS items_select_tenant_isolated ON public.items; CREATE POLICY items_select_tenant_isolated ON public.items AS PERMISSIVE FOR SELECT TO authenticated USING (((tenant_id = get_current_user_tenant_id()) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = get_current_user_tenant_id()))))));
DROP POLICY IF EXISTS la_select ON public.ledger_accounts; CREATE POLICY la_select ON public.ledger_accounts AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
DROP POLICY IF EXISTS lb_select ON public.ledger_batches; CREATE POLICY lb_select ON public.ledger_batches AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
DROP POLICY IF EXISTS parties_select_tenant ON public.parties; CREATE POLICY parties_select_tenant ON public.parties AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS parties_select_tenant_isolated ON public.parties; CREATE POLICY parties_select_tenant_isolated ON public.parties AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = get_current_user_tenant_id()));
DROP POLICY IF EXISTS lw_select_authenticated ON public.ledger_workers; CREATE POLICY lw_select_authenticated ON public.ledger_workers AS PERMISSIVE FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS payment_methods_select_tenant_isolated ON public.payment_methods; CREATE POLICY payment_methods_select_tenant_isolated ON public.payment_methods AS PERMISSIVE FOR SELECT TO authenticated USING (((store_id = get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = get_current_user_tenant_id()))))));
DROP POLICY IF EXISTS payment_methods_write_authorized ON public.payment_methods; CREATE POLICY payment_methods_write_authorized ON public.payment_methods AS PERMISSIVE FOR ALL TO authenticated USING (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));
DROP POLICY IF EXISTS le_select ON public.ledger_entries; CREATE POLICY le_select ON public.ledger_entries AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (ledger_batches lb
     JOIN users u ON ((u.auth_id = auth.uid())))
  WHERE ((lb.id = ledger_entries.batch_id) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
DROP POLICY IF EXISTS purchase_orders_select_tenant_isolated ON public.purchase_orders; CREATE POLICY purchase_orders_select_tenant_isolated ON public.purchase_orders AS PERMISSIVE FOR SELECT TO authenticated USING (((store_id = get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = get_current_user_tenant_id()))))));
DROP POLICY IF EXISTS purchase_orders_write_authorized ON public.purchase_orders; CREATE POLICY purchase_orders_write_authorized ON public.purchase_orders AS PERMISSIVE FOR ALL TO authenticated USING (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));
DROP POLICY IF EXISTS receipt_config_select_tenant_isolated ON public.receipt_config; CREATE POLICY receipt_config_select_tenant_isolated ON public.receipt_config AS PERMISSIVE FOR SELECT TO authenticated USING (((store_id = get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = get_current_user_tenant_id()))))));
DROP POLICY IF EXISTS receipt_config_write_authorized ON public.receipt_config; CREATE POLICY receipt_config_write_authorized ON public.receipt_config AS PERMISSIVE FOR ALL TO authenticated USING (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));
DROP POLICY IF EXISTS receipt_counters_no_client_access ON public.receipt_counters; CREATE POLICY receipt_counters_no_client_access ON public.receipt_counters AS PERMISSIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS pot_select ON public.pos_override_tokens; CREATE POLICY pot_select ON public.pos_override_tokens AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
DROP POLICY IF EXISTS ses_insert ON public.pos_sessions; CREATE POLICY ses_insert ON public.pos_sessions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text]))))));
DROP POLICY IF EXISTS ses_select_manager ON public.pos_sessions; CREATE POLICY ses_select_manager ON public.pos_sessions AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
DROP POLICY IF EXISTS ses_select_own ON public.pos_sessions; CREATE POLICY ses_select_own ON public.pos_sessions AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.id = pos_sessions.cashier_id)))));
DROP POLICY IF EXISTS ses_update ON public.pos_sessions; CREATE POLICY ses_update ON public.pos_sessions AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND ((u.id = pos_sessions.cashier_id) OR (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));
DROP POLICY IF EXISTS purchase_order_items_select_tenant ON public.purchase_order_items; CREATE POLICY purchase_order_items_select_tenant ON public.purchase_order_items AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM purchase_orders po
  WHERE ((po.id = purchase_order_items.po_id) AND (po.store_id = get_current_user_store_id())))) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));
DROP POLICY IF EXISTS purchase_order_items_select_tenant_isolated ON public.purchase_order_items; CREATE POLICY purchase_order_items_select_tenant_isolated ON public.purchase_order_items AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM purchase_orders po
  WHERE ((po.id = purchase_order_items.po_id) AND ((po.store_id = get_current_user_store_id()) OR (EXISTS ( SELECT 1
           FROM users u
          WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = get_current_user_tenant_id())))))))));
DROP POLICY IF EXISTS purchase_order_items_write_authorized ON public.purchase_order_items; CREATE POLICY purchase_order_items_write_authorized ON public.purchase_order_items AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM purchase_orders po
  WHERE ((po.id = purchase_order_items.po_id) AND (po.store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
           FROM users u
          WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM purchase_orders po
  WHERE ((po.id = purchase_order_items.po_id) AND (po.store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
           FROM users u
          WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))))));
DROP POLICY IF EXISTS sp_insert ON public.sale_payments; CREATE POLICY sp_insert ON public.sale_payments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text]))))));
DROP POLICY IF EXISTS sp_select ON public.sale_payments; CREATE POLICY sp_select ON public.sale_payments AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (sales s
     JOIN users u ON ((u.auth_id = ( SELECT auth.uid() AS uid))))
  WHERE ((s.id = sale_payments.sale_id) AND ((u.id = s.cashier_id) OR (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));
DROP POLICY IF EXISTS ssc_insert ON public.sale_sync_conflicts; CREATE POLICY ssc_insert ON public.sale_sync_conflicts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text]))))));
DROP POLICY IF EXISTS ssc_select ON public.sale_sync_conflicts; CREATE POLICY ssc_select ON public.sale_sync_conflicts AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
DROP POLICY IF EXISTS ssc_update ON public.sale_sync_conflicts; CREATE POLICY ssc_update ON public.sale_sync_conflicts AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
DROP POLICY IF EXISTS returns_no_client_access ON public.returns; CREATE POLICY returns_no_client_access ON public.returns AS PERMISSIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS sal_select ON public.sale_audit_log; CREATE POLICY sal_select ON public.sale_audit_log AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
DROP POLICY IF EXISTS sale_items_select_staff ON public.sale_items; CREATE POLICY sale_items_select_staff ON public.sale_items AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text, 'stock'::text]))))));
DROP POLICY IF EXISTS si_insert ON public.sale_items; CREATE POLICY si_insert ON public.sale_items AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text]))))));
DROP POLICY IF EXISTS si_select ON public.sale_items; CREATE POLICY si_select ON public.sale_items AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (sales s
     JOIN users u ON ((u.auth_id = ( SELECT auth.uid() AS uid))))
  WHERE ((s.id = sale_items.sale_id) AND ((u.id = s.cashier_id) OR (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));
DROP POLICY IF EXISTS stock_alert_thresholds_select_tenant_isolated ON public.stock_alert_thresholds; CREATE POLICY stock_alert_thresholds_select_tenant_isolated ON public.stock_alert_thresholds AS PERMISSIVE FOR SELECT TO authenticated USING (((store_id = get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = get_current_user_tenant_id()))))));
DROP POLICY IF EXISTS stock_alert_thresholds_write_authorized ON public.stock_alert_thresholds; CREATE POLICY stock_alert_thresholds_write_authorized ON public.stock_alert_thresholds AS PERMISSIVE FOR ALL TO authenticated USING (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text]))))))) WITH CHECK (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text])))))));
DROP POLICY IF EXISTS stock_levels_read ON public.stock_levels; CREATE POLICY stock_levels_read ON public.stock_levels AS PERMISSIVE FOR SELECT TO authenticated USING (((store_id = get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = ( SELECT s.tenant_id
           FROM stores s
          WHERE (s.id = stock_levels.store_id))))))));
DROP POLICY IF EXISTS stock_levels_select_tenant_isolated ON public.stock_levels; CREATE POLICY stock_levels_select_tenant_isolated ON public.stock_levels AS PERMISSIVE FOR SELECT TO authenticated USING (((store_id = get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = get_current_user_tenant_id()))))));
DROP POLICY IF EXISTS stock_levels_write_authorized ON public.stock_levels; CREATE POLICY stock_levels_write_authorized ON public.stock_levels AS PERMISSIVE FOR ALL TO authenticated USING (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text]))))))) WITH CHECK (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text])))))));
DROP POLICY IF EXISTS stock_transfer_items_select_tenant ON public.stock_transfer_items; CREATE POLICY stock_transfer_items_select_tenant ON public.stock_transfer_items AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM stock_transfers st
  WHERE ((st.id = stock_transfer_items.transfer_id) AND ((st.from_store_id = get_current_user_store_id()) OR (st.to_store_id = get_current_user_store_id()))))) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));
DROP POLICY IF EXISTS stock_transfer_items_select_tenant_isolated ON public.stock_transfer_items; CREATE POLICY stock_transfer_items_select_tenant_isolated ON public.stock_transfer_items AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM stock_transfers st
  WHERE ((st.id = stock_transfer_items.transfer_id) AND ((st.from_store_id = get_current_user_store_id()) OR (st.to_store_id = get_current_user_store_id()) OR (EXISTS ( SELECT 1
           FROM users u
          WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = get_current_user_tenant_id())))))))));
DROP POLICY IF EXISTS stock_transfer_items_write_authorized ON public.stock_transfer_items; CREATE POLICY stock_transfer_items_write_authorized ON public.stock_transfer_items AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM stock_transfers st
  WHERE ((st.id = stock_transfer_items.transfer_id) AND ((st.from_store_id = get_current_user_store_id()) OR (st.to_store_id = get_current_user_store_id())) AND (EXISTS ( SELECT 1
           FROM users u
          WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text]))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM stock_transfers st
  WHERE ((st.id = stock_transfer_items.transfer_id) AND ((st.from_store_id = get_current_user_store_id()) OR (st.to_store_id = get_current_user_store_id())) AND (EXISTS ( SELECT 1
           FROM users u
          WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text])))))))));
DROP POLICY IF EXISTS stock_movements_insert_staff ON public.stock_movements; CREATE POLICY stock_movements_insert_staff ON public.stock_movements AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'stock'::text]))))));
DROP POLICY IF EXISTS stock_movements_select_staff ON public.stock_movements; CREATE POLICY stock_movements_select_staff ON public.stock_movements AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text, 'stock'::text]))))));
DROP POLICY IF EXISTS "cashiers add sales" ON public.sales; CREATE POLICY "cashiers add sales" ON public.sales AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.role = ANY (ARRAY['cashier'::text, 'manager'::text, 'admin'::text]))))));
DROP POLICY IF EXISTS sales_insert ON public.sales; CREATE POLICY sales_insert ON public.sales AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'cashier'::text]))))));
DROP POLICY IF EXISTS sales_select_manager ON public.sales; CREATE POLICY sales_select_manager ON public.sales AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
DROP POLICY IF EXISTS sales_select_own ON public.sales; CREATE POLICY sales_select_own ON public.sales AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.id = sales.cashier_id) AND (u.created_at >= CURRENT_DATE)))));
DROP POLICY IF EXISTS sales_void ON public.sales; CREATE POLICY sales_void ON public.sales AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users; CREATE POLICY "Users can insert own profile" ON public.users AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = auth_id));
DROP POLICY IF EXISTS users_select_own ON public.users; CREATE POLICY users_select_own ON public.users AS PERMISSIVE FOR SELECT TO authenticated USING ((auth_id = auth.uid()));
DROP POLICY IF EXISTS suppliers_select_tenant_isolated ON public.suppliers; CREATE POLICY suppliers_select_tenant_isolated ON public.suppliers AS PERMISSIVE FOR SELECT TO authenticated USING (((tenant_id = get_current_user_tenant_id()) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = get_current_user_tenant_id()))))));
DROP POLICY IF EXISTS suppliers_write_authorized ON public.suppliers; CREATE POLICY suppliers_write_authorized ON public.suppliers AS PERMISSIVE FOR ALL TO authenticated USING (((tenant_id = get_current_user_tenant_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((tenant_id = get_current_user_tenant_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));
DROP POLICY IF EXISTS tenants_select_own ON public.tenants; CREATE POLICY tenants_select_own ON public.tenants AS PERMISSIVE FOR SELECT TO authenticated USING ((id = ( SELECT users.tenant_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
DROP POLICY IF EXISTS discounts_select_tenant_isolated ON public.discounts; CREATE POLICY discounts_select_tenant_isolated ON public.discounts AS PERMISSIVE FOR SELECT TO authenticated USING (((store_id = get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = get_current_user_tenant_id()))))));
DROP POLICY IF EXISTS discounts_write_authorized ON public.discounts; CREATE POLICY discounts_write_authorized ON public.discounts AS PERMISSIVE FOR ALL TO authenticated USING (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text]))))))) WITH CHECK (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])))))));
DROP POLICY IF EXISTS expenses_delete ON public.expenses; CREATE POLICY expenses_delete ON public.expenses AS PERMISSIVE FOR DELETE TO authenticated USING (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])) AND (u.tenant_id = get_current_user_tenant_id()))))));
DROP POLICY IF EXISTS expenses_insert ON public.expenses; CREATE POLICY expenses_insert ON public.expenses AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
DROP POLICY IF EXISTS expenses_select ON public.expenses; CREATE POLICY expenses_select ON public.expenses AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
DROP POLICY IF EXISTS expenses_select_tenant_isolated ON public.expenses; CREATE POLICY expenses_select_tenant_isolated ON public.expenses AS PERMISSIVE FOR SELECT TO authenticated USING (((store_id = get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = get_current_user_tenant_id()))))));
DROP POLICY IF EXISTS expenses_update ON public.expenses; CREATE POLICY expenses_update ON public.expenses AS PERMISSIVE FOR UPDATE TO authenticated USING (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])) AND (u.tenant_id = get_current_user_tenant_id())))))) WITH CHECK (((store_id = get_current_user_store_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = auth.uid()) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])) AND (u.tenant_id = get_current_user_tenant_id()))))));
DROP POLICY IF EXISTS stock_transfers_select_tenant_isolated ON public.stock_transfers; CREATE POLICY stock_transfers_select_tenant_isolated ON public.stock_transfers AS PERMISSIVE FOR SELECT TO authenticated USING (((from_store_id = get_current_user_store_id()) OR (to_store_id = get_current_user_store_id()) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text])) AND (u.tenant_id = get_current_user_tenant_id()))))));
DROP POLICY IF EXISTS stock_transfers_write_authorized ON public.stock_transfers; CREATE POLICY stock_transfers_write_authorized ON public.stock_transfers AS PERMISSIVE FOR ALL TO authenticated USING ((((from_store_id = get_current_user_store_id()) OR (to_store_id = get_current_user_store_id())) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text]))))))) WITH CHECK ((((from_store_id = get_current_user_store_id()) OR (to_store_id = get_current_user_store_id())) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text, 'advisor'::text, 'staff'::text])))))));
DROP POLICY IF EXISTS stores_delete_admin_manager ON public.stores; CREATE POLICY stores_delete_admin_manager ON public.stores AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
DROP POLICY IF EXISTS stores_insert_admin_manager ON public.stores; CREATE POLICY stores_insert_admin_manager ON public.stores AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
DROP POLICY IF EXISTS stores_insert_authenticated ON public.stores; CREATE POLICY stores_insert_authenticated ON public.stores AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((tenant_id = get_current_user_tenant_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));
DROP POLICY IF EXISTS stores_select_authenticated ON public.stores; CREATE POLICY stores_select_authenticated ON public.stores AS PERMISSIVE FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS stores_update_admin_manager ON public.stores; CREATE POLICY stores_update_admin_manager ON public.stores AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.auth_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));
