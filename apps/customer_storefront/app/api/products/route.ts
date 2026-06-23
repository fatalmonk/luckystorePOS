import { NextRequest, NextResponse } from 'next/server';
import { fetchProducts, fetchProductById } from '../../lib/products';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

/**
 * GET /api/products — List products with optional search and pagination
 * Query params:
 *   q      — search query (product name)
 *   id     — get single product by ID
 *   limit  — max results (default 20, max 100)
 *   offset — pagination offset (default 0), converted to page number
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const query = searchParams.get('q') || undefined;
  const limit = Math.min(Number(searchParams.get('limit') || 20), 100);
  const offset = Number(searchParams.get('offset') || 0);
  const page = Math.floor(offset / limit);

  try {
    if (id) {
      const product = await fetchProductById(id);
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      return NextResponse.json(product);
    }

    const { products, hasMore } = await fetchProducts(query, undefined, undefined, page, limit);
    return NextResponse.json({ products, hasMore, offset, limit });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}