import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function test() {
  const { data: cats, error: err1 } = await supabase.from('categories').select('id, slug, category, emoji').eq('active', true);
  console.log('Categories:', cats?.length, err1);

  const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';
  const { data: prods, error: err2 } = await supabase.rpc('search_items_pos', {
    p_store_id: STORE_ID,
    p_query: '',
    p_category_id: null,
    p_limit: 5,
    p_offset: 0,
  });
  console.log('Products:', prods?.length, err2);
}
test();
