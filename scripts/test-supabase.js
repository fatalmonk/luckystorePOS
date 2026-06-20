require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('categories').select('id, slug, category, emoji').eq('active', true);
  console.log('Categories:', data, error);
}
test();
