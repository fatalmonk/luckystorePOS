import { NextResponse } from 'next/server';
import { createProductRepository } from '../../lib/products/index';
import { supabase } from '../../lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

/**
 * GET /api/categories — List all active product categories
 */
export async function GET() {
  try {
    const { repo } = createProductRepository(supabase);
    const categories = await repo.getCategories();
    return NextResponse.json({ categories });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}