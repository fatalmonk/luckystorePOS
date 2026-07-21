'use client';

import { ProductGrid } from './ProductGrid';
import { CartFlyAnimation } from './CartFlyAnimation';
import { useCartActions } from '../hooks/useCartActions';
import type { Product } from '../lib/types';

interface ProductGridClientProps {
  products: Product[];
  showBrandBadge?: boolean;
}

export function ProductGridClient({ products, showBrandBadge = false }: ProductGridClientProps) {
  const { cart, flyItems, handleAddToCart, handleUpdateQty, handleFlyComplete, handleClick } = useCartActions();

  if (products.length === 0) return null;

  return (
    <>
      <ProductGrid
        products={products}
        cart={cart}
        showBrandBadge={showBrandBadge}
        onAdd={handleAddToCart}
        onUpdateQty={handleUpdateQty}
        onClick={handleClick}
      />
      <CartFlyAnimation items={flyItems} onComplete={handleFlyComplete} />
    </>
  );
}
