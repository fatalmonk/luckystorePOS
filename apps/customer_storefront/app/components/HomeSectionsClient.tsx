'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ProductCarousel } from './ProductCarousel';
import { PromoBanner } from './PromoBanner';
import { useCartActions } from '../hooks/useCartActions';
import type { Product } from '../lib/types';

// Lazy-loaded — these are overlay UIs never needed on first paint
const CartFlyAnimation = dynamic(() => import('./CartFlyAnimation').then((m) => ({ default: m.CartFlyAnimation })), { ssr: false });

interface Section {
  title: string;
  href: string;
  products: Product[];
}

interface HomeSectionsClientProps {
  sections: Section[];
}

export function HomeSectionsClient({ sections }: HomeSectionsClientProps) {
  const { cart, flyItems, handleAddToCart, handleUpdateQty, handleFlyComplete, handleClick } = useCartActions();

  return (
    <>
      {sections.map(({ title, href, products }, index) => (
        <React.Fragment key={title}>
          <section key={title}>
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-warm-border/60 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{title}</h2>
                <Link
                  href={href}
                  className="text-xs font-bold text-warm-muted hover:text-warm-fg transition-colors"
                >
                  View All
                </Link>
              </div>
              <ProductCarousel
                products={products}
                cart={cart}
                onAdd={handleAddToCart}
                onUpdateQty={handleUpdateQty}
                onClick={handleClick}
              />
            </div>
          </section>
          {index === 1 && (
            <PromoBanner
              variant="saffron"
              title="Free Same-Day Delivery"
              subtitle="On orders ৳500+. Order before 6 PM."
              ctaText="Shop Essentials"
              ctaHref="/category?theme=essentials"
              inline
            />
          )}
        </React.Fragment>
      ))}
      <CartFlyAnimation items={flyItems} onComplete={handleFlyComplete} />
    </>
  );
}
