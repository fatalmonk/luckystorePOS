import { supabase } from '../../supabase';
import type { ProductCreateInput, ProductUpdateInput } from '../types';

export const products = {
  list: async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*, categories(name)')
      .eq('active', true)
      .order('name');
    if (error) throw error;
    return data;
  },
  get: async (id: string) => {
    const { data, error } = await supabase.from('items').select('*, categories(*)').eq('id', id).single();
    if (error) throw error;
    return data;
  },
  create: async (product: ProductCreateInput) => {
    const { data, error } = await supabase.from('items').insert([product]).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, updates: ProductUpdateInput, storeId?: string) => {
    // If updating price/mrp/cost, use the RPC for proper JSON return
    if (storeId && (updates.price !== undefined || updates.mrp !== undefined || updates.cost !== undefined)) {
      const { data, error } = await supabase.rpc('update_item_prices', {
        p_item_id: id,
        p_store_id: storeId,
        p_price: updates.price ?? null,
        p_mrp: updates.mrp ?? null,
        p_cost: updates.cost ?? null,
      });
      if (error) throw error;
      return data;
    }
    // Otherwise fall back to direct update
    const { data, error } = await supabase.from('items').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  remove: async (id: string) => {
    const { data, error } = await supabase.from('items').update({ active: false }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

export const categories = {
  list: async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    return data;
  },
};