'use client'; // supplies cart callbacks and fly animation to ProductSwimlane

import { ProductSwimlane } from './ProductSwimlane';
import { CartFlyAnimation } from './CartFlyAnimation';
import { useCartActions } from '../hooks/useCartActions';
import type { Product } from '../lib/types';

interface ProductSwimlaneClientProps {
  title: string;
  products: Product[];
  action?: { label: string; href: string };
}

export function ProductSwimlaneClient({ title, products, action }: ProductSwimlaneClientProps) {
  const { cart, flyItems, handleAddToCart, handleUpdateQty, handleFlyComplete, handleClick } = useCartActions();

  return (
    <>
      <ProductSwimlane
        title={title}
        products={products}
        cart={cart}
        onAdd={handleAddToCart}
        onUpdateQty={handleUpdateQty}
        onClick={handleClick}
        action={action}
      />
      <CartFlyAnimation items={flyItems} onComplete={handleFlyComplete} />
    </>
  );
}
