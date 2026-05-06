import { supabase } from './supabase';
import { mapSearchItems, mapCategories, mapReminder, mapReminders } from './api/mappers';
import type { PosProduct, PosCategory, SaleResult, Expense, ExpenseFormData, RecordExpenseResult, ExpenseCategory, ExpensePaymentType } from './api/types';
import { createDebugLogger } from './debug';

const debugLog = createDebugLogger('POS API');

export const api = {
  dashboard: {
    getStats: async (storeId: string) => {
      const { data, error } = await supabase.rpc('get_manager_dashboard_stats', { p_store_id: storeId });
      if (error) throw error;
      return data;
    },
    getLowStock: async (storeId: string) => {
      const { data, error } = await supabase.rpc('get_low_stock_items', { p_store_id: storeId });
      if (error) throw error;
      return data;
    },
  },
  products: {
    list: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*, categories(name)')
        .order('name');
      if (error) throw error;
      return data;
    },
    get: async (id: string) => {
      const { data, error } = await supabase.from('items').select('*, categories(*)').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    create: async (product: any) => {
      const { data, error } = await supabase.from('items').insert([product]).select().single();
      if (error) throw error;
      return data;
    },
    update: async (id: string, updates: any) => {
      const { data, error } = await supabase.from('items').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
  },
  categories: {
    list: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      return data;
    },
  },
  inventory: {
    list: async (storeId: string) => {
      const { data, error } = await supabase.rpc('get_inventory_list', { p_store_id: storeId });
      if (error) throw error;
      return data;
    },
    update: async (storeId: string, itemId: string, delta: number, reason: string, notes?: string, idempotencyKey?: string) => {
      const { data, error } = await supabase.rpc('adjust_stock', {
        p_store_id: storeId,
        p_item_id: itemId,
        p_delta: delta,
        p_reason: reason,
        p_notes: notes,
        p_idempotency_key: idempotencyKey
      });
      if (error) throw error;
      return data;
    },
    set: async (storeId: string, itemId: string, newQty: number, reason: string, notes?: string) => {
      const { data, error } = await supabase.rpc('set_stock', {
        p_store_id: storeId,
        p_item_id: itemId,
        p_new_qty: newQty,
        p_reason: reason,
        p_notes: notes
      });
      if (error) throw error;
      return data;
    },
    history: async (storeId: string, itemId?: string) => {
      const { data, error } = await supabase.rpc('get_stock_history_simple', {
        p_store_id: storeId,
        p_item_id: itemId
      });
      if (error) throw error;
      return data;
    },
    getSummary: async (storeId: string) => {
      const { data, error } = await supabase.rpc('get_inventory_summary', { p_store_id: storeId });
      if (error) throw error;
      return data;
    },
  },
  sales: {
    history: async (storeId: string, search?: string, startDate?: string, endDate?: string) => {
      const { data, error } = await supabase.rpc('get_sales_history', {
        p_store_id: storeId,
        p_search_query: search,
        p_start_date: startDate,
        p_end_date: endDate
      });
      if (error) throw error;
      return data;
    },
    getDetails: async (saleId: string) => {
      const { data, error } = await supabase.rpc('get_sale_details', { p_sale_id: saleId });
      if (error) throw error;
      return data;
    },
    void: async (saleId: string, reason: string, idempotencyKey?: string) => {
      const { data, error } = await supabase.rpc('void_sale', {
        p_sale_id: saleId,
        p_reason: reason,
        p_idempotency_key: idempotencyKey
      });
      if (error) throw error;
      return data;
    },
  },
  settings: {
    getPaymentMethods: async (storeId: string) => {
      const { data, error } = await supabase.rpc('get_payment_methods', { p_store_id: storeId });
      if (error) throw error;
      return data;
    },
    getUsers: async (storeId: string) => {
      const { data, error } = await supabase.rpc('get_store_users', { p_store_id: storeId });
      if (error) throw error;
      return data;
    },
    getReceiptConfig: async (storeId: string) => {
      const { data, error } = await supabase.rpc('get_receipt_config_simple', { p_store_id: storeId });
      if (error) throw error;
      return data;
    },
    updateReceiptConfig: async (storeId: string, config: any) => {
      const { data, error } = await supabase.rpc('update_receipt_config_simple', {
        p_store_id: storeId,
        p_store_name: config.store_name,
        p_header_text: config.header_text,
        p_footer_text: config.footer_text
      });
      if (error) throw error;
      return data;
    },
    addUser: async (storeId: string, user: { email: string; password: string; fullName: string; role: string; pin: string; tenantId: string }) => {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
      });
      if (authError) throw authError;
      const authId = authData.user?.id;
      if (!authId) throw new Error('Signup succeeded but no auth user ID returned');
      const { data, error } = await supabase
        .from('users')
        .insert([{
          id: authId,
          tenant_id: user.tenantId,
          store_id: storeId,
          name: user.fullName,
          role: user.role,
          pos_pin: user.pin,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    addPaymentMethod: async (storeId: string, method: { name: string; type: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('payment_methods')
        .insert([{
          store_id: storeId,
          name: method.name,
          type: method.type,
          is_active: method.isActive,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    togglePaymentMethod: async (methodId: string, isActive: boolean) => {
      const { data, error } = await supabase
        .from('payment_methods')
        .update({ is_active: isActive })
        .eq('id', methodId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  },

  // ---------------------------------------------------------------------
  // New modules – added per implementation plan (Phase 2 & Phase 4)
  // ---------------------------------------------------------------------
  expenses: {
    /** List expense records for a store with optional date/category filters */
    list: async (storeId: string, filters?: { startDate?: string; endDate?: string; category?: string; paymentType?: string }): Promise<Expense[]> => {
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('store_id', storeId)
        .order('expense_date', { ascending: false });

      if (filters?.startDate) query = query.gte('expense_date', filters.startDate);
      if (filters?.endDate) query = query.lte('expense_date', filters.endDate);
      if (filters?.category) query = query.eq('category', filters.category);
      if (filters?.paymentType) query = query.eq('payment_type', filters.paymentType);

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        storeId: row.store_id,
        expenseDate: row.expense_date,
        vendorName: row.vendor_name,
        description: row.description,
        amount: Number(row.amount),
        paymentType: row.payment_type as ExpensePaymentType,
        category: row.category as ExpenseCategory,
        ledgerBatchId: row.ledger_batch_id,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    },
    /** Record a new expense via the record_expense RPC (posts to ledger) */
    create: async (storeId: string, form: ExpenseFormData): Promise<RecordExpenseResult> => {
      const { data, error } = await supabase.rpc('record_expense', {
        p_store_id: storeId,
        p_date: form.expenseDate,
        p_vendor: form.vendorName,
        p_description: form.description,
        p_amount: form.amount,
        p_payment_type: form.paymentType,
        p_category: form.category,
      });
      if (error) throw error;
      return data as RecordExpenseResult;
    },
  },
  pos: {
    /** Get POS categories (pill filters) - FIXED: uses correct RPC */
    getCategories: async (storeId: string): Promise<PosCategory[]> => {
      debugLog('Fetching categories for store', storeId);
      const { data, error } = await supabase.rpc('get_pos_categories', { p_store_id: storeId });
      if (error) throw error;
      debugLog('Raw categories response', data);
      return mapCategories(data);
    },
    /** Get POS products, optionally filtered by category or search - FIXED: uses search_items_pos */
    getProducts: async (
      storeId: string,
      search?: string,
      categoryId?: string
    ): Promise<PosProduct[]> => {
      debugLog('Fetching products', { storeId, search, categoryId });
      const { data, error } = await supabase.rpc('search_items_pos', {
        p_store_id: storeId,
        p_query: search || '',
        p_category_id: categoryId || null,
        p_limit: 50,
        p_offset: 0,
      });
      if (error) throw error;
      debugLog('Raw products response', data);
      return mapSearchItems(data);
    },
    /** Lookup item by scan (SKU, barcode, or short_code) */
    lookupByScan: async (scanValue: string, storeId: string): Promise<PosProduct | null> => {
      debugLog('Looking up item by scan', { scanValue, storeId });
      const { data, error } = await supabase.rpc('lookup_item_by_scan', {
        p_scan_value: scanValue,
        p_store_id: storeId,
      });
      if (error) throw error;
      debugLog('Raw scan lookup response', data);
      if (!data) return null;
      return mapSearchItems(data)[0] || null;
    },
    /** Create a POS sale transaction - FIXED: uses record_sale RPC */
    createSale: async (saleData: {
      idempotencyKey: string;
      tenantId: string;
      storeId: string;
      items: Array<{ item_id: string; quantity: number; unit_price: number }>;
      payments: Array<{ account_id: string; amount: number; party_id?: string | null }>;
      notes?: string | null;
    }): Promise<SaleResult> => {
      debugLog('Creating sale', saleData);
      const { data, error } = await supabase.rpc('record_sale', {
        p_idempotency_key: saleData.idempotencyKey,
        p_tenant_id: saleData.tenantId,
        p_store_id: saleData.storeId,
        p_items: JSON.stringify(saleData.items),
        p_payments: JSON.stringify(saleData.payments),
        p_notes: saleData.notes || null,
      });
      if (error) throw error;
      debugLog('Sale result', data);
      return {
        status: data?.status === 'success' ? 'success' : 'error',
        batchId: data?.batch_id,
        totalAmount: data?.total_revenue,
        error: data?.status !== 'success' ? 'Sale failed' : undefined,
      };
    },
  },
  reminders: {
    /** List upcoming reminders for a store */
    list: async (storeId: string, includeCompleted = false) => {
      const { data, error } = await supabase.rpc('get_upcoming_reminders', {
        p_store_id: storeId,
        p_include_completed: includeCompleted,
      });
      if (error) throw error;
      return mapReminders(data);
    },
    /** Create a new reminder */
    create: async (params: {
      tenantId: string;
      storeId: string;
      title: string;
      description?: string | null;
      reminderDate: string;
      reminderType: string;
      createdBy?: string | null;
    }) => {
      const { data, error } = await supabase.rpc('create_reminder', {
        p_tenant_id: params.tenantId,
        p_store_id: params.storeId,
        p_title: params.title,
        p_description: params.description ?? null,
        p_reminder_date: params.reminderDate,
        p_reminder_type: params.reminderType,
        p_created_by: params.createdBy ?? null,
      });
      if (error) throw error;
      return mapReminder(data);
    },
    /** Update an existing reminder */
    update: async (params: {
      reminderId: string;
      title?: string;
      description?: string | null;
      reminderDate?: string;
      reminderType?: string;
      isCompleted?: boolean;
    }) => {
      const { data, error } = await supabase.rpc('update_reminder', {
        p_reminder_id: params.reminderId,
        p_title: params.title ?? null,
        p_description: params.description ?? null,
        p_reminder_date: params.reminderDate ?? null,
        p_reminder_type: params.reminderType ?? null,
        p_is_completed: params.isCompleted ?? null,
      });
      if (error) throw error;
      return mapReminder(data);
    },
    /** Delete a reminder */
    delete: async (reminderId: string) => {
      const { data, error } = await supabase.rpc('delete_reminder', {
        p_reminder_id: reminderId,
      });
      if (error) throw error;
      return data;
    },
  },
};
