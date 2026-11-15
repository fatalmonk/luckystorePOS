import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const OWNER_COOKIE = 'wishlist_owner';
const OWNER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const OWNER_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function getServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('Missing Supabase environment variables');
  }
  return key;
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getServiceRoleKey();
  if (!url) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function signOwnerId(ownerId: string, expiresAt: number) {
  return createHmac('sha256', getServiceRoleKey())
    .update(`lucky-store:wishlist-owner:v1:${ownerId}:${expiresAt}`)
    .digest('base64url');
}

function makeOwnerCookieValue(ownerId: string, expiresAt: number) {
  return `${ownerId}.${expiresAt}.${signOwnerId(ownerId, expiresAt)}`;
}

function getOwnerId(req: NextRequest): string | null {
  const value = req.cookies.get(OWNER_COOKIE)?.value;
  if (!value) return null;

  const [ownerId, expiryValue, signature, extra] = value.split('.');
  if (
    extra !== undefined ||
    !OWNER_ID_PATTERN.test(ownerId) ||
    !/^\d{10,}$/.test(expiryValue) ||
    !OWNER_ID_PATTERN.test(signature)
  ) {
    return null;
  }

  const expiresAt = Number(expiryValue);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;

  const expected = Buffer.from(signOwnerId(ownerId, expiresAt), 'base64url');
  const received = Buffer.from(signature, 'base64url');
  return received.length === expected.length && timingSafeEqual(received, expected) ? ownerId : null;
}

function createOwnerId() {
  return randomBytes(32).toString('base64url');
}

function setOwnerCookie(response: NextResponse, ownerId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + OWNER_COOKIE_MAX_AGE;
  response.cookies.set(OWNER_COOKIE, makeOwnerCookieValue(ownerId, expiresAt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/wishlist',
    maxAge: OWNER_COOKIE_MAX_AGE,
  });
}

function internalError(error: unknown) {
  console.error('Wishlist API error:', error);
  return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
}

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, productName, phone } = body ?? {};

    if (
      typeof productId !== 'string' || !productId ||
      typeof productName !== 'string' || !productName ||
      (phone !== undefined && typeof phone !== 'string')
    ) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 });
    }

    // Ownership is derived from a signed, HttpOnly cookie. Client-supplied
    // fingerprints are deliberately ignored.
    const existingOwnerId = getOwnerId(req);
    const ownerId = existingOwnerId ?? createOwnerId();
    const { data, error } = await getAdminClient()
      .from('wishlist')
      .insert({
        product_id: productId,
        customer_fingerprint: ownerId,
        product_name: productName,
        customer_phone: phone,
      })
      .select('id, product_id, product_name, customer_phone, created_at')
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

    const response = NextResponse.json({ ok: true, item: data });
    if (!existingOwnerId) setOwnerCookie(response, ownerId);
    return response;
  } catch (error) {
    return internalError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) return NextResponse.json({ ok: true, productIds: [] });

    const { data, error } = await getAdminClient()
      .from('wishlist')
      .select('product_id')
      .eq('customer_fingerprint', ownerId);

    if (error) throw error;
    return NextResponse.json({ ok: true, productIds: (data ?? []).map((item) => item.product_id) });
  } catch (error) {
    return internalError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) return NextResponse.json({ ok: true });

    const productId = new URL(req.url).searchParams.get('productId');
    if (!productId) {
      return NextResponse.json({ ok: false, error: 'productId required' }, { status: 400 });
    }

    const { error } = await getAdminClient()
      .from('wishlist')
      .delete()
      .eq('product_id', productId)
      .eq('customer_fingerprint', ownerId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return internalError(error);
  }
}
