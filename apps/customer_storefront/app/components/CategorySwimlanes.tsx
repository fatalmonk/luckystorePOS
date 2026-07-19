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

  const subCategoryItems = !group ? [] : group.subCategories.map((subSlug) => {
    const cat = categories.find((c) => c.slug === subSlug);
    const catName = cat?.name ?? subSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const catProducts = filtered.filter((p) => p.category === catName || p.category === subSlug || p.category === cat?.name);
    return {
      slug: subSlug,
      label: catName,
      icon: cat?.emoji || '📦',
      count: catProducts.length,
    };
  });

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
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold tracking-tight">Sub Categories</h2>
            <span className="text-xs font-semibold text-warm-muted">{subCategoryItems.length} categories</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {subCategoryItems.map((sub) => (
              <a
                key={sub.slug}
                href={`/category/${sub.slug}`}
                className="group flex flex-col items-center justify-center p-4 rounded-2xl bg-warm-surface border border-warm-border/60 hover:border-warm-accent/80 shadow-warm-sm hover:shadow-warm-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 text-center"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-warm-surface-hover/80 flex items-center justify-center text-3xl sm:text-4xl mb-2.5 group-hover:scale-110 transition-transform duration-200 shadow-inner">
                  {sub.icon}
                </div>
                <h3 className="font-extrabold text-xs sm:text-sm text-warm-fg line-clamp-1 group-hover:text-warm-fg-strong transition-colors">
                  {sub.label}
                </h3>
                <span className="text-[11px] font-semibold text-warm-muted mt-0.5">
                  {sub.count} {sub.count === 1 ? 'item' : 'items'}
                </span>
              </a>
            ))}
          </div>
        </section>
        {filtered.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold tracking-tight">All {group.label} Products</h2>
              <span className="text-sm text-warm-muted">{filtered.length} items</span>
            </div>
            <ProductGridClient products={filtered} />
          </section>
        )}
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
