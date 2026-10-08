import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { formatUserData, validateEmail, validatePassword } from '../../../../../lib/mobile/auth';

const privateJson = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!name || name.length < 2) {
      return privateJson({ ok: false, error: 'Full name must be at least 2 characters' }, 400);
    }
    if (!email || !validateEmail(email)) {
      return privateJson({ ok: false, error: 'Please enter a valid email address' }, 400);
    }
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return privateJson({ ok: false, error: passwordCheck.error }, 400);
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone: phone || undefined,
        },
      },
    });

    if (error) {
      return privateJson({ ok: false, error: error.message }, 400);
    }

    if (!data.user) {
      return privateJson({ ok: false, error: 'Signup failed' }, 400);
    }

    return privateJson({
      ok: true,
      user: formatUserData(data.user),
      requiresEmailConfirmation: !data.session,
      token: data.session?.access_token || undefined,
      refreshToken: data.session?.refresh_token || undefined,
    });
  } catch (err: any) {
    return privateJson({ ok: false, error: err.message || 'Signup failed' }, 500);
  }
}
