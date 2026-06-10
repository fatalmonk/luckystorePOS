'use client';

import { ReactNode } from 'react';
import { WishlistButton } from './WishlistButton';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  'data-testid'?: string;
}

export function Card({ children, className = '', hover = false, onClick, 'data-testid': testId }: CardProps) {
  return (
    <div
      onClick={onClick}
      data-testid={testId}
      className={`
        bg-white border border-[#e7e5e4] rounded-[14px]
        overflow-hidden
        transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${hover ? 'hover:shadow-md hover:border-[#d6d3d1] cursor-pointer hover:-translate-y-0.5' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface ProductCardProps {
  id: string;
  emoji: string;
  name: string;
  price: number;
  unit: string;
  stock: number;
  image_url?: string;
  qtyInCart?: number;
  onAdd: () => void;
  onUpdateQty: (delta: number) => void;
  onClick: () => void;
}

export function ProductCard({
  id,
  emoji,
  name,
  price,
  unit,
  stock,
  image_url,
  qtyInCart = 0,
  onAdd,
  onUpdateQty,
  onClick,
}: ProductCardProps) {
  const stockLow = stock > 0 && stock <= 5;
  const outOfStock = stock <= 0;
  const stockBadgeClass = outOfStock
    ? 'bg-[rgba(195,49,47,0.07)] text-[#c3312f]'
    : stockLow
    ? 'bg-[rgba(180,83,9,0.08)] text-[#b45309]'
    : 'bg-[rgba(45,106,79,0.08)] text-[#2d6a4f]';
  const stockLabel = outOfStock ? 'Out of stock' : stockLow ? `${stock} left` : 'In stock';

  return (
    <Card hover onClick={onClick} className="flex flex-col h-full" data-testid="product-card">
      <div className="aspect-square sm:aspect-[4/3] bg-[#f5f3f0] grid place-items-center text-[40px] sm:text-[48px] lg:text-[56px] relative">
        {image_url ? (
          <img src={image_url} alt={name} className="w-full h-full object-cover" />
        ) : (
          emoji
        )}
        <span className={`absolute top-2.5 left-2.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${stockBadgeClass}`}>
          {stockLabel}
        </span>
      </div>

      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <h3 className="text-sm sm:text-base font-semibold leading-snug line-clamp-2 mb-1">{name}</h3>
        <p className="text-xs text-[#a8a29e] mb-3">{unit}</p>

        <div className="flex items-center justify-between mt-auto gap-2">
          <span className="font-bold text-base sm:text-lg tracking-tight whitespace-nowrap">৳{price}</span>

          {qtyInCart > 0 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateQty(-1); }}
                className="w-7 h-8 rounded-md border border-[#e7e5e4] bg-[#faf8f5] flex items-center justify-center text-sm font-semibold hover:border-[#dc5f3b] hover:text-[#dc5f3b] transition-colors active:scale-95"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="font-bold text-sm min-w-[28px] text-center">{qtyInCart}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateQty(1); }}
                className="w-7 h-8 rounded-md border border-[#e7e5e4] bg-[#faf8f5] flex items-center justify-center text-sm font-semibold hover:border-[#dc5f3b] hover:text-[#dc5f3b] transition-colors active:scale-95"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          ) : outOfStock ? (
            <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
              <WishlistButton productId={id} productName={name} />
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              disabled={stock <= 0}
              className="w-9 h-9 rounded-lg bg-[#dc5f3b] text-white flex items-center justify-center text-lg font-medium hover:bg-[#c4542e] disabled:bg-[#a8a29e] transition-colors active:scale-95"
              aria-label={stock > 0 ? 'Add to cart' : 'Out of stock'}
            >
              +
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
