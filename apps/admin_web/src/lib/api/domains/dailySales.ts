import { supabase } from "@/lib/supabase";
import { query, queryOne } from "@/lib/neon";
import type { DailySale, DailySaleFormData } from '../types';

export const dailySales = {
  list: async (storeId: string, filters?: { startDate?: string; endDate?: string }): Promise<DailySale[]> => {
    // Neon read replica via Worker proxy
    let rows: any[];

    if (filters?.startDate && filters?.endDate) {
      rows = await query<any>(
        `SELECT * FROM daily_sales
         WHERE store_id = $1
           AND sale_date >= $2
           AND sale_date <= $3
         ORDER BY sale_date DESC`,
        [storeId, filters.startDate, filters.endDate]
      );
    } else if (filters?.startDate) {
      rows = await query<any>(
        `SELECT * FROM daily_sales
         WHERE store_id = $1
           AND sale_date >= $2
         ORDER BY sale_date DESC`,
        [storeId, filters.startDate]
      );
    } else if (filters?.endDate) {
      rows = await query<any>(
        `SELECT * FROM daily_sales
         WHERE store_id = $1
           AND sale_date <= $2
         ORDER BY sale_date DESC`,
        [storeId, filters.endDate]
      );
    } else {
      rows = await query<any>(
        `SELECT * FROM daily_sales
         WHERE store_id = $1
         ORDER BY sale_date DESC`,
        [storeId]
      );
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
    const data = await queryOne<any>(
      `INSERT INTO daily_sales (
        store_id, sale_date, cash_amount, bkash_amount, credit_amount,
        total_sales, stock_purchase, daily_expense
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        storeId, form.saleDate, form.cashAmount, form.bkashAmount, form.creditAmount,
        form.totalSales, form.stockPurchase, form.dailyExpense
      ]
    );
    if (!data) throw new Error("Failed to create daily sale");
    
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
    const setKeys = [];
    const values = [];
    let i = 1;

    if (updates.saleDate !== undefined) { setKeys.push(`sale_date = $${i++}`); values.push(updates.saleDate); }
    if (updates.cashAmount !== undefined) { setKeys.push(`cash_amount = $${i++}`); values.push(updates.cashAmount); }
    if (updates.bkashAmount !== undefined) { setKeys.push(`bkash_amount = $${i++}`); values.push(updates.bkashAmount); }
    if (updates.creditAmount !== undefined) { setKeys.push(`credit_amount = $${i++}`); values.push(updates.creditAmount); }
    if (updates.totalSales !== undefined) { setKeys.push(`total_sales = $${i++}`); values.push(updates.totalSales); }
    if (updates.stockPurchase !== undefined) { setKeys.push(`stock_purchase = $${i++}`); values.push(updates.stockPurchase); }
    if (updates.dailyExpense !== undefined) { setKeys.push(`daily_expense = $${i++}`); values.push(updates.dailyExpense); }

    if (setKeys.length === 0) throw new Error('No fields to update');
    
    values.push(id);
    let sql = `UPDATE daily_sales SET ${setKeys.join(', ')} WHERE id = $${i++}`;
    if (storeId) {
      sql += ` AND store_id = $${i++}`;
      values.push(storeId);
    }
    sql += ` RETURNING *`;

    const data = await queryOne<any>(sql, values);
    if (!data) throw new Error("Failed to update daily sale");
    
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
    await query(`DELETE FROM daily_sales WHERE id = $1`, [id]);
  },
};