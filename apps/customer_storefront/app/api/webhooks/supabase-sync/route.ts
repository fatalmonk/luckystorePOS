import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const WEBHOOK_SECRET = process.env.SUPABASE_SYNC_WEBHOOK_SECRET || 'my-super-secret-webhook-key';

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('x-webhook-secret');

    if (signature !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();

    if (!payload.id || !payload.email) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { id, email, raw_user_meta_data } = payload;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.error('Missing Supabase env vars');
      return NextResponse.json({ error: 'Database misconfigured' }, { status: 500 });
    }

    // Service role client — bypasses RLS, safe for server-side webhook use
    const supabase = createClient(supabaseUrl, serviceKey);
    const fullName = raw_user_meta_data?.full_name || '';

    const { error } = await supabase.from('users').upsert(
      { id, email, full_name: fullName, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
