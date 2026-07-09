import { supabase } from "@/lib/supabase";
import type { Expense, ExpenseFormData, RecordExpenseResult, ExpenseCategory, ExpensePaymentType } from '../types';

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
};