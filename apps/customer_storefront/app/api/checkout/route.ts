import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '../../lib/orders';

const CHECKOUT_RATE_LIMIT = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

function checkRateLimit(ip: string): boolean {
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

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const now = new Date();
    const orderNumber = `LSO-${now.toISOString().slice(0,10).replace(/-/g,'')}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
    const order = await createOrder({ ...body, orderNumber });

    notifyAdminWeb(order).catch(console.error);
    sendWhatsApp(order).catch(console.error);

    return NextResponse.json({ ok: true, order });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 400 });
  }
}

async function notifyAdminWeb(order: any) {
  // TODO: webhook to admin_web
  console.log('Admin notification:', order);
}

async function sendWhatsApp(order: any) {
  // TODO: WhatsApp Cloud API
  console.log('WhatsApp notification:', order);
}
