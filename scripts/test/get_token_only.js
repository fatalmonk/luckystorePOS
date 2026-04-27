import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hvmyxyccfnkrbxqbhlnm.supabase.co';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

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
