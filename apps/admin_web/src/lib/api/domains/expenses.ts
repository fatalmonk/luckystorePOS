import { supabase } from '../../supabase';
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
    return data as RecordExpenseResult;
  },
};