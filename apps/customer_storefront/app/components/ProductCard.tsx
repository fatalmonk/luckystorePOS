'use client'; // interactive product card with image, badge, stock indicator, and cart actions

import { ReactNode } from 'react';
import Image from 'next/image';
import { WishlistButton } from './WishlistButton';
import { PriceDisplay } from './PriceDisplay';
import { formatUnitPrice } from '../lib/formatPrice';

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
  priority?: boolean;
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
  priority = false,
}: ProductCardProps) {
  const stockLow = stock > 0 && stock <= 5;
  const outOfStock = stock <= 0;
  const onSale = originalPrice !== undefined && originalPrice > price;
  const savings = onSale ? originalPrice! - price : 0;

  return (
    <Card hover onClick={onClick} className="flex flex-col group" data-testid="product-card">
      {/* Image area — fixed height for proportionate sizing */}
      <div className="relative w-full h-36 sm:h-40 lg:h-44 bg-white overflow-hidden">
        {image_url ? (
          <Image
            src={image_url}
            alt={name}
            fill
            className="object-contain transition-transform duration-300 group-hover:scale-105 p-2"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
            loading={priority ? undefined : 'lazy'}
            priority={priority}
            decoding="async"
          />
        ) : (
          <div className="w-full h-full bg-gray-50 flex items-center justify-center text-3xl sm:text-4xl">
            {emoji || '📦'}
          </div>
        )}

        {/* Badge (top-left) */}
        {badge && (
          <span className="absolute top-2 left-2 bg-red-500 text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">
            {badge}
          </span>
        )}

        {/* Stock indicator (top-right) */}
        <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide z-10 ${
          outOfStock
            ? 'bg-[rgba(195,49,47,0.07)] text-[#c3312f]'
            : stockLow
            ? 'bg-[rgba(180,83,9,0.08)] text-[#b45309]'
            : 'bg-[rgba(45,106,79,0.08)] text-[#2d6a4f]'
        }`}>
          {outOfStock ? 'Out of stock' : stockLow ? `${stock} left` : 'In stock'}
        </span>

        {/* Wishlist (top-right, below stock) */}
        <div className="absolute top-2 right-2 z-10" style={{ marginTop: '28px' }}>
          {outOfStock && (
            <WishlistButton productId={id} productName={name} />
          )}
        </div>
      </div>

      {/* Content area — compact */}
      <div className="p-2.5 sm:p-3 flex flex-col flex-1 gap-1.5">
        {/* Title first (most important after image) */}
        <h3 className="text-sm font-semibold leading-tight line-clamp-2 text-[#1c1917] min-h-[2.5em]">
          {name}
        </h3>

        {/* Price row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <PriceDisplay
            value={price}
            original={onSale ? originalPrice : undefined}
            savings={onSale ? savings : undefined}
          />
        </div>

        {/* Unit price */}
        <p className="text-[11px] text-gray-500">
          {formatUnitPrice(price, unit)}
        </p>

        {/* CTA */}
        <div className="mt-auto pt-1">
          {qtyInCart > 0 ? (
            <div className="flex items-center justify-between gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateQty(-1); }}
                className="w-11 h-11 rounded-full border-2 border-[#0071DC] bg-white text-[#0071DC] flex items-center justify-center text-base font-bold hover:bg-[#0071DC] hover:text-white active:scale-95 transition-all"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="font-bold text-sm min-w-[24px] text-center">{qtyInCart}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateQty(1); }}
                className="w-11 h-11 rounded-full border-2 border-[#0071DC] bg-white text-[#0071DC] flex items-center justify-center text-base font-bold hover:bg-[#0071DC] hover:text-white active:scale-95 transition-all"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          ) : outOfStock ? (
            <div onClick={(e) => e.stopPropagation()}>
              <WishlistButton productId={id} productName={name} />
            </div>
          ) : (
            <button
              ref={onAddRef}
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              disabled={stock <= 0}
              className="w-full h-10 min-h-[44px] rounded-full border-2 border-[#0071DC] text-[#0071DC] text-sm font-bold hover:bg-[#0071DC] hover:text-white active:scale-95 transition-all disabled:border-[#a8a29e] disabled:text-[#a8a29e] disabled:hover:bg-white"
            >
              Add
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}