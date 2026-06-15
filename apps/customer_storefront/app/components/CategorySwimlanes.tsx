'use client'; // filter/sort state from URL + renders ProductSwimlaneClient islands

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductSwimlaneClient } from './ProductSwimlaneClient';
import { NativeAdBanner } from './NativeAdBanner';
import { getCategoryGroup } from '../lib/types';
import type { Product, Category } from '../lib/types';

interface CategorySwimlanesProps {
  categorySlug: string;
  currentCat: Category | 'all';
  group?: ReturnType<typeof getCategoryGroup>;
  products: Product[];
  categories: { id: string; slug: string; name: string; emoji: string }[];
  theme: string;
  sort: string;
}

export function CategorySwimlanes({
  categorySlug,
  currentCat,
  group,
  products,
  theme,
  sort,
  categories,
}: CategorySwimlanesProps) {
  const searchParams = useSearchParams();

  const availabilityParam = searchParams.get('availability') || '';
  const availability = useMemo(
    () => (availabilityParam ? availabilityParam.split(',') : []),
    [availabilityParam]
  );

  const filtered = useMemo(() => {
    let list = [...products];

    if (theme === 'deals') {
      list = list.filter((p) => p.originalPrice && p.originalPrice > p.price);
    } else if (theme === 'new' || theme === 'bestsellers') {
      list = list.filter((p) => p.stock > 10);
    }

    if (availability.length) {
      list = list.filter((p) => {
        if (availability.includes('in_stock') && p.stock > 5) return true;
        if (availability.includes('low_stock') && p.stock > 0 && p.stock <= 5) return true;
        return false;
      });
    }

    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);

    return list;
  }, [products, theme, availability, sort]);

  const { deals, bestSellers, under300, under500 } = useMemo(() => {
    const deals = filtered.filter((p) => p.originalPrice && p.originalPrice > p.price).slice(0, 8);
    const bestSellers = filtered.filter((p) => p.stock > 10).slice(0, 8);
    const under300 = filtered.filter((p) => p.price <= 300).slice(0, 8);
    const under500 = filtered.filter((p) => p.price <= 500).slice(0, 8);
    return { deals, bestSellers, under300, under500 };
  }, [filtered]);

  const subCategorySwimlanes = useMemo(() => {
    if (!group) return [];
    return group.subCategories
      .map((subSlug) => {
        const cat = categories.find((c) => c.slug === subSlug);
        return {
          slug: subSlug,
          label: cat?.name || subSlug,
          products: filtered.filter((p) => p.category === subSlug).slice(0, 8),
        };
      })
      .filter((s) => s.products.length > 0);
  }, [filtered, group, categories]);

  return (
    <>
      {filtered.length === 0 ? (
        <div className="text-center py-16 px-3">
          <p className="text-gray-500">No products found</p>
        </div>
      ) : group ? (
        <>
          {subCategorySwimlanes.map((swimlane) => (
            <ProductSwimlaneClient
              key={swimlane.slug}
              title={swimlane.label}
              products={swimlane.products}
              action={{ label: 'See all', href: `/category/${swimlane.slug}` }}
            />
          ))}
          {deals.length > 0 && (
            <ProductSwimlaneClient
              title="Rollbacks & Deals"
              products={deals}
            />
          )}
        </>
      ) : (
        <>
          {deals.length > 0 && (
            <ProductSwimlaneClient
              title="Rollbacks & Deals"
              products={deals}
              action={{ label: 'See all', href: `/category/${categorySlug}?theme=deals` }}
            />
          )}
          {bestSellers.length > 0 && (
            <ProductSwimlaneClient
              title="Best Sellers"
              products={bestSellers}
              action={{ label: 'See all', href: `/category/${categorySlug}?theme=bestsellers` }}
            />
          )}
          <NativeAdBanner
            title="Your fireside fave is back"
            subtitle="More s'mores please!"
            ctaText="Shop now"
            bgColor="#1c1917"
          />
          {under300.length > 0 && (
            <ProductSwimlaneClient
              title="Best sellers under ৳300"
              products={under300}
            />
          )}
          {under500.length > 0 && (
            <ProductSwimlaneClient
              title="Under ৳500"
              products={under500}
            />
          )}
        </>
      )}
    </>
  );
}
