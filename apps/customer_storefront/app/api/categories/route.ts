import { NextResponse } from 'next/server';
import { getCachedCategoriesOrThrow } from '../../lib/products/getCachedCategories';

export const dynamic = 'force-dynamic';

/**
 * GET /api/categories — List all active product categories
 */
export async function GET() {
  try {
    const categories = await getCachedCategoriesOrThrow();
    return NextResponse.json({ categories });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
