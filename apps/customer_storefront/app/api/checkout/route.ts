import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '../../lib/orders';
import { supabase } from '../../lib/supabase';

const CHECKOUT_RATE_LIMIT = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const FREE_DELIVERY_THRESHOLD = 500;
const FREE_DELIVERY_FEE = 40;
const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

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

/** Evict expired rate-limit entries to prevent Map growth in long-running containers */
function evictExpiredRateLimits() {
  const now = Date.now();
  for (const [ip, record] of CHECKOUT_RATE_LIMIT) {
    if (now > record.reset) CHECKOUT_RATE_LIMIT.delete(ip);
  }
}

interface CheckoutItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  unit?: string;
}

/** Fetch actual prices for the given item IDs from the database */
async function fetchDbPrices(itemIds: string[]): Promise<Map<string, { price: number; name: string }>> {
  const priceMap = new Map<string, { price: number; name: string }>();

  // Use the existing search_items_pos RPC (granted to anon) with empty query to get all items
  const { data, error } = await supabase.rpc('search_items_pos', {
    p_store_id: STORE_ID,
    p_query: '',
    p_category_id: null,
    p_limit: 1000,
    p_offset: 0,
  });

  if (error) throw new Error(`Failed to verify prices: ${error.message}`);

  for (const item of (data ?? []) as any[]) {
    const id = item.id ?? item.item_id;
    if (itemIds.includes(id)) {
      priceMap.set(id, { price: Number(item.price), name: item.name });
    }
  }

  return priceMap;
}

/** Validate that client-sent prices match database prices; return verified items with DB prices */
function verifyItems(clientItems: CheckoutItem[], dbPrices: Map<string, { price: number; name: string }>): CheckoutItem[] {
  const verified: CheckoutItem[] = [];

  for (const item of clientItems) {
    const dbEntry = dbPrices.get(item.id);
    if (!dbEntry) {
      throw new Error(`Item ${item.id} not found in catalog`);
    }
    // Always use DB price, ignore client-sent price
    verified.push({
      id: item.id,
      name: dbEntry.name, // Use DB name too
      price: dbEntry.price,
      qty: item.qty,
      unit: item.unit,
    });
  }

  return verified;
}

/** Calculate server-side totals from verified item prices */
function calculateTotals(items: CheckoutItem[]) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : FREE_DELIVERY_FEE;
  const discount = subtotal >= FREE_DELIVERY_THRESHOLD ? FREE_DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee - discount;
  return { subtotal, deliveryFee, discount, total };
}

export async function POST(req: NextRequest) {
  // Rate limit
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  evictExpiredRateLimits();
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const clientItems: CheckoutItem[] = body.items ?? [];

    if (!clientItems.length) {
      return NextResponse.json({ ok: false, error: 'Cart is empty' }, { status: 400 });
    }

    // Server-side price verification
    const itemIds = clientItems.map((item) => item.id);
    const dbPrices = await fetchDbPrices(itemIds);
    const verifiedItems = verifyItems(clientItems, dbPrices);
    const { subtotal, deliveryFee, total } = calculateTotals(verifiedItems);

    // Reject if client-sent total doesn't match server-calculated total (tolerance 0.01 taka)
    const clientTotal = Number(body.total ?? 0);
    if (Math.abs(clientTotal - total) > 0.01) {
      return NextResponse.json(
        { ok: false, error: 'Price mismatch — please refresh and try again' },
        { status: 400 }
      );
    }

    const now = new Date();
    const orderNumber = `LSO-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const order = await createOrder({
      orderNumber,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerAddress: body.customerAddress,
      notes: body.notes,
      deliverySlot: body.deliverySlot,
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
    });

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