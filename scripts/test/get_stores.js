import { createSupabaseClient } from '../lib/supabase-client.js';

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createSupabaseClient(serviceRoleKey);

async function check() {
  const { data, error } = await supabase.from('stores').select('*');
  console.log(data, error);
}
check();
