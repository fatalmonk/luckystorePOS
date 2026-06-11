'use client';

import { ProductCard } from './ProductCard';
import type { Product } from '../lib/types';

interface ProductCarouselProps {
  title: string;
  products: Product[];
  cart: { id: string; qty: number }[];
  onAdd: (product: Product, buttonEl?: HTMLButtonElement | null) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onClick: (id: string) => void;
}

export function ProductCarousel({
  title,
  products,
  cart,
  onAdd,
  onUpdateQty,
  onClick,
}: ProductCarouselProps) {
  const getQtyInCart = (productId: string) => {
    const item = cart.find((c) => c.id === productId);
    return item?.qty || 0;
  };

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold mb-3">{title}</h2>
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 scrollbar-hide scroll-edge-mask">
        {products.map((product) => {
          let addBtnRef: HTMLButtonElement | null = null;
          return (
            <div key={product.id} className="w-40 sm:w-48 flex-shrink-0 snap-start">
              <ProductCard
                id={product.id}
                emoji={product.emoji}
                name={product.name}
                price={product.price}
                originalPrice={product.originalPrice}
                badge={product.badge}
                unit={product.unit}
                stock={product.stock}
                image_url={product.image_url}
                qtyInCart={getQtyInCart(product.id)}
                onAdd={() => onAdd(product, addBtnRef)}
                onUpdateQty={(delta) => onUpdateQty(product.id, delta)}
                onClick={() => onClick(product.id)}
                onAddRef={(el) => { addBtnRef = el; }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
