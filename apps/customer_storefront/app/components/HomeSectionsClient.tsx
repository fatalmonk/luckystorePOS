'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProductCarousel } from './ProductCarousel';
import { CartSheet } from './CartSheet';
import { CartFlyAnimation } from './CartFlyAnimation';
import { useCartActions } from '../hooks/useCartActions';
import type { Product } from '../lib/types';

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
  const [cartSheetOpen, setCartSheetOpen] = useState(false);

  const onAdd = (product: Product, buttonEl?: HTMLButtonElement | null) => {
    handleAddToCart(product, buttonEl);
    setCartSheetOpen(true);
  };

  return (
    <>
      {sections.map(({ title, href, products }) => (
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
              onAdd={onAdd}
              onUpdateQty={handleUpdateQty}
              onClick={handleClick}
            />
          </div>
        </section>
      ))}
      <CartSheet open={cartSheetOpen} onClose={() => setCartSheetOpen(false)} />
      <CartFlyAnimation items={flyItems} onComplete={handleFlyComplete} />
    </>
  );
}
