import { NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';

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
    
    const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    
    if (!connectionString) {
      console.error('Missing DATABASE_URL_UNPOOLED or DATABASE_URL environment variable');
      return NextResponse.json({ error: 'Database misconfigured' }, { status: 500 });
    }

    const pool = new Pool({ connectionString });
    
    const fullName = raw_user_meta_data?.full_name || '';
    
    // Update or insert the user profile row
    const query = `
      INSERT INTO public.users (id, email, full_name, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();
    `;
    
    await pool.query(query, [id, email, fullName]);
    await pool.end();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
