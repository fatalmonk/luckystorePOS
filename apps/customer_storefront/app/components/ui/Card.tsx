/* Hallmark · component: ProductCard · genre: modern-minimal · theme: Warm Modern
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass
 */

'use client'; // interactive card wrapper with optional onClick and hover effects

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white border border-warm-border rounded-[14px]
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
  emoji: string;
  name: string;
  price: number;
  unit: string;
  stock: number;
  qtyInCart?: number;
  onAdd: () => void;
  onUpdateQty: (delta: number) => void;
  onClick: () => void;
}

export function ProductCard({
  emoji,
  name,
  price,
  unit,
  stock,
  qtyInCart = 0,
  onAdd,
  onUpdateQty,
  onClick,
}: ProductCardProps) {
  const stockLow = stock <= 5;
  const stockBadgeClass = stockLow
    ? 'bg-[rgba(180,83,9,0.08)] text-[#b45309]'
    : 'bg-[rgba(45,106,79,0.08)] text-warm-success';
  const stockLabel = stockLow ? `${stock} left` : 'In stock';

  return (
    <Card hover onClick={onClick} className="flex flex-col h-full">
      {/* Image area - responsive aspect ratio */}
      <div className="aspect-square sm:aspect-[4/3] bg-warm-border-light grid place-items-center text-[40px] sm:text-[48px] lg:text-[56px] relative">
        {emoji}
        <span
          className={`
            absolute top-2.5 left-2.5 px-2 py-1 rounded-md
            text-[10px] font-bold uppercase tracking-wide
            ${stockBadgeClass}
          `}
        >
          {stockLabel}
        </span>
      </div>

      {/* Content area */}
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <h3 className="text-sm sm:text-base font-semibold leading-snug line-clamp-2 mb-1">{name}</h3>
        <p className="text-xs text-warm-muted mb-3">{unit}</p>

        <div className="flex items-center justify-between mt-auto gap-2">
          <span className="font-bold text-base sm:text-lg tracking-tight whitespace-nowrap">৳{price}</span>

          {qtyInCart > 0 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQty(-1);
                }}
                className="w-9 h-10 rounded-md border border-warm-border bg-warm-bg
                  flex items-center justify-center text-sm font-semibold
                  hover:border-warm-accent hover:text-warm-fg transition-colors
                  active:scale-95"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="font-bold text-sm min-w-[28px] text-center">{qtyInCart}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQty(1);
                }}
                className="w-9 h-10 rounded-md border border-warm-border bg-warm-bg
                  flex items-center justify-center text-sm font-semibold
                  hover:border-warm-accent hover:text-warm-fg transition-colors
                  active:scale-95"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              disabled={stock <= 0}
              className="w-10 h-10 rounded-lg bg-warm-accent text-warm-fg\n                flex items-center justify-center text-lg font-medium\n                hover:bg-warm-accent-hover disabled:bg-[#a8a29e]\n                transition-colors active:scale-95"
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
