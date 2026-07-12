import { supabase } from "@/lib/supabase";
import type { Expense, ExpenseFormData, RecordExpenseResult, ExpenseCategory, ExpensePaymentType, ExpenseTemplate, ExpenseBatchItem } from '../types';

export const expenses = {
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
    return data as unknown as RecordExpenseResult;
  },
  recordBatch: async (storeId: string, list: ExpenseBatchItem[]) => {
    const { data, error } = await supabase.rpc('record_expense_batch', {
      p_store_id: storeId,
      p_expenses: list as any,
    });
    if (error) throw error;
    return data;
  },
  update: async (expenseId: string, updates: { expenseDate?: string; vendorName?: string; description?: string; amount?: number; paymentType?: string; category?: string }) => {
    // Only include defined fields to avoid overwriting columns with NULL
    const patch: Partial<{
      expense_date: string;
      vendor_name: string;
      description: string;
      amount: number;
      payment_type: string;
      category: string;
    }> = {};
    if (updates.expenseDate !== undefined) patch.expense_date = updates.expenseDate;
    if (updates.vendorName !== undefined) patch.vendor_name = updates.vendorName;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.amount !== undefined) patch.amount = updates.amount;
    if (updates.paymentType !== undefined) patch.payment_type = updates.paymentType;
    if (updates.category !== undefined) patch.category = updates.category;

    const { data, error } = await supabase
      .from('expenses')
      .update(patch)
      .eq('id', expenseId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  remove: async (expenseId: string) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);
    if (error) throw error;
  },

  // Templates
  listTemplates: async (storeId: string): Promise<ExpenseTemplate[]> => {
    const { data, error } = await supabase
      .from('expense_templates')
      .select('*')
      .eq('store_id', storeId)
      .order('is_pinned', { ascending: false })
      .order('name', { ascending: true });
    
    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      id: row.id,
      storeId: row.store_id,
      name: row.name,
      vendorName: row.vendor_name,
      description: row.description,
      amount: Number(row.amount),
      paymentType: row.payment_type as ExpensePaymentType,
      category: row.category as ExpenseCategory,
      isPinned: row.is_pinned,
      recurrenceInterval: row.recurrence_interval,
      recurrenceAnchorDate: row.recurrence_anchor_date,
      recurrenceDayOfMonth: row.recurrence_day_of_month,
      recurrenceDayOfWeek: row.recurrence_day_of_week,
      lastTriggeredAt: row.last_triggered_at,
      nextDueAt: row.next_due_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  getUpcomingRecurring: async (storeId: string, days: number = 7): Promise<ExpenseTemplate[]> => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + days);
    const maxDate = nextWeek.toISOString();
    
    const { data, error } = await supabase
      .from('expense_templates')
      .select('*')
      .eq('store_id', storeId)
      .neq('recurrence_interval', 'none')
      .lte('next_due_at', maxDate)
      .order('next_due_at', { ascending: true });
      
    if (error) throw error;
    
    return (data ?? []).map((row) => ({
      id: row.id,
      storeId: row.store_id ?? '',
      name: row.name ?? '',
      vendorName: row.vendor_name ?? '',
      description: row.description ?? '',
      amount: Number(row.amount ?? 0),
      paymentType: row.payment_type as any,
      category: row.category as any,
      isPinned: row.is_pinned ?? false,
      recurrenceInterval: row.recurrence_interval as 'none' | 'weekly' | 'monthly',
      recurrenceAnchorDate: row.recurrence_anchor_date,
      recurrenceDayOfMonth: row.recurrence_day_of_month,
      recurrenceDayOfWeek: row.recurrence_day_of_week,
      lastTriggeredAt: row.last_triggered_at,
      nextDueAt: row.next_due_at,
      createdAt: row.created_at ?? '',
      updatedAt: row.updated_at ?? '',
    }));
  },

  createTemplate: async (storeId: string, template: Partial<ExpenseTemplate>) => {
    const payload = {
      store_id: storeId,
      name: template.name,
      vendor_name: template.vendorName,
      description: template.description,
      amount: template.amount,
      payment_type: template.paymentType,
      category: template.category,
      is_pinned: template.isPinned ?? false,
      recurrence_interval: template.recurrenceInterval ?? 'none',
      recurrence_anchor_date: template.recurrenceAnchorDate,
      recurrence_day_of_month: template.recurrenceDayOfMonth,
      recurrence_day_of_week: template.recurrenceDayOfWeek,
      next_due_at: template.nextDueAt,
    };

    const { data, error } = await supabase
      .from('expense_templates')
      .insert(payload)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateTemplate: async (templateId: string, updates: Partial<ExpenseTemplate>) => {
    const patch: any = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.vendorName !== undefined) patch.vendor_name = updates.vendorName;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.amount !== undefined) patch.amount = updates.amount;
    if (updates.paymentType !== undefined) patch.payment_type = updates.paymentType;
    if (updates.category !== undefined) patch.category = updates.category;
    if (updates.isPinned !== undefined) patch.is_pinned = updates.isPinned;
    if (updates.recurrenceInterval !== undefined) patch.recurrence_interval = updates.recurrenceInterval;
    if (updates.recurrenceAnchorDate !== undefined) patch.recurrence_anchor_date = updates.recurrenceAnchorDate;
    if (updates.recurrenceDayOfMonth !== undefined) patch.recurrence_day_of_month = updates.recurrenceDayOfMonth;
    if (updates.recurrenceDayOfWeek !== undefined) patch.recurrence_day_of_week = updates.recurrenceDayOfWeek;
    if (updates.nextDueAt !== undefined) patch.next_due_at = updates.nextDueAt;
    
    const { data, error } = await supabase
      .from('expense_templates')
      .update(patch)
      .eq('id', templateId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  deleteTemplate: async (templateId: string) => {
    const { error } = await supabase
      .from('expense_templates')
      .delete()
      .eq('id', templateId);
    if (error) throw error;
  },
};