import { cache } from 'react';
import { supabase } from '../supabase';
import { createProductRepository } from './index';

export const getCachedCategories = cache(async () => {
  try {
    const { repo } = createProductRepository(supabase);
    return await repo.getCategories();
  } catch (err) {
    console.error('Failed to get cached categories:', err);
    return [];
  }
});
