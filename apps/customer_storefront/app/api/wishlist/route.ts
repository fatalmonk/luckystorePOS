import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, fingerprint, productName, phone } = body;

    if (!productId || !fingerprint || !productName) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 });
    }

    const { data, error } = await getAdminClient()
      .from('wishlist')
      .insert({
        product_id: productId,
        customer_fingerprint: fingerprint,
        product_name: productName,
        customer_phone: phone,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ ok: false, error: 'Already on wishlist' }, { status: 409 });
      }
      if (error.code === '23503') {
        return NextResponse.json({ ok: false, error: 'Invalid product' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ ok: true, item: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fingerprint = searchParams.get('fingerprint');
    if (!fingerprint) {
      return NextResponse.json({ ok: false, error: 'fingerprint required' }, { status: 400 });
    }

    const { data, error } = await getAdminClient()
      .from('wishlist')
      .select('product_id')
      .eq('customer_fingerprint', fingerprint);

    if (error) throw error;
    return NextResponse.json({ ok: true, productIds: (data ?? []).map((d) => d.product_id) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const fingerprint = searchParams.get('fingerprint');

    if (!productId || !fingerprint) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 });
    }

    const { error } = await getAdminClient()
      .from('wishlist')
      .delete()
      .eq('product_id', productId)
      .eq('customer_fingerprint', fingerprint);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}