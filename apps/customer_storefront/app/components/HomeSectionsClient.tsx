'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ProductCarousel } from './ProductCarousel';
import { useCartActions } from '../hooks/useCartActions';
import type { Product } from '../lib/types';

const CartFlyAnimation = dynamic(() => import('./CartFlyAnimation').then((m) => ({ default: m.CartFlyAnimation })), { ssr: false });

interface Section {
  title: string;
  href: string;
  products: Product[];
  theme?: 'deals' | 'bestsellers';
}

interface HomeSectionsClientProps {
  sections: Section[];
}

export function HomeSectionsClient({ sections }: HomeSectionsClientProps) {
  const { cart, flyItems, handleAddToCart, handleUpdateQty, handleFlyComplete, handleClick } = useCartActions();

  return (
    <>
      {sections.map(({ title, href, products, theme }) => (
        <section key={title}>
          <div className={`bg-warm-surface rounded-2xl p-4 sm:p-5 border shadow-warm-sm ${
            theme === 'deals' ? 'border-red-300/60' : theme === 'bestsellers' ? 'border-warm-accent/60' : 'border-warm-border/60'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {theme === 'bestsellers' && <span className="text-lg">⭐</span>}
                <h2 className="text-lg font-extrabold tracking-tight text-warm-fg">{title}</h2>
              </div>
              <Link
                href={href}
                className="text-xs font-bold text-warm-muted hover:text-warm-fg transition-colors underline-offset-2 hover:underline"
              >
                View All →
              </Link>
            </div>
            <ProductCarousel
              products={products}
              cart={cart}
              theme={theme}
              onAdd={handleAddToCart}
              onUpdateQty={handleUpdateQty}
              onClick={handleClick}
            />
          </div>
        </section>
      ))}
      <CartFlyAnimation items={flyItems} onComplete={handleFlyComplete} />
    </>
  );
}
