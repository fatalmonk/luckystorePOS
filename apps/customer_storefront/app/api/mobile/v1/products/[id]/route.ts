import { NextRequest, NextResponse } from 'next/server';

import { getMobileProductDetail, type MobileLocale } from '../../../../../lib/mobile/product';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const locale = request.nextUrl.searchParams.get('locale') ?? 'en';
  if (locale !== 'en' && locale !== 'bn') {
    return NextResponse.json({ error: 'Unsupported locale' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  if (!id) {
    return NextResponse.json({ error: 'Product ID or slug required' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const result = await getMobileProductDetail(id, locale as MobileLocale);
  if (!result) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
