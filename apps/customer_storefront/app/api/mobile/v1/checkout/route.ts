import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createOrder } from '../../../../lib/orders';
import { supabase } from '../../../../lib/supabase';
import { createClient as createServerClient } from '../../../../lib/supabase/server';
import { calculateOrderTotals, generateOrderNumber } from '../../../../lib/mobile/checkout';

const CHECKOUT_RATE_LIMIT = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const MAX_RATE_LIMIT_ENTRIES = 5000;
const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

function evictExpiredRateLimits() {
  const now = Date.now();
  for (const [key, val] of CHECKOUT_RATE_LIMIT) {
    if (now > val.reset) CHECKOUT_RATE_LIMIT.delete(key);
  }
}

function getClientIp(req: NextRequest): string {
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
  }

  return 'unknown';
}

function checkRateLimit(ip: string): boolean {
  evictExpiredRateLimits();
  if (CHECKOUT_RATE_LIMIT.size >= MAX_RATE_LIMIT_ENTRIES && !CHECKOUT_RATE_LIMIT.has(ip)) {
    return false;
  }
  const now = Date.now();
  const record = CHECKOUT_RATE_LIMIT.get(ip);
  if (!record || now > record.reset) {
    CHECKOUT_RATE_LIMIT.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) return false;
  record.count++;
  return true;
}

interface CheckoutItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  unit?: string;
}

async function fetchDbPrices(itemIds: string[]): Promise<Map<string, { price: number; name: string }>> {
  const priceMap = new Map<string, { price: number; name: string }>();
  const needed = new Set(itemIds);
  const pageSize = 500;
  let offset = 0;

  while (needed.size > priceMap.size) {
    const { data, error } = await supabase.rpc('search_storefront_catalog', {
      p_store_id: STORE_ID,
      p_query: '',
      p_category_id: null,
      p_limit: pageSize,
      p_offset: offset,
    });

    if (error) throw new Error(`Failed to verify prices: ${error.message}`);
    const rows = (data ?? []) as any[];
    if (rows.length === 0) break;

    for (const item of rows) {
      const id = item.id ?? item.item_id;
      if (needed.has(id)) {
        priceMap.set(id, { price: Number(item.price), name: item.name });
      }
    }

    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return priceMap;
}

function verifyItems(clientItems: CheckoutItem[], dbPrices: Map<string, { price: number; name: string }>): CheckoutItem[] {
  const verified: CheckoutItem[] = [];

  for (const item of clientItems) {
    const dbEntry = dbPrices.get(item.id);
    if (!dbEntry) {
      throw new Error(`Item ${item.id} not found in catalog`);
    }
    verified.push({
      id: item.id,
      name: dbEntry.name,
      price: dbEntry.price,
      qty: item.qty,
      unit: item.unit,
    });
  }

  return verified;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '';
    const clientItems: CheckoutItem[] = body.items ?? [];

    if (!clientItems.length) {
      return NextResponse.json({ ok: false, error: 'Cart is empty' }, { status: 400 });
    }

    const itemIds = clientItems.map((item) => item.id);
    const dbPrices = await fetchDbPrices(itemIds);
    const verifiedItems = verifyItems(clientItems, dbPrices);
    const { subtotal, deliveryFee, total } = calculateOrderTotals(verifiedItems);

    const clientTotal = Number(body.total ?? 0);
    if (Math.abs(clientTotal - total) > 0.01) {
      return NextResponse.json(
        {
          ok: false,
          code: 'PRICE_MISMATCH',
          error: 'Some prices changed. Review the updated total before placing your order.',
          items: verifiedItems,
          subtotal,
          deliveryFee,
          total,
        },
        { status: 400 }
      );
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
      return NextResponse.json({ ok: false, error: 'Invalid idempotency key' }, { status: 400 });
    }

    const orderNumber = typeof body.orderNumber === 'string' && body.orderNumber.trim()
      ? body.orderNumber.trim()
      : generateOrderNumber();

    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    let requestClient;
    if (bearerToken) {
      requestClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
            },
          },
          auth: { persistSession: false },
        }
      );
      const { error: userError } = await requestClient.auth.getUser(bearerToken);
      if (userError) {
        return NextResponse.json(
          { ok: false, error: 'Invalid or expired session. Please sign in again.' },
          { status: 401 }
        );
      }
    } else {
      requestClient = await createServerClient();
      const { error: authError } = await requestClient.auth.getUser();
      if (
        authError &&
        authError.name !== 'AuthSessionMissingError' &&
        !authError.message?.includes('Auth session missing') &&
        !authError.message?.includes('session')
      ) {
        return NextResponse.json({ ok: false, error: 'Unable to verify your account. Please try again.' }, { status: 503 });
      }
    }

    const cleanPhone = typeof body.customerPhone === 'string' ? body.customerPhone.replace(/[\s-]/g, '') : '';

    const order = await createOrder({
      orderNumber,
      customerName: body.customerName,
      customerPhone: cleanPhone,
      customerAddress: body.customerAddress,
      notes: body.notes,
      deliverySlot: body.deliverySlot,
      paymentMethod: body.paymentMethod || 'cod',
      items: verifiedItems.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        unit: item.unit,
      })),
      subtotal,
      deliveryFee,
      total,
      idempotencyKey,
    }, requestClient);

    return NextResponse.json({
      ok: true,
      order: {
        ...order,
        trackingToken: typeof order.trackingToken === 'string' ? order.trackingToken : undefined,
      },
    }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  } catch (e: any) {
    console.error('Mobile checkout error:', e);
    return NextResponse.json(
      { ok: false, error: 'Checkout request could not be processed. Please try again.' },
      { status: 400 }
    );
  }
}
