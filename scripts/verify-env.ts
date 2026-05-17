import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

function verifyEnv() {
  console.log('Verifying Environment Contracts...\n');
  let hasErrors = false;

  const envPath = path.resolve(process.cwd(), 'apps/admin_web/.env.local');
  if (!fs.existsSync(envPath)) {
    console.error(`❌ FAILED: Expected environment file not found at ${envPath}`);
    hasErrors = true;
  } else {
    dotenv.config({ path: envPath });
    
    const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
    
    for (const v of requiredVars) {
      if (!process.env[v]) {
        console.error(`❌ FAILED: Missing required environment variable: ${v}`);
        hasErrors = true;
      } else {
        console.log(`✅ OK: ${v} is present.`);
        
        // Prevent service key leakage
        if (v === 'VITE_SUPABASE_ANON_KEY' && process.env[v]?.includes('service_role')) {
          console.error(`❌ CRITICAL FAILURE: VITE_SUPABASE_ANON_KEY contains a service role token!`);
          hasErrors = true;
        }
      }
    }
  }

  if (hasErrors) {
    console.error('\nEnvironment verification failed.');
    process.exit(1);
  } else {
    console.log('\nEnvironment verified successfully.');
  }
}

verifyEnv();
