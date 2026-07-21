'use client'; // product carousel that receives cart callbacks and passes them to ProductCard

import { ProductCard } from './ProductCard';
import type { Product } from '../lib/types';

interface ProductCarouselProps {
  products: Product[];
  cart: { id: string; qty: number }[];
  theme?: 'deals' | 'bestsellers';
  onAdd: (product: Product, buttonEl?: HTMLButtonElement | null) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onClick: (id: string) => void;
}

export function ProductCarousel({
  products,
  cart,
  theme,
  onAdd,
  onUpdateQty,
  onClick,
}: ProductCarouselProps) {
  const getQtyInCart = (productId: string) => {
    const item = cart.find((c) => c.id === productId);
    return item?.qty || 0;
  };

  return (
    <div className="relative">
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 scrollbar-hide scroll-edge-mask">
        {products.map((product, index) => {
          let addBtnRef: HTMLButtonElement | null = null;
          return (
            <div key={product.id} className="w-44 sm:w-52 flex-shrink-0 snap-start">
              <ProductCard
                id={product.id}
                emoji={product.emoji}
                name={product.name}
                price={product.price}
                originalPrice={product.originalPrice}
                badge={product.badge}
                unit={product.unit}
                stock={product.stock}
                category={product.category}
                image_url={product.image_url}
                qtyInCart={getQtyInCart(product.id)}
                priority={index === 0}
                theme={theme}
                onAdd={() => onAdd(product, addBtnRef)}
                onUpdateQty={(delta) => onUpdateQty(product.id, delta)}
                onClick={() => onClick(product.id)}
                onAddRef={(el) => { addBtnRef = el; }}
              />
            </div>
          );
        })}
      </div>
      {/* Right-edge scroll hint for tablet/desktop */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-warm-bg via-warm-bg/80 to-transparent hidden md:flex items-center justify-end pr-1">
        <span className="text-warm-muted/70 text-lg animate-pulse">→</span>
      </div>
    </div>
  );
}
