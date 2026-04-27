import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hvmyxyccfnkrbxqbhlnm.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  const email = 'temp_import_admin_' + Date.now() + '@luckystore.com';
  const password = 'TempPassword123!';
  
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  
  const uid = authData.user.id;
  
  const { error: upsertErr } = await supabase.from('users').upsert({
    id: uid,
    auth_id: uid,
    role: 'admin',
    email: email,
    full_name: 'Temp Admin',
    store_id: '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd' // using known store_id
  });
  
  if (upsertErr) {
    console.error("UPSERT ERROR:", upsertErr);
  } else {
    console.log("UPSERT SUCCESS", email, password);
  }
}
check();
