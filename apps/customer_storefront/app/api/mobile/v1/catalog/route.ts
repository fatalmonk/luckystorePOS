import { NextRequest, NextResponse } from 'next/server';

import { getMobileCatalog, type MobileCatalogSort, type MobileLocale } from '../../../../lib/mobile/catalog';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') ?? 'en';
  if (locale !== 'en' && locale !== 'bn') {
    return NextResponse.json({ error: 'Unsupported locale' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const category = searchParams.get('category') || undefined;
  const q = searchParams.get('q') || undefined;
  const sort = (searchParams.get('sort') as MobileCatalogSort) || 'best';
  const inStockOnly = searchParams.get('inStockOnly') === 'true';

  const rawLimit = searchParams.get('limit');
  const limit = rawLimit ? parseInt(rawLimit, 10) : undefined;
  if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 60)) {
    return NextResponse.json({ error: 'Limit must be between 1 and 60' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const rawOffset = searchParams.get('offset');
  const offset = rawOffset ? parseInt(rawOffset, 10) : undefined;
  if (offset !== undefined && (isNaN(offset) || offset < 0)) {
    return NextResponse.json({ error: 'Offset must be non-negative integer' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const body = await getMobileCatalog({
    locale: locale as MobileLocale,
    category,
    q,
    sort,
    inStockOnly,
    limit,
    offset,
  });

  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
