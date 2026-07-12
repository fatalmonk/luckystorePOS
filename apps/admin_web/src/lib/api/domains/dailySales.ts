import { supabase } from "@/lib/supabase";
import type { DailySale, DailySaleFormData } from '../types';

export const dailySales = {
  list: async (storeId: string, filters?: { startDate?: string; endDate?: string }): Promise<DailySale[]> => {
    let q = supabase
      .from('daily_sales')
      .select('*')
      .eq('store_id', storeId)
      .order('sale_date', { ascending: false });

    if (filters?.startDate) q = q.gte('sale_date', filters.startDate);
    if (filters?.endDate)   q = q.lte('sale_date', filters.endDate);

    const { data, error } = await q;
    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: row.id,
      storeId: row.store_id ?? '',
      saleDate: row.sale_date ?? '',
      cashAmount: Number(row.cash_amount ?? 0),
      bkashAmount: Number(row.bkash_amount ?? 0),
      creditAmount: Number(row.credit_amount ?? 0),
      totalSales: Number(row.total_sales ?? 0),
      stockPurchase: Number(row.stock_purchase ?? 0),
      dailyExpense: Number(row.daily_expense ?? 0),
      createdAt: row.created_at ?? '',
      updatedAt: row.updated_at ?? '',
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
    if (!data) throw new Error('Failed to create daily sale');

    return {
      id: data.id,
      storeId: data.store_id ?? '',
      saleDate: data.sale_date ?? '',
      cashAmount: Number(data.cash_amount ?? 0),
      bkashAmount: Number(data.bkash_amount ?? 0),
      creditAmount: Number(data.credit_amount ?? 0),
      totalSales: Number(data.total_sales ?? 0),
      stockPurchase: Number(data.stock_purchase ?? 0),
      dailyExpense: Number(data.daily_expense ?? 0),
      createdAt: data.created_at ?? '',
      updatedAt: data.updated_at ?? '',
    };
  },

  update: async (id: string, updates: Partial<DailySaleFormData>, storeId?: string): Promise<DailySale> => {
    const payload: Record<string, unknown> = {};
    if (updates.saleDate !== undefined)     payload.sale_date     = updates.saleDate;
    if (updates.cashAmount !== undefined)   payload.cash_amount   = updates.cashAmount;
    if (updates.bkashAmount !== undefined)  payload.bkash_amount  = updates.bkashAmount;
    if (updates.creditAmount !== undefined) payload.credit_amount = updates.creditAmount;
    if (updates.totalSales !== undefined)   payload.total_sales   = updates.totalSales;
    if (updates.stockPurchase !== undefined) payload.stock_purchase = updates.stockPurchase;
    if (updates.dailyExpense !== undefined)  payload.daily_expense  = updates.dailyExpense;

    if (Object.keys(payload).length === 0) throw new Error('No fields to update');

    let q = supabase.from('daily_sales').update(payload as any).eq('id', id);
    if (storeId) q = q.eq('store_id', storeId);

    const { data, error } = await q.select().single();
    if (error) throw error;
    if (!data) throw new Error('Failed to update daily sale');

    return {
      id: data.id,
      storeId: data.store_id ?? '',
      saleDate: data.sale_date ?? '',
      cashAmount: Number(data.cash_amount ?? 0),
      bkashAmount: Number(data.bkash_amount ?? 0),
      creditAmount: Number(data.credit_amount ?? 0),
      totalSales: Number(data.total_sales ?? 0),
      stockPurchase: Number(data.stock_purchase ?? 0),
      dailyExpense: Number(data.daily_expense ?? 0),
      createdAt: data.created_at ?? '',
      updatedAt: data.updated_at ?? '',
    };
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from('daily_sales').delete().eq('id', id);
    if (error) throw error;
  },
};