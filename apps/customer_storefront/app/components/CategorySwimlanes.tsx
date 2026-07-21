'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProductSwimlaneClient } from './ProductSwimlaneClient';
import { ProductGridClient } from './ProductGridClient';
import { PromoBanner } from './PromoBanner';
import { getCategoryGroup } from '../lib/types';
import { Fire, Star, Package } from '@phosphor-icons/react';
import type { Product } from '../lib/types';

const ICE_CREAM_SLUGS = ['ice-cream', 'snacks'];

function getSingleBrand(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function normalizeBrand(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function BrandFilterBar({ products, selectedBrand }: { products: Product[]; selectedBrand?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedNormalized = normalizeBrand(selectedBrand);

  const counts = products.reduce((acc, p) => {
    const brand = p.brand || 'Others';
    acc[brand] = (acc[brand] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const brands = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([brand]) => brand);

  if (brands.length <= 1) return null;

  const handleClick = (brand: string | null) => {
    const nextParams = new URLSearchParams(params?.toString() ?? '');
    if (brand) {
      nextParams.set('brand', brand);
    } else {
      nextParams.delete('brand');
    }
    router.push(`${pathname}${nextParams.toString() ? `?${nextParams.toString()}` : ''}`, { scroll: false });
  };

  const chipBase = 'flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-bold border transition-all duration-200 whitespace-nowrap';

  if (!mounted) {
    return (
      <section className="mb-5" aria-hidden="true">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-extrabold tracking-tight text-warm-fg">Shop by Brand</h3>
          <span className="text-xs font-semibold text-warm-muted">{brands.length} brands</span>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide scroll-edge-mask pb-1">
          <div className={`${chipBase} bg-warm-surface text-warm-fg border-warm-border/60`}>All ({products.length})</div>
          {brands.map((brand) => (
            <div key={brand} className={`${chipBase} bg-warm-surface text-warm-fg border-warm-border/60`}>
              {brand} ({counts[brand]})
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-extrabold tracking-tight text-warm-fg">Shop by Brand</h3>
        <span className="text-xs font-semibold text-warm-muted">{brands.length} brands</span>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide scroll-edge-mask pb-1">
        <button
          onClick={() => handleClick(null)}
          className={`${chipBase} ${
            !selectedBrand
              ? 'bg-warm-fg text-warm-surface border-warm-fg'
              : 'bg-warm-surface text-warm-fg border-warm-border/60 hover:border-warm-fg'
          }`}
        >
          All ({products.length})
        </button>
        {brands.map((brand) => (
          <button
            key={brand}
            onClick={() => handleClick(selectedNormalized === normalizeBrand(brand) ? null : brand)}
            className={`${chipBase} ${
              selectedNormalized === normalizeBrand(brand)
                ? 'bg-warm-fg text-warm-surface border-warm-fg'
                : 'bg-warm-surface text-warm-fg border-warm-border/60 hover:border-warm-fg'
            }`}
          >
            {brand} ({counts[brand]})
          </button>
        ))}
      </div>
    </section>
  );
}

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
  parentGroup?: ReturnType<typeof getCategoryGroup>;
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
  parentGroup,
  products,
  theme,
  sort,
  categories,
  ad,
  searchParams,
}: CategorySwimlanesProps) {
  const router = useRouter();
  const urlParams = useSearchParams();
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

  const selectedBrand = getSingleBrand(urlParams.get('brand') || searchParams?.brand);

  const displayGroup = group || parentGroup;
  const isIceCreamGroup = ICE_CREAM_SLUGS.includes(categorySlug) ||
    ICE_CREAM_SLUGS.includes(displayGroup?.slug || '');

  let filtered = [...products];

  if (!group && parentGroup) {
    const currentCatObj = categories.find((c) => c.slug === categorySlug);
    const catName = currentCatObj?.name ?? categorySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    filtered = filtered.filter((p) => 
      (currentCatObj?.id && p.category_id === currentCatObj.id) ||
      p.category === catName ||
      p.category === categorySlug ||
      (currentCatObj?.name && p.category === currentCatObj.name)
    );
  }

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

  if (selectedBrand) {
    filtered = filtered.filter((p) => normalizeBrand(p.brand) === normalizeBrand(selectedBrand));
  }

  if (sort === 'price_asc') filtered.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') filtered.sort((a, b) => b.price - a.price);
  else if (sort === 'newest')
    filtered.sort((a, b) =>
      new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime()
    );

  const deals = products.filter((p) => p.originalPrice && p.originalPrice > p.price).slice(0, 8);
  const bestSellers = products.filter((p) => p.stock > 10).slice(0, 8);

  const subCategoryItems = !displayGroup ? [] : displayGroup.subCategories.map((subSlug) => {
    const cat = categories.find((c) => c.slug === subSlug);
    const catName = cat?.name ?? subSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const catProducts = products.filter((p) => 
      (cat?.id && p.category_id === cat.id) ||
      p.category === catName || 
      p.category === subSlug || 
      (cat?.name && p.category === cat.name)
    );
    return {
      slug: subSlug,
      label: catName,
      icon: cat?.emoji || '📦',
      count: catProducts.length,
      isActive: subSlug === categorySlug,
    };
  });

  if (filtered.length === 0 && !displayGroup) {
    return (
      <div className="text-center py-16 px-3">
        <p className="text-warm-muted">No products found</p>
      </div>
    );
  }

  const currentCategoryName = categories.find(c => c.slug === categorySlug)?.name || categorySlug;

  return (
    <>
      {deals.length > 0 && (
        <ProductSwimlaneClient
          title={<><Fire weight="fill" size={16} className="inline-block mr-1.5 text-red-500" aria-hidden="true" />Rollbacks & Deals</>}
          products={deals}
        />
      )}
      {isIceCreamGroup && subCategoryItems.length === 0 && (
        <BrandFilterBar products={products} selectedBrand={selectedBrand} />
      )}
      {subCategoryItems.length > 0 && (
        <section className="mb-8">
          {isIceCreamGroup && (
            <BrandFilterBar products={products} selectedBrand={selectedBrand} />
          )}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold tracking-tight">
              {displayGroup ? `${displayGroup.label} Categories` : 'Sub Categories'}
            </h2>
            <span className="text-xs font-semibold text-warm-muted">{subCategoryItems.length} categories</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {subCategoryItems.map((sub) => (
              <a
                key={sub.slug}
                href={`/category/${sub.slug}`}
                className={`group flex flex-col items-center justify-center p-4 rounded-2xl bg-warm-surface border ${
                  sub.isActive
                    ? 'border-2 border-warm-accent bg-warm-accent/10 shadow-warm-md'
                    : 'border-warm-border/60 hover:border-warm-accent/80 shadow-warm-sm hover:shadow-warm-md'
                } hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 text-center`}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-warm-surface-hover/80 flex items-center justify-center text-3xl sm:text-4xl mb-2.5 group-hover:scale-110 transition-transform duration-200 shadow-inner">
                  {sub.icon}
                </div>
                <h3 className={`font-extrabold text-xs sm:text-sm line-clamp-1 transition-colors ${
                  sub.isActive ? 'text-warm-fg font-black' : 'text-warm-fg group-hover:text-warm-fg-strong'
                }`}>
                  {sub.label}
                </h3>
                <span className="text-[11px] font-semibold text-warm-muted mt-0.5">
                  {sub.count} {sub.count === 1 ? 'item' : 'items'}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}
      {filtered.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold tracking-tight">
              {group ? `All ${group.label} Products` : `${currentCategoryName} Products`}
            </h2>
            <span className="text-sm text-warm-muted">{filtered.length} items</span>
          </div>
          <ProductGridClient products={filtered} showBrandBadge={isIceCreamGroup} />
        </section>
      )}
    </>
  );
}

