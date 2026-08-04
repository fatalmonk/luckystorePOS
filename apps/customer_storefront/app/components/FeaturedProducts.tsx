'use client';

import React from 'react';
import { ThemedProductRail } from './ThemedProductRail';
import type { Product } from '../lib/types';

interface FeaturedProductsProps {
  products: Product[];
  isLoading?: boolean;
}

export function FeaturedProducts({ products, isLoading = false }: FeaturedProductsProps) {
  if (isLoading || products.length === 0) return null;

  return (
    <ThemedProductRail
      id="featured-groceries"
      products={products}
      title="Featured groceries"
      subtitle="In-stock picks from across Lucky Store."
      theme="household"
      ctaLabel="See all groceries"
      ctaHref="/category"
    />
  );
}
