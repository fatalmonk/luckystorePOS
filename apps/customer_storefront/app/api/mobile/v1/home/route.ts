import { NextRequest, NextResponse } from 'next/server';

import { getMobileHome, type MobileLocale } from '../../../../lib/mobile/home';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') ?? 'en';
  if (locale !== 'en' && locale !== 'bn') {
    return NextResponse.json({ error: 'Unsupported locale' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  const body = await getMobileHome(locale as MobileLocale);
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
