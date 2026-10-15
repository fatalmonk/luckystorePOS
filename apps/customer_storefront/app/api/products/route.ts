import { NextRequest, NextResponse } from 'next/server';
import { createProductRepository, createProductId } from '../../lib/products/index';
import { supabase } from '../../lib/supabase';
import { toProductSlug } from '../../lib/products/slugify';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

/**
 * GET /api/products — List products with optional search and pagination
 * Query params:
 *   q      — search query (product name)
 *   id     — get single product by ID
 *   limit  — results per page (default 20, max 100)
 *   offset — exact non-negative pagination offset (default 0)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const query = searchParams.get('q') || undefined;
  const rawLimit = searchParams.get('limit');
  const rawOffset = searchParams.get('offset');
  const requestedLimit = rawLimit === null ? 20 : Number(rawLimit);
  const offset = rawOffset === null ? 0 : Number(rawOffset);
  if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1) {
    return NextResponse.json({ error: 'limit must be a positive integer' }, { status: 400 });
  }
  const limit = Math.min(requestedLimit, 100);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100_000) {
    return NextResponse.json({ error: 'offset must be a non-negative integer no greater than 100000' }, { status: 400 });
  }
  const page = Math.floor(offset / limit);

  try {
    const { repo } = createProductRepository(supabase);

    if (id) {
      const product = await repo.getById(createProductId(id));
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      return NextResponse.json(product);
    }

    const { products, hasMore } = await repo.search({ query, page, limit, offset });
    return NextResponse.json({
      products: products.map(product => ({
        ...product,
        productPath: `/product/${toProductSlug(product.name, product.id)}`,
      })),
      hasMore, offset, limit,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
