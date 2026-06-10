'use client';

import { useRouter } from 'next/navigation';
import { ProductGrid } from './ProductGrid';
import { ToastProvider, useToast } from './Toast';
import { CartProvider, useCartContext } from './CartProvider';
import type { Product } from '../lib/types';

function ProductGridInner({ products }: { products: Product[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { cart, addToCart, updateQty } = useCartContext();

  return (
    <ProductGrid
      products={products}
      cart={cart}
      onAdd={(product) => {
        addToCart(product);
        showToast(`Added ${product.name}`);
      }}
      onUpdateQty={(id, delta) => updateQty(id, delta)}
      onClick={(id) => router.push(`/product/${id}`)}
    />
  );
}

export function ProductGridClient({ products }: { products: Product[] }) {
  return (
    <ToastProvider>
      <CartProvider>
        <ProductGridInner products={products} />
      </CartProvider>
    </ToastProvider>
  );
}
