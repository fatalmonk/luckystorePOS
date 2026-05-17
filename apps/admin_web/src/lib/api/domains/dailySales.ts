import { supabase } from '../../supabase';
import type { DailySale, DailySaleFormData } from '../types';

export const dailySales = {
  list: async (storeId: string, filters?: { startDate?: string; endDate?: string }): Promise<DailySale[]> => {
    let query = supabase
      .from('daily_sales')
      .select('*')
      .eq('store_id', storeId)
      .order('sale_date', { ascending: false });

    if (filters?.startDate) query = query.gte('sale_date', filters.startDate);
    if (filters?.endDate) query = query.lte('sale_date', filters.endDate);

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      id: row.id,
      storeId: row.store_id,
      saleDate: row.sale_date,
      cashAmount: Number(row.cash_amount),
      bkashAmount: Number(row.bkash_amount),
      creditAmount: Number(row.credit_amount),
      totalSales: Number(row.total_sales),
      stockPurchase: Number(row.stock_purchase),
      dailyExpense: Number(row.daily_expense),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  create: async (storeId: string, form: DailySaleFormData): Promise<DailySale> => {
    const { data, error } = await supabase
      .from('daily_sales')
      .insert({
        store_id: storeId,
        sale_date: form.saleDate,
        cash_amount: form.cashAmount,
        bkash_amount: form.bkashAmount,
        credit_amount: form.creditAmount,
        total_sales: form.totalSales,
        stock_purchase: form.stockPurchase,
        daily_expense: form.dailyExpense,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      storeId: data.store_id,
      saleDate: data.sale_date,
      cashAmount: Number(data.cash_amount),
      bkashAmount: Number(data.bkash_amount),
      creditAmount: Number(data.credit_amount),
      totalSales: Number(data.total_sales),
      stockPurchase: Number(data.stock_purchase),
      dailyExpense: Number(data.daily_expense),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  update: async (id: string, updates: Partial<DailySaleFormData>): Promise<DailySale> => {
    const { data, error } = await supabase
      .from('daily_sales')
      .update({
        sale_date: updates.saleDate,
        cash_amount: updates.cashAmount,
        bkash_amount: updates.bkashAmount,
        credit_amount: updates.creditAmount,
        total_sales: updates.totalSales,
        stock_purchase: updates.stockPurchase,
        daily_expense: updates.dailyExpense,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      storeId: data.store_id,
      saleDate: data.sale_date,
      cashAmount: Number(data.cash_amount),
      bkashAmount: Number(data.bkash_amount),
      creditAmount: Number(data.credit_amount),
      totalSales: Number(data.total_sales),
      stockPurchase: Number(data.stock_purchase),
      dailyExpense: Number(data.daily_expense),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from('daily_sales').delete().eq('id', id);
    if (error) throw error;
  },
};