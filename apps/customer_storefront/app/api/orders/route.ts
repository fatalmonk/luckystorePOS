import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '../../lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const phone = user.user_metadata?.phone;
    const fullName = user.user_metadata?.full_name;

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    let query = serviceClient
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    const filters = [];
    if (phone) {
      const cleanPhone = phone.replace(/[\s-]/g, '');
      const shortPhone = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;
      filters.push(`customer_phone.ilike.%${shortPhone}%`);
    }
    if (fullName) {
      filters.push(`customer_name.ilike.%${fullName}%`);
    }

    if (filters.length === 0) {
      return NextResponse.json({ ok: true, orders: [] });
    }

    const { data: orders, error } = await query.or(filters.join(','));

    if (error) throw error;

    return NextResponse.json({ ok: true, orders });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
