import { supabase } from '../../supabase';

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

export const otherIncome = {
  list: async (tenantId: string, storeId?: string): Promise<OtherIncome[]> => {
    let query = (supabase as any)
      .from('other_income')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('date', { ascending: false });

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      storeId: row.store_id,
      date: row.date,
      category: row.category,
      amount: Number(row.amount),
      paymentMethod: row.payment_method,
      notes: row.notes,
      createdAt: row.created_at,
    }));
  },

  create: async (tenantId: string, form: OtherIncomeFormData): Promise<OtherIncome> => {
    const { data, error } = await (supabase as any)
      .from('other_income')
      .insert({
        tenant_id: tenantId,
        store_id: form.storeId || null,
        date: form.date,
        category: form.category,
        amount: form.amount,
        payment_method: form.paymentMethod,
        notes: form.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      tenantId: data.tenant_id,
      storeId: data.store_id,
      date: data.date,
      category: data.category,
      amount: Number(data.amount),
      paymentMethod: data.payment_method,
      notes: data.notes,
      createdAt: data.created_at,
    };
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await (supabase as any)
      .from('other_income')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
