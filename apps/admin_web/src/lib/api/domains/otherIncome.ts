import { supabase } from "@/lib/supabase";
import type { Database } from '../../database.types';

export interface OtherIncome {
  id: string;
  tenantId: string;
  storeId?: string;
  date: string;
  category: 'Display Fee' | 'Delivery' | 'Miscellaneous';
  amount: number;
  paymentMethod: 'Cash' | 'bKash' | 'Bank';
  notes?: string;
  createdAt: string;
}

export interface OtherIncomeFormData {
  date: string;
  category: 'Display Fee' | 'Delivery' | 'Miscellaneous';
  amount: number;
  paymentMethod: 'Cash' | 'bKash' | 'Bank';
  notes?: string;
  storeId?: string;
}

type OtherIncomeRow = Database['public']['Tables']['other_income']['Row'];
type OtherIncomeInsert = Database['public']['Tables']['other_income']['Insert'];

function mapRow(row: OtherIncomeRow): OtherIncome {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    storeId: row.store_id ?? undefined,
    date: row.date,
    category: row.category as OtherIncome['category'],
    amount: Number(row.amount),
    paymentMethod: row.payment_method as OtherIncome['paymentMethod'],
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export const otherIncome = {
  list: async (tenantId: string, storeId?: string): Promise<OtherIncome[]> => {
    let query = supabase
      .from('other_income')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('date', { ascending: false });

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return ((data ?? []) as OtherIncomeRow[]).map(mapRow);
  },

  create: async (tenantId: string, form: OtherIncomeFormData): Promise<OtherIncome> => {
    const insert: OtherIncomeInsert = {
      tenant_id: tenantId,
      store_id: form.storeId || null,
      date: form.date,
      category: form.category as Database['public']['Enums']['other_income_category'],
      amount: form.amount,
      payment_method: form.paymentMethod as Database['public']['Enums']['other_income_payment_method'],
      notes: form.notes || null,
    };
    const { data, error } = await supabase
      .from('other_income')
      .insert(insert)
      .select()
      .single();

    if (error) throw error;

    return mapRow(data as OtherIncomeRow);
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('other_income')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
