'use client';

import { ReactNode, useState, useEffect } from 'react';
import { WishlistButton } from './WishlistButton';
import Image from 'next/image';
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
        bg-white border border-stone-200/60 rounded-[20px]
        overflow-hidden
        transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${hover ? 'card-hover hover:border-stone-300 cursor-pointer shadow-sm hover:shadow-md' : ''}
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
  const baseClasses = "w-12 h-12 text-stone-400/70 transition-transform duration-500 group-hover:scale-110";
  
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
        <svg className={baseClasses} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="6" y="7" width="12" height="15" rx="2" fill="#FFFFFF" />
          <path d="M6 7L12 3L18 7" fill="var(--color-paper)" />
          <circle cx="12" cy="14" r="3" fill="var(--color-accent)" opacity="0.3" />
          <path d="M9 13.5C9.5 13 11 13 12 14.5C13 16 14.5 14 15 13.5" stroke="var(--color-accent)" strokeWidth="1.5" />
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

  const [isWishlisted, setIsWishlisted] = useState(false);
  const { showToast } = useToast();

  // Load wishlist state from local cache on mount
  useEffect(() => {
    const list = getLocalWishlist();
    const isPresent = list.includes(id);
    const timer = setTimeout(() => setIsWishlisted(isPresent), 0);
    return () => clearTimeout(timer);
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
      showToast(`Couldn't sync wishlist — saved locally`);
    }
  };

  return (
    <Card hover onClick={onClick} className="flex flex-col group relative card-reveal" data-testid="product-card">
      {/* Badges + wishlist */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex justify-between items-start pointer-events-none">
        {badge ? (
          <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wider font-display">
            {badge}
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={handleWishlistToggle}
          className="pointer-events-auto w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm shadow-[0_2px_8px_rgba(28,25,23,0.06)] flex items-center justify-center text-lg transition-transform hover:scale-105 active:scale-95 border border-stone-200 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
        >
          {isWishlisted ? (
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-stone-400 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          )}
        </button>
      </div>

      {/* Image Container — plain img for reliability, same as admin portal */}
      <div className="relative w-full h-32 sm:h-40 lg:h-44 bg-stone-50/40 overflow-hidden flex items-center justify-center border-b border-stone-100 shrink-0 p-2">
        {image_url ? (
          <Image
            src={image_url}
            alt={name}
            width={174}
            height={174}
            className="w-full h-full object-contain transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.06]"
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const placeholder = e.currentTarget.parentElement?.querySelector('[data-placeholder]');
              if (placeholder) placeholder.classList.remove('hidden');
            }}
          />
        ) : null}
        <div data-placeholder className={`absolute inset-0 flex items-center justify-center p-2 ${image_url ? 'hidden' : 'opacity-40'}`}>
          <CategoryPlaceholder category={category} />
        </div>
      </div>

      {/* Content - calibrated and clean */}
      <div className="p-3 flex flex-col flex-1 gap-1">
        {/* Price block */}
        <div className="flex items-baseline">
          <span className="text-lg font-black text-stone-900 font-display">{formatBdt(price)}</span>
        </div>

        {onSale && (
          <p className="text-[10px] text-stone-400 leading-none">
            <span className="line-through font-mono mr-1">{formatBdt(originalPrice)}</span>
            · Save {formatBdt(savings)}
          </p>
        )}

        <p className="text-[9px] font-medium text-stone-300 leading-none">
          {formatUnitPrice(price, unit)}
        </p>

        <h3 className="text-xs font-semibold leading-tight line-clamp-2 text-stone-800 font-body min-h-[2.2em]">
          {name}
        </h3>
        <p className="text-[10px] text-stone-400 leading-none">{unit}</p>

        <div className="mt-auto pt-2">
          {qtyInCart > 0 ? (
            <div className="flex items-center justify-between gap-1.5 w-full">
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateQty(-1); }}
                className="w-10 h-10 rounded-full border-2 border-warm-accent bg-white text-stone-900 flex items-center justify-center text-base font-bold hover:bg-warm-accent active:scale-95 transition-all"
                aria-label="Remove one"
              >
                −
              </button>
              <QtyNumber qty={qtyInCart} className="font-black text-sm min-w-[20px] text-center text-stone-900 font-mono" />
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateQty(1); }}
                className="w-10 h-10 rounded-full border-2 border-warm-accent bg-white text-stone-900 flex items-center justify-center text-base font-bold hover:bg-warm-accent active:scale-95 transition-all"
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
              className="w-full h-10 rounded-full border-2 border-warm-accent text-stone-900 text-xs font-black hover:bg-warm-accent active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] disabled:border-stone-200 disabled:text-stone-300 disabled:hover:bg-white"
            >
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
