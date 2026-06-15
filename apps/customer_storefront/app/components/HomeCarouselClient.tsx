'use client'; // handles cart interactions, fly animation, and cart sheet for home carousel

import { useState } from 'react';
import { ProductCarousel } from './ProductCarousel';
import { CartSheet } from './CartSheet';
import { CartFlyAnimation } from './CartFlyAnimation';
import { useCartActions } from '../hooks/useCartActions';
import type { Product } from '../lib/types';

interface HomeCarouselClientProps {
  title: string;
  products: Product[];
}

export function HomeCarouselClient({ title, products }: HomeCarouselClientProps) {
  const { cart, flyItems, handleAddToCart, handleUpdateQty, handleFlyComplete, handleClick } = useCartActions();
  const [cartSheetOpen, setCartSheetOpen] = useState(false);

  const onAdd = (product: Product, buttonEl?: HTMLButtonElement | null) => {
    handleAddToCart(product, buttonEl);
    setCartSheetOpen(true);
  };

  return (
    <>
      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">{title}</h2>
        <ProductCarousel
          products={products}
          cart={cart}
          onAdd={onAdd}
          onUpdateQty={handleUpdateQty}
          onClick={handleClick}
        />
      </section>
      <CartSheet open={cartSheetOpen} onClose={() => setCartSheetOpen(false)} />
      <CartFlyAnimation items={flyItems} onComplete={handleFlyComplete} />
    </>
  );
}
