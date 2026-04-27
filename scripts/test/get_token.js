import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hvmyxyccfnkrbxqbhlnm.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const email = 'temp_import_admin_' + Date.now() + '@luckystore.com';
  const password = 'TempPassword123!';
  
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  
  if (authErr) {
    console.error('Create User Error:', authErr);
    return;
  }
  
  const uid = authData.user.id;
  
  await supabase.from('users').upsert({
    id: uid,
    auth_id: uid,
    role: 'admin',
    pin: '0000',
    full_name: 'Temp Admin'
  });
  
  const supabaseClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
  const { data: sessionData, error: loginErr } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });
  
  if (loginErr) {
    console.error('Login Error:', loginErr);
    return;
  }
  
  console.log('JWT=' + sessionData.session.access_token);
}

run();
