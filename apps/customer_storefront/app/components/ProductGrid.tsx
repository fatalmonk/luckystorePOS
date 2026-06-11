'use client';

import { ProductCard } from './ProductCard';
import type { Product } from '../lib/types';

interface ProductGridProps {
  products: Product[];
  cart: { id: string; qty: number }[];
  onAdd: (product: Product, buttonEl?: HTMLButtonElement | null) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onClick: (id: string) => void;
}

export function ProductGrid({ products, cart, onAdd, onUpdateQty, onClick }: ProductGridProps) {
  const getQtyInCart = (productId: string) => {
    const item = cart.find((c) => c.id === productId);
    return item?.qty || 0;
  };

  return (
    <div data-testid="product-grid" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
      {products.map((product) => {
        let addBtnRef: HTMLButtonElement | null = null;
        return (
          <ProductCard
            key={product.id}
            id={product.id}
            emoji={product.emoji}
            name={product.name}
            price={product.price}
            unit={product.unit}
            stock={product.stock}
            image_url={product.image_url}
            qtyInCart={getQtyInCart(product.id)}
            onAdd={() => onAdd(product, addBtnRef)}
            onUpdateQty={(delta) => onUpdateQty(product.id, delta)}
            onClick={() => onClick(product.id)}
            onAddRef={(el) => { addBtnRef = el; }}
          />
        );
      })}
    </div>
  );
}
