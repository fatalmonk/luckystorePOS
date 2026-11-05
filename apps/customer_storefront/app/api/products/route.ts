import { NextRequest, NextResponse } from 'next/server';
import { createProductRepository, createProductId } from '../../lib/products/index';
import { CATALOG_SNAPSHOT_PRODUCTS } from '../../lib/products/getHomePageData';
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
  const requireFreshProduct = id !== null && searchParams.get('fresh') === '1';
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
    const { repo } = requireFreshProduct
      ? createProductRepository(supabase, { enableCache: false })
      : createProductRepository(supabase);

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
    console.error('GET /api/products: live catalog request failed; using browse-only snapshot when available', e);
    const snapshot = CATALOG_SNAPSHOT_PRODUCTS;
    if (id) {
      const fallback = snapshot.find((product) => product.id.toLowerCase() === id.toLowerCase());
      if (fallback) {
        return NextResponse.json({
          ...fallback,
          stock: 0,
          availabilityUnknown: true,
          catalogSnapshotFallback: true,
          degraded: true,
        });
      }
    } else if (snapshot.length > 0) {
      const normalizedQuery = query?.trim().toLowerCase();
      const matching = normalizedQuery
        ? snapshot.filter((product) =>
          [product.name, product.brand, product.category].some((value) => value?.toLowerCase().includes(normalizedQuery)),
        )
        : snapshot;
      const products = matching.slice(offset, offset + limit).map((product) => ({
        ...product,
        stock: 0,
        availabilityUnknown: true,
        productPath: `/product/${toProductSlug(product.name, product.id)}`,
      }));
      return NextResponse.json({
        products,
        hasMore: offset + limit < matching.length,
        offset,
        limit,
        catalogSnapshotFallback: true,
        degraded: true,
      });
    }
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
