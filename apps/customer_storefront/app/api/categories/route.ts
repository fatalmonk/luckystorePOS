import { NextResponse } from 'next/server';
import { fetchCategories } from '../../lib/products';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

/**
 * GET /api/categories — List all active product categories
 */
export async function GET() {
  try {
    const categories = await fetchCategories();
    return NextResponse.json({ categories });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}