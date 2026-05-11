import { supabase } from '../../lib/supabase';

export const customerService = {
  async getCustomers(storeId: string, searchQuery?: string) {
    if (!storeId) throw new Error("Store ID is required");
    
    let query = supabase.from('customers').select('*').eq('store_id', storeId).order('name', { ascending: true });
    
    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};
