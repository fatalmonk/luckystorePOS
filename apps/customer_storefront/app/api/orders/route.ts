import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '../../lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const ORDER_FIELDS = 'id,order_number,customer_name,customer_phone,customer_address,notes,items,subtotal,delivery_fee,total,status,payment_method,delivery_slot,created_at';
const TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const privateJson = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Order service is unavailable');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const orderNumber = req.nextUrl.searchParams.get('num')?.trim();
    const token = req.headers.get('x-order-tracking-token') ?? '';

    if (!user && (!orderNumber || !TOKEN_PATTERN.test(token))) {
      return privateJson({ ok: false, error: 'Unauthorized' }, 401);
    }

    const serviceClient = getServiceClient();

    if (orderNumber) {
      let order = null;
      if (user) {
        const { data, error } = await serviceClient
          .from('orders')
          .select(ORDER_FIELDS)
          .eq('order_number', orderNumber)
          .eq('customer_user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        order = data;
      }

      if (!order && TOKEN_PATTERN.test(token)) {
        const { data: tracking, error: trackingError } = await serviceClient
          .from('storefront_order_tracking')
          .select('order_id')
          .eq('token_hash', createHash('sha256').update(token).digest('hex'))
          .maybeSingle();
        if (trackingError) throw trackingError;

        if (tracking) {
          const { data, error } = await serviceClient
            .from('orders')
            .select(ORDER_FIELDS)
            .eq('id', tracking.order_id)
            .eq('order_number', orderNumber)
            .maybeSingle();
          if (error) throw error;
          order = data;
        }
      }

      if (!order) return privateJson({ ok: false, error: 'Order not found' }, 404);
      return privateJson({ ok: true, order });
    }

    if (!user) return privateJson({ ok: false, error: 'Unauthorized' }, 401);

    const { data: orders, error } = await serviceClient
      .from('orders')
      .select(ORDER_FIELDS)
      .eq('customer_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return privateJson({ ok: true, orders: orders ?? [] });
  } catch {
    return privateJson({ ok: false, error: 'Unable to load orders right now' }, 500);
  }
}
