import { supabase } from "@/lib/supabase";
import { sql } from "@/lib/neon";
import type { DailySale, DailySaleFormData } from '../types';

export const dailySales = {
  list: async (storeId: string, filters?: { startDate?: string; endDate?: string }): Promise<DailySale[]> => {
    // Neon read replica
    let rows: any[];

    if (filters?.startDate && filters?.endDate) {
      rows = await sql`
        SELECT * FROM daily_sales
        WHERE store_id = ${storeId}
          AND sale_date >= ${filters.startDate}
          AND sale_date <= ${filters.endDate}
        ORDER BY sale_date DESC
      `;
    } else if (filters?.startDate) {
      rows = await sql`
        SELECT * FROM daily_sales
        WHERE store_id = ${storeId}
          AND sale_date >= ${filters.startDate}
        ORDER BY sale_date DESC
      `;
    } else if (filters?.endDate) {
      rows = await sql`
        SELECT * FROM daily_sales
        WHERE store_id = ${storeId}
          AND sale_date <= ${filters.endDate}
        ORDER BY sale_date DESC
      `;
    } else {
      rows = await sql`
        SELECT * FROM daily_sales
        WHERE store_id = ${storeId}
        ORDER BY sale_date DESC
      `;
    }

    return (rows ?? []).map((row) => ({
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