import { NextRequest, NextResponse } from 'next/server';
import { getDealOfTheWeekProducts, getDiscountBadgePercentage, WEEKLY_DEALS_LIMIT } from '../../../lib/deals';
import { getHomePageData } from '../../../lib/products/getHomePageData';

export const dynamic = 'force-dynamic';

/** Return below-the-fold homepage data only when the visitor approaches those shelves. */
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale');
  if (locale !== 'en' && locale !== 'bn') {
    return NextResponse.json({ error: 'locale must be en or bn' }, { status: 400 });
  }

  try {
    const data = await getHomePageData(locale);
    const dealSelection = getDealOfTheWeekProducts(data.inStock, 8);
    const weeklyDealProducts = dealSelection
      ? [dealSelection.leadProduct, ...dealSelection.supportingProducts]
      : [];
    const discountedProductCount = Math.min(
      WEEKLY_DEALS_LIMIT,
      data.inStock.filter((product) => getDiscountBadgePercentage(product) !== null).length,
    );

    return NextResponse.json(
      {
        locale,
        pantryProducts: data.pantryProducts,
        snacksProducts: data.snacksProducts,
        personalCareProducts: data.personalCareProducts,
        weeklyDealProducts,
        discountedProductCount,
        weeklyPicks: data.weeklyPicks,
        weeklyEditionActive: data.weeklyEditionActive,
        weeklyEditionUnavailable: data.weeklyEditionUnavailable,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=600',
          'CDN-Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
        },
      },
    );
  } catch (error) {
    console.error('GET /api/home/deferred: failed to load homepage shelves', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return NextResponse.json(
      { error: 'Homepage sections are temporarily unavailable' },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}
