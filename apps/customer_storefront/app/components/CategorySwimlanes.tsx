'use client';

import { ProductSwimlaneClient } from './ProductSwimlaneClient';
import { ProductGridClient } from './ProductGridClient';
import { PromoBanner } from './PromoBanner';
import { getCategoryGroup } from '../lib/types';
import { Fire, Star, Package } from '@phosphor-icons/react';
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
  searchParams: Record<string, string | string[] | undefined>;
}

export function CategorySwimlanes({
  categorySlug,
  group,
  products,
  theme,
  sort,
  categories,
  ad,
  searchParams,
}: CategorySwimlanesProps) {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const availabilityParam = Array.isArray(searchParams?.availability) 
    ? searchParams.availability[0] 
    : searchParams?.availability || '';
  const availability = availabilityParam ? availabilityParam.split(',') : [];

  const priceParam = Array.isArray(searchParams?.price) 
    ? searchParams.price[0] 
    : searchParams?.price || '';
  const priceRanges = priceParam ? priceParam.split(',').map((range) => {
    const [min, max] = range.split('-').map(Number);
    return { min, max };
  }) : [];

  let filtered = [...products];

  if (theme === 'deals') {
    filtered = filtered.filter((p) => p.originalPrice && p.originalPrice > p.price);
  } else if (theme === 'new') {
    filtered = filtered
      .filter((p) => p.created_at && new Date(p.created_at).getTime() > thirtyDaysAgo)
      .sort((a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime());
  } else if (theme === 'bestsellers') {
    filtered = filtered.filter((p) => p.stock > 10);
  }

  if (availability.length) {
    filtered = filtered.filter((p) => {
      if (availability.includes('in_stock') && p.stock > 5) return true;
      if (availability.includes('low_stock') && p.stock > 0 && p.stock <= 5) return true;
      if (availability.includes('out_of_stock') && p.stock === 0) return true;
      return false;
    });
  }

  if (priceRanges.length) {
    filtered = filtered.filter((p) =>
      priceRanges.some((range) => p.price >= range.min && p.price <= range.max)
    );
  }

  if (sort === 'price_asc') filtered.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') filtered.sort((a, b) => b.price - a.price);
  else if (sort === 'newest')
    filtered.sort((a, b) =>
      new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime()
    );

  const deals = products.filter((p) => p.originalPrice && p.originalPrice > p.price).slice(0, 8);
  const bestSellers = products.filter((p) => p.stock > 10).slice(0, 8);

  const subCategoryGrids = !group ? [] : group.subCategories
    .map((subSlug) => {
      const cat = categories.find((c) => c.slug === subSlug);
      const catName = cat?.name ?? subSlug;
      const catProducts = filtered.filter((p) => p.category === catName || p.category === subSlug);
      return {
        slug: subSlug,
        label: cat?.name || subSlug,
        icon: cat?.emoji || null,
        products: catProducts,
        count: catProducts.length,
      };
    })
    .filter((s) => s.products.length > 0);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 px-3">
        <p className="text-warm-muted">No products found</p>
      </div>
    );
  }

  if (group) {
    return (
      <>
        {deals.length > 0 && (
          <ProductSwimlaneClient
            title={<><Fire weight="fill" size={16} className="inline-block mr-1.5 text-red-500" aria-hidden="true" />Rollbacks & Deals</>}
            products={deals}
          />
        )}
        {subCategoryGrids.map((grid) => (
          <section key={grid.slug} className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {grid.icon ? (
                  <span className="text-xl" aria-hidden="true">{grid.icon}</span>
                ) : (
                  <Package weight="bold" size={20} aria-hidden="true" />
                )}
                <h2 className="text-lg font-bold tracking-tight">{grid.label}</h2>
              </div>
              <a
                href={`/category/${grid.slug}`}
                className="text-sm font-semibold text-warm-muted hover:text-warm-fg transition-colors"
              >
                See all ({grid.count})
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
          title={<><Fire weight="fill" size={16} className="inline-block mr-1.5 text-red-500" aria-hidden="true" />Rollbacks & Deals</>}
          products={deals}
          action={{ label: 'See all', href: `/category/${categorySlug}?theme=deals` }}
        />
      )}
      {bestSellers.length > 0 && (
        <ProductSwimlaneClient
          title={<><Star weight="fill" size={16} className="inline-block mr-1.5 text-warm-accent" aria-hidden="true" />Best Sellers</>}
          products={bestSellers}
          action={{ label: 'See all', href: `/category/${categorySlug}?theme=bestsellers` }}
          />
        )}
      {ad && <PromoBanner {...ad} />}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold tracking-tight">All Products</h2>
          <span className="text-sm text-warm-muted">{filtered.length} items</span>
        </div>
        <ProductGridClient products={filtered} />
      </section>
    </>
  );
}
