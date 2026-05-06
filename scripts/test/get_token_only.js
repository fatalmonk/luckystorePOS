import { createSupabaseClient } from '../lib/supabase-client.js';

const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createSupabaseClient(anonKey);

async function check() {
  const { data: sessionData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'temp_import_admin_1776869634261@luckystore.com',
    password: 'TempPassword123!'
  });
  
  if (loginErr) {
    console.error('Login Error:', loginErr);
    return;
  }
  
  console.log(sessionData.session.access_token);
}
check();
