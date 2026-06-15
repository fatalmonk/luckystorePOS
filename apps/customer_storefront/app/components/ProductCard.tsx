'use client';

import { ReactNode, useState, useEffect } from 'react';
import Image from 'next/image';
import { WishlistButton } from './WishlistButton';
import { PriceDisplay } from './PriceDisplay';
import { formatUnitPrice } from '../lib/formatPrice';
import type { Category } from '../lib/types';
import { getLocalWishlist, saveLocalWishlist, toggleWishlistItemServer } from '../lib/wishlistHelpers';
import { getOrCreateFingerprint } from './WishlistButton';
import { useToast } from './Toast';

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
        ${hover ? 'card-hover hover:border-[#d6d3d1] cursor-pointer hover:shadow-[inset_0_0_0_1px_rgba(11,79,217,0.12)]' : ''}
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
  category: Category;
  image_url?: string;
  qtyInCart?: number;
  priority?: boolean;
  onAdd: () => void;
  onUpdateQty: (delta: number) => void;
  onClick: () => void;
  onAddRef?: (el: HTMLButtonElement | null) => void;
}

function CategoryPlaceholder({ category }: { category: Category }) {
  const baseClasses = "w-12 h-12 text-warm-dim opacity-40 transition-transform duration-300 group-hover:scale-110";
  
  switch (category) {
    case 'beverages':
    case 'tea-coffee':
      return (
        <svg className={baseClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
          <line x1="6" y1="2" x2="6" y2="4" />
          <line x1="10" y1="2" x2="10" y2="4" />
          <line x1="14" y1="2" x2="14" y2="4" />
        </svg>
      );
    case 'produce':
      return (
        <svg className={baseClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2Z" />
          <path d="M12 2c1.5 3 0 6-2 8" />
          <path d="M14 6c1 1.5 1 3.5 0 5" />
        </svg>
      );
    case 'bakery':
    case 'snacks':
    case 'chips':
    case 'biscuits-cookies':
    case 'chocolates-candies':
    case 'ice-cream':
      return (
        <svg className={baseClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 10h.01M16 10h.01M12 14h.01M9 16h.01M15 16h.01" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'dairy':
    case 'eggs':
      return (
        <svg className={baseClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 18h12M6 22h12" />
          <rect x="6" y="6" width="12" height="16" rx="2" />
          <path d="M6 6l6-4 6 4" />
          <circle cx="12" cy="13" r="2" />
        </svg>
      );
    case 'personal-care':
    case 'cleaning-supply':
    case 'air-freshener':
    case 'baby-care':
    case 'household':
      return (
        <svg className={baseClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 22h6M9 6h6M12 2v4M7 10h10v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z" />
        </svg>
      );
    case 'oil':
    case 'rice-grain':
    case 'condiments':
    case 'spices':
    case 'grocery':
    case 'cereals':
    case 'baking-needs':
      return (
        <svg className={baseClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5Z" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      );
    default:
      return (
        <svg className={baseClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
        </svg>
      );
  }
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
  category,
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

  const [isWishlisted, setIsWishlisted] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const list = getLocalWishlist();
    setIsWishlisted(list.includes(id));
  }, [id]);

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const fp = getOrCreateFingerprint();
    if (!fp) return;

    const nextState = !isWishlisted;
    setIsWishlisted(nextState);

    const list = getLocalWishlist();
    const updatedList = nextState
      ? [...list, id]
      : list.filter((x) => x !== id);
    saveLocalWishlist(updatedList);

    try {
      await toggleWishlistItemServer(id, name, fp, nextState);
      showToast(nextState ? `Saved ${name} to wishlist` : `Removed ${name} from wishlist`);
    } catch (err) {
      console.error(err);
      setIsWishlisted(!nextState);
      const rollbackList = !nextState
        ? [...updatedList, id]
        : updatedList.filter((x) => x !== id);
      saveLocalWishlist(rollbackList);
      showToast('Could not update wishlist on server');
    }
  };

  return (
    <Card hover onClick={onClick} className="flex flex-col group relative card-reveal" data-testid="product-card">
      {/* Wishlist Toggle Button (Top-Left) */}
      <button
        onClick={handleWishlistToggle}
        className="absolute top-2 left-2 z-20 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm shadow-[0_2px_8px_rgba(28,25,23,0.08)] flex items-center justify-center text-lg transition-transform hover:scale-105 active:scale-95 border border-[#e7e5e4]"
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        {isWishlisted ? (
          <span className="text-red-500">❤️</span>
        ) : (
          <span className="text-[#a8a29e] hover:text-red-500 transition-colors">🤍</span>
        )}
      </button>

      {/* Image area — fixed height for proportionate sizing */}
      <div className="relative w-full h-36 sm:h-40 lg:h-44 bg-white overflow-hidden flex items-center justify-center border-b border-[#f5f5f4] shrink-0">
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
          <div className="w-full h-full bg-gray-50/50 flex items-center justify-center">
            <CategoryPlaceholder category={category} />
          </div>
        )}

        {/* Badge (bottom-left) to avoid top-left wishlist conflict */}
        {badge && (
          <span className="absolute bottom-2 left-2 bg-[#dc2626] text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 uppercase tracking-wider">
            {badge}
          </span>
        )}

        {/* Stock indicator (top-right) */}
        <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide z-10 ${
          outOfStock
        }`}>
          {outOfStock ? 'Out of stock' : stockLow ? `${stock} left` : 'In stock'}
        </span>
      </div>

      {/* Content area — compact, fixed height sections for alignment */}
      <div className="p-2.5 sm:p-3 flex flex-col flex-1 gap-1 min-h-[164px]">
        {/* Title first (most important after image) */}
        <h3 className="text-sm font-semibold leading-tight line-clamp-2 text-[#1c1917] h-[2.5em]">
          {name}
        </h3>

        {/* Price row */}
        <div className="flex items-center gap-1.5 flex-wrap h-5">
          <PriceDisplay
            value={price}
            original={onSale ? originalPrice : undefined}
            savings={onSale ? savings : undefined}
          />
        </div>

        {/* Unit price */}
        <p className="text-[11px] text-gray-500 h-4">
          {formatUnitPrice(price, unit)}
        </p>

        {/* CTA */}
        <div className="mt-auto pt-1 h-[52px] flex items-end">
          {qtyInCart > 0 ? (
            <div className="flex items-center justify-between gap-1 w-full">
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateQty(-1); }}
                className="w-11 h-11 rounded-full border-2 border-warm-primary bg-white text-warm-primary flex items-center justify-center text-base font-bold hover:bg-warm-primary hover:text-white active:scale-95 transition-all press-feedback"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="font-bold text-sm min-w-[24px] text-center">{qtyInCart}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateQty(1); }}
                className="w-11 h-11 rounded-full border-2 border-warm-primary bg-white text-warm-primary flex items-center justify-center text-base font-bold hover:bg-warm-primary hover:text-white active:scale-95 transition-all press-feedback"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          ) : outOfStock ? (
            <div onClick={(e) => e.stopPropagation()} className="w-full">
              <WishlistButton productId={id} productName={name} />
            </div>
          ) : (
            <button
              ref={onAddRef}
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              disabled={stock <= 0}
              className="w-full h-11 min-h-[44px] rounded-full border-2 border-warm-primary text-warm-primary text-sm font-bold hover:bg-warm-primary hover:text-white active:scale-95 transition-all disabled:border-warm-dim disabled:text-warm-dim disabled:hover:bg-white press-feedback"
            >
              Add
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}