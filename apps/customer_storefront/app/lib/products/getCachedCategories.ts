import { cache } from 'react';
import { supabase } from '../supabase';
import { createProductRepository } from './index';

export const getCachedCategories = cache(async () => {
  const { repo } = createProductRepository(supabase);
  return repo.getCategories();
});
