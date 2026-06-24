'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductSwimlaneClient } from './ProductSwimlaneClient';
import { ProductGridClient } from './ProductGridClient';
import { NativeAdBanner } from './NativeAdBanner';
import { getCategoryGroup } from '../lib/types';
import type { Product } from '../lib/types';

interface NativeAdBannerProps {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
  bgImage?: string;
  bgColor?: string;
}

interface CategorySwimlanesProps {
  categorySlug: string;
  group?: ReturnType<typeof getCategoryGroup>;
  products: Product[];
  categories: { id: string; slug: string; name: string; emoji: string }[];
  theme: string;
  sort: string;
  ad?: NativeAdBannerProps;
}

export function CategorySwimlanes({
  categorySlug,
  group,
  products,
  theme,
  sort,
  categories,
  ad,
}: CategorySwimlanesProps) {
  const searchParams = useSearchParams();
  const [thirtyDaysAgo] = useState(() => Date.now() - 30 * 24 * 60 * 60 * 1000);

  const availabilityParam = searchParams.get('availability') || '';
  const availability = useMemo(
    () => (availabilityParam ? availabilityParam.split(',') : []),
    [availabilityParam]
  );

  const priceParam = searchParams.get('price') || '';
  const priceRanges = useMemo(() => {
    if (!priceParam) return [];
    return priceParam.split(',').map((range) => {
      const [min, max] = range.split('-').map(Number);
      return { min, max };
    });
  }, [priceParam]);

  const filtered = useMemo(() => {
    let list = [...products];

    if (theme === 'deals') {
      list = list.filter((p) => p.originalPrice && p.originalPrice > p.price);
    } else if (theme === 'new') {
      list = list
        .filter((p) => p.created_at && new Date(p.created_at).getTime() > thirtyDaysAgo)
        .sort((a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime());
    } else if (theme === 'bestsellers') {
      list = list.filter((p) => p.stock > 10);
    }

    if (availability.length) {
      list = list.filter((p) => {
        if (availability.includes('in_stock') && p.stock > 5) return true;
        if (availability.includes('low_stock') && p.stock > 0 && p.stock <= 5) return true;
        if (availability.includes('out_of_stock') && p.stock === 0) return true;
        return false;
      });
    }

    if (priceRanges.length) {
      list = list.filter((p) =>
        priceRanges.some((range) => p.price >= range.min && p.price <= range.max)
      );
    }

    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'newest')
      list.sort((a, b) =>
        new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime()
      );

    return list;
  }, [products, theme, availability, priceRanges, sort, thirtyDaysAgo]);

  const { deals, bestSellers } = useMemo(() => {
    const deals = products.filter((p) => p.originalPrice && p.originalPrice > p.price).slice(0, 8);
    const bestSellers = products.filter((p) => p.stock > 10).slice(0, 8);
    return { deals, bestSellers };
  }, [products]);

  const subCategoryGrids = useMemo(() => {
    if (!group) return [];
    return group.subCategories
      .map((subSlug) => {
        const cat = categories.find((c) => c.slug === subSlug);
        // Items store category as the name (e.g. "Biscuits & Cookies"), not the slug
        const catName = cat?.name ?? subSlug;
        const catProducts = filtered.filter((p) => p.category === catName || p.category === subSlug);
        return {
          slug: subSlug,
          label: cat?.name || subSlug,
          emoji: cat?.emoji || '📦',
          products: catProducts,
          count: catProducts.length,
        };
      })
      .filter((s) => s.products.length > 0);
  }, [filtered, group, categories]);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 px-3">
        <p className="text-gray-500">No products found</p>
      </div>
    );
  }

  if (group) {
    return (
      <>
        {deals.length > 0 && (
          <ProductSwimlaneClient
            title="🔥 Rollbacks &amp; Deals"
            products={deals}
          />
        )}
        {subCategoryGrids.map((grid) => (
          <section key={grid.slug} className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{grid.emoji}</span>
                <h2 className="text-lg font-bold tracking-tight">{grid.label}</h2>
              </div>
              <a
                href={`/category/${grid.slug}`}
                className="text-sm font-semibold text-[#78716c] hover:text-[#1c1917] transition-colors"
              >
                See all {grid.count}
              </a>
            </div>
            <ProductGridClient products={grid.products} />
          </section>
        ))}
      </>
    );
  }

  return (
    <>
      {deals.length > 0 && (
        <ProductSwimlaneClient
          title="🔥 Rollbacks &amp; Deals"
          products={deals}
          action={{ label: 'See all', href: `/category/${categorySlug}?theme=deals` }}
        />
      )}
      {bestSellers.length > 0 && (
        <ProductSwimlaneClient
          title="⭐ Best Sellers"
          products={bestSellers}
          action={{ label: 'See all', href: `/category/${categorySlug}?theme=bestsellers` }}
        />
      )}
      {ad && <NativeAdBanner {...ad} />}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold tracking-tight">All Products</h2>
          <span className="text-sm text-[#78716c]">{filtered.length} items</span>
        </div>
        <ProductGridClient products={filtered} />
      </section>
    </>
  );
}
