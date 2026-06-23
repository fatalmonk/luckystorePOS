'use client';

import { ReactNode, useState, useEffect } from 'react';
import Image from 'next/image';
import { WishlistButton } from './WishlistButton';
import { QtyNumber } from './ui/QtyNumber';
import { formatBdt, formatUnitPrice } from '../lib/formatPrice';
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
    case 'Beverages':
    case 'Tea & Coffee':
      return (
        <svg className={baseClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
          <line x1="6" y1="2" x2="6" y2="4" />
          <line x1="10" y1="2" x2="10" y2="4" />
          <line x1="14" y1="2" x2="14" y2="4" />
        </svg>
      );
    case 'Snacks':
    case 'Biscuits & Cookies':
    case 'Chocolates & Candies':
    case 'Ice Cream':
      return (
        <svg className={baseClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 10h.01M16 10h.01M12 14h.01M9 16h.01M15 16h.01" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'Dairy':
    case 'Dairy & Eggs':
      return (
        <svg className={baseClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 18h12M6 22h12" />
          <rect x="6" y="6" width="12" height="16" rx="2" />
          <path d="M6 6l6-4 6 4" />
          <circle cx="12" cy="13" r="2" />
        </svg>
      );
    case 'Personal Care':
    case 'Cleaning Supply':
    case 'Air Freshner':
    case 'Baby Care':
    case 'Pest Control':
      return (
        <svg className={baseClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 22h6M9 6h6M12 2v4M7 10h10v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z" />
        </svg>
      );
    case 'Oil':
    case 'Rice & Grain':
    case 'Condiments':
    case 'Spices':
    case 'Cereals':
    case 'Baking Needs':
    case 'Cooking Needs':
    case 'Packaged Food':
      return (
        <svg className={baseClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5Z" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      );
    case 'Electronics':
      return (
        <svg className={baseClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
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
  const taka = Math.floor(price);
  const paisa = Math.round((price % 1) * 100).toString().padStart(2, '0');

  const [isWishlisted, setIsWishlisted] = useState(false);
  const { showToast } = useToast();

  // Load wishlist state from local cache on mount
  useEffect(() => {
    const list = getLocalWishlist();
    setIsWishlisted(list.includes(id));
  }, [id]);

  // Heart toggle: quick add/remove for IN-STOCK items (no phone capture).
  // The WishlistButton component below handles OUT-OF-STOCK items with phone input.
  // Both write to the same `wishlist` table via toggleWishlistItemServer — phone is optional.
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
      showToast(`Couldn't sync wishlist — saved locally`);
    }
  };

  return (
    <Card hover onClick={onClick} className="flex flex-col group relative card-reveal" data-testid="product-card">
      {/* Badges + wishlist */}
      <div className="absolute top-2 left-2 right-2 z-20 flex justify-between items-start pointer-events-none">
        {badge ? (
          <span className="bg-[#dc2626] text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wider">
            {badge}
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={handleWishlistToggle}
          className="pointer-events-auto w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm shadow-[0_2px_8px_rgba(28,25,23,0.08)] flex items-center justify-center text-lg transition-transform hover:scale-105 active:scale-95 border border-[#e7e5e4]"
          aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
        >
          {isWishlisted ? (
            <span className="text-red-500">❤️</span>
          ) : (
            <span className="text-[#78716c] hover:text-red-500 transition-colors">🤍</span>
          )}
        </button>
      </div>

      {/* Image */}
      <div className="relative w-full h-28 sm:h-32 lg:h-36 bg-white overflow-hidden flex items-center justify-center border-b border-[#f5f5f4] shrink-0">
        {image_url ? (
          <img
            src={image_url}
            alt={name}
            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 p-2"
            loading={priority ? undefined : 'lazy'}
            decoding="async"
          />
        ) : (
          <div className="w-full h-full bg-gray-50/50 flex items-center justify-center">
            <CategoryPlaceholder category={category} />
          </div>
        )}
      </div>

      {/* Content - price-first */}
      <div className="p-2 sm:p-2.5 flex flex-col flex-1 gap-0.5">
        {/* Price block */}
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-extrabold text-[#1c1917]">৳{taka}</span>
          <span className="text-xs font-extrabold text-[#1c1917]">{paisa}</span>
        </div>

        {onSale && (
          <div className="flex items-center gap-1 text-xs">
            <span className="line-through text-[#78716c]">{formatBdt(originalPrice)}</span>
            <span className="bg-green-100 text-green-800 font-bold px-1 py-0.5 rounded-full">Save {formatBdt(savings)}</span>
          </div>
        )}

        <p className="text-[10px] text-[#78716c]">
          {formatUnitPrice(price, unit)}
        </p>

        <h3 className="text-xs font-semibold leading-tight line-clamp-2 text-[#1c1917] min-h-[2.2em]">
          {name}
        </h3>

        <div className="mt-auto pt-1">
          {qtyInCart > 0 ? (
            <div className="flex items-center justify-between gap-1 w-full">
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateQty(-1); }}
                className="w-9 h-9 rounded-full border-2 border-warm-accent bg-white text-[#1c1917] flex items-center justify-center text-base font-bold hover:bg-warm-accent hover:text-white active:scale-95 transition-all press-feedback"
                aria-label="Remove one"
              >
                −
              </button>
              <QtyNumber qty={qtyInCart} className="font-bold text-sm min-w-[20px] text-center" />
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateQty(1); }}
                className="w-9 h-9 rounded-full border-2 border-warm-accent bg-white text-[#1c1917] flex items-center justify-center text-base font-bold hover:bg-warm-accent hover:text-white active:scale-95 transition-all press-feedback"
                aria-label="Add one"
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
              className="w-full h-9 min-h-[36px] rounded-full border-2 border-warm-accent text-[#1c1917] text-sm font-bold hover:bg-warm-accent hover:text-white active:scale-95 transition-all disabled:border-warm-dim disabled:text-warm-dim disabled:hover:bg-white press-feedback"
            >
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
