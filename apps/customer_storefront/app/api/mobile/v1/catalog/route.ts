import { randomUUID } from 'node:crypto';
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

  const correlationId = randomUUID();
  const startedAt = performance.now();
  try {
    const body = await getMobileCatalog({
      locale: locale as MobileLocale,
      category,
      q,
      sort,
      inStockOnly,
      limit,
      offset,
    });
    const response = NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
    const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
    response.headers.set('X-Correlation-ID', correlationId);
    response.headers.set('Server-Timing', `mobile-catalog;dur=${durationMs}`);

    // Keep successful request logs low-volume. Only aggregate metadata is logged.
    if (Math.random() < 0.01) {
      const responseBytes = (await response.clone().arrayBuffer()).byteLength;
      console.info('storefront_mobile_catalog', {
        endpoint: '/api/mobile/v1/catalog',
        rpc: 'search_storefront_mobile_catalog_v1',
        correlation_id: correlationId,
        duration_ms: durationMs,
        returned_rows: body.items.length,
        response_bytes: responseBytes,
        errors: 0,
        cache_status: 'not_exposed_by_next_data_cache',
      });
    }
    return response;
  } catch (error) {
    const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
    console.error('storefront_mobile_catalog_error', {
      endpoint: '/api/mobile/v1/catalog',
      correlation_id: correlationId,
      error_type: error instanceof Error ? error.name : 'unknown',
      errors: 1,
    });
    return NextResponse.json(
      { error: 'Catalog temporarily unavailable' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'X-Correlation-ID': correlationId,
          'Server-Timing': `mobile-catalog;dur=${durationMs}`,
        },
      },
    );
  }
}
