'use client';

import { ReactNode, useRef } from 'react';
import { WishlistButton } from './WishlistButton';
import Image from 'next/image';

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
        transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]
        ${hover ? 'card-hover hover:border-[#d6d3d1] cursor-pointer hover:shadow-[inset_0_0_0_1px_rgba(220,95,59,0.12)]' : ''}
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
  originalPrice?: number;
  badge?: string;
  unit: string;
  stock: number;
  image_url?: string;
  qtyInCart?: number;
  onAdd: () => void;
  onUpdateQty: (delta: number) => void;
  onClick: () => void;
  /** Ref callback to capture the add-button position for fly animation */
  onAddRef?: (el: HTMLButtonElement | null) => void;
}

export function ProductCard({
  id,
  emoji,
  name,
  price,
  originalPrice,
  badge,
  unit,
  stock,
  image_url,
  qtyInCart = 0,
  onAdd,
  onUpdateQty,
  onClick,
  onAddRef,
}: ProductCardProps) {
  const stockLow = stock > 0 && stock <= 5;
  const outOfStock = stock <= 0;
  const stockBadgeClass = outOfStock
    ? 'bg-[rgba(195,49,47,0.07)] text-[#c3312f]'
    : stockLow
    ? 'bg-[rgba(180,83,9,0.08)] text-[#b45309]'
    : 'bg-[rgba(45,106,79,0.08)] text-[#2d6a4f]';
  const stockLabel = outOfStock ? 'Out of stock' : stockLow ? `${stock} left` : 'In stock';
  const onSale = originalPrice !== undefined && originalPrice > price;
  const savings = onSale ? originalPrice! - price : 0;

  // Unit price calculation (per kg/l/pc)
  const unitPrice = price; // Simplified - would need actual unit conversion

  return (
    <Card hover onClick={onClick} className="flex flex-col h-full group" data-testid="product-card">
      {/* 1. Image area with badging */}
      <div className="relative aspect-square w-full bg-white overflow-hidden">
        {image_url ? (
          <Image
            src={image_url}
            alt={name}
            fill
            className="object-contain transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[40px] sm:text-[48px] lg:text-[56px]">
            {emoji || '📦'}
          </div>
        )}

        {/* Badging area (top-left) */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
          {badge && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              {badge}
            </span>
          )}
          {onSale && (
            <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              Save ৳{savings.toFixed(0)}
            </span>
          )}
        </div>

        {/* Stock indicator (top-right) */}
        <span className={`absolute top-2 right-2 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide z-10 ${stockBadgeClass}`}>
          {stockLabel}
        </span>

        {/* Wishlist (top-right, below stock) */}
        <div className="absolute top-2 right-2 z-10" style={{ marginTop: '28px' }}>
          {outOfStock && (
            <WishlistButton productId={id} productName={name} />
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 space-y-2">
        {/* 4. Variant selector (if applicable) - placeholder for future */}
        {/* <div className="hidden">+ 4 options</div> */}

        {/* 5. Price block (most prominent) */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-[#1c1917]">
            ৳{Math.floor(price)}
          </span>
          <span className="text-sm font-bold text-[#1c1917]">
            {((price % 1) * 100).toFixed(0).padStart(2, '0')}
          </span>
        </div>

        {/* 6. Original price (if on sale) */}
        {onSale && (
          <div className="flex items-center gap-2">
            <span className="line-through text-sm text-gray-400">৳{originalPrice}</span>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
              Save ৳{savings.toFixed(0)}
            </span>
          </div>
        )}

        {/* 7. Per-unit price */}
        <p className="text-xs text-[#a8a29e]">
          ৳{unitPrice.toFixed(2)} / {unit}
        </p>

        {/* 8. Title */}
        <h3 className="text-sm sm:text-base font-semibold leading-snug line-clamp-2 text-[#1c1917]">
          {name}
        </h3>

        {/* 9. Social proof - Star rating */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 text-yellow-500">
            <span className="text-sm">★★★★★</span>
          </div>
          <span className="text-xs text-[#a8a29e]">(12)</span>
        </div>

        {/* 10. Fulfillment */}
        <p className="text-xs text-[#a8a29e]">
          Delivery by <strong className="text-[#1c1917]">Tomorrow</strong>
        </p>

        {/* 11. CTA */}
        <div className="mt-auto pt-2">
          {qtyInCart > 0 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateQty(-1); }}
                className="w-10 h-10 rounded-full border-2 border-[#0071DC] bg-white text-[#0071DC] flex items-center justify-center text-lg font-bold hover:bg-[#0071DC] hover:text-white active:scale-95 transition-all duration-200 min-h-[44px] min-w-[44px]"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="font-bold text-base min-w-[32px] text-center">{qtyInCart}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateQty(1); }}
                className="w-10 h-10 rounded-full border-2 border-[#0071DC] bg-white text-[#0071DC] flex items-center justify-center text-lg font-bold hover:bg-[#0071DC] hover:text-white active:scale-95 transition-all duration-200 min-h-[44px] min-w-[44px]"
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
              ref={onAddRef}
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              disabled={stock <= 0}
              className="w-full h-[48px] min-h-[44px] rounded-full border-2 border-[#0071DC] text-[#0071DC] text-sm font-bold hover:bg-[#0071DC] hover:text-white active:scale-95 transition-all duration-200 disabled:border-[#a8a29e] disabled:text-[#a8a29e] disabled:hover:bg-white"
            >
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}