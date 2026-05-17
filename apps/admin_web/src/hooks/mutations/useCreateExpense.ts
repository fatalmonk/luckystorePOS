import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { ExpenseData } from '../../schemas/expense.schema';
import { useAuth } from '../../lib/AuthContext';

export function useCreateExpense() {
  const { storeId, tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ExpenseData) => {
      if (!storeId || !tenantId) throw new Error('Missing authentication context');

      const { data: result, error } = await supabase
        .from('expenses')
        .insert({
          tenant_id: tenantId,
          store_id: storeId,
          category_id: data.categoryId,
          amount: data.amount,
          description: data.description,
          date: data.date,
          payment_method: data.paymentMethod,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
    }
  });
}
