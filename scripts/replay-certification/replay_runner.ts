// scripts/replay-certification/replay_runner.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), 'apps/admin_web/.env.local') });

const url = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
}

export const client = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export interface ReplayOp {
  rpc: string;
  params: any;
}

export async function replay(trace: ReplayOp[]) {
  for (const op of trace) {
    const { rpc, params } = op;
    const { data, error } = await client.rpc(rpc, params);
    if (error) {
      console.error(`[REPLAY] RPC ${rpc} failed:`, error.message);
      throw error;
    }
    console.log(`[REPLAY] RPC ${rpc} success:`, JSON.stringify(data));
  }
}
