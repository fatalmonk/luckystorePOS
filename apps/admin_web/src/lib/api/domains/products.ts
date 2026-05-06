import { supabase } from '../../supabase';
import type { ProductCreateInput, ProductUpdateInput } from '../types';

export const products = {
  list: async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*, categories(name)')
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
  update: async (id: string, updates: ProductUpdateInput) => {
    const { data, error } = await supabase.from('items').update(updates).eq('id', id).select().single();
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