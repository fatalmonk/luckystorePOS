'use client';

import { MiniProductCard } from './MiniProductCard';
import type { Product } from '../../lib/products/types';

interface ProductCarouselProps {
  title: string;
  products: Product[];
}

/**
 * Horizontal product carousel for cross-sell sections.
 * Snap-scroll on mobile, clean overflow on desktop.
 */
export function ProductCarousel({ title, products }: ProductCarouselProps) {
  if (!products.length) return null;

  return (
    <div className="border-t border-warm-border px-4 py-5 sm:px-6 lg:px-8">
      <h2 className="text-sm font-bold text-warm-fg mb-3">{title}</h2>
      <div
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth scrollbar-hide"
        role="list"
        aria-label={title}
      >
        {products.map((product) => (
          <div key={product.id} className="snap-start" role="listitem">
            <MiniProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}
