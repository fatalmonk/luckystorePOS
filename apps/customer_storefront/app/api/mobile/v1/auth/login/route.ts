import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { formatUserData, validateEmail } from '../../../../../lib/mobile/auth';

const privateJson = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !validateEmail(email)) {
      return privateJson({ ok: false, error: 'Please enter a valid email address' }, 400);
    }
    if (!password) {
      return privateJson({ ok: false, error: 'Please enter your password' }, 400);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return privateJson({ ok: false, error: error.message }, 400);
    }

    if (!data.user || !data.session) {
      return privateJson({ ok: false, error: 'Authentication failed' }, 401);
    }

    return privateJson({
      ok: true,
      user: formatUserData(data.user),
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  } catch (err: any) {
    return privateJson({ ok: false, error: err.message || 'Login failed' }, 500);
  }
}
