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
        bg-warm-surface border border-warm-border rounded-[20px]
        overflow-hidden
        transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${hover ? 'card-hover hover:border-warm-accent hover:-translate-y-0.5 cursor-pointer shadow-warm-sm hover:shadow-warm-md' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

function CategoryPlaceholder({ category }: { category: Category }) {
  const baseClasses = "w-12 h-12 text-warm-muted/70 transition-transform duration-500 group-hover:scale-110";
  
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
          <rect x="2" y="3" width="20" height=" la-height-14" rx="2" />
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

interface ProductCardProps {
  id: string;
  emoji: string;
  name: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  brand?: string;
  unit: string;
  stock: number;
  category: Category;
  image_url?: string | null;
  qtyInCart?: number;
  theme?: 'deals' | 'bestsellers';
  onAdd: () => void;
  onUpdateQty: (delta: number) => void;
  onClick: () => void;
  onAddRef?: (el: HTMLButtonElement | null) => void;
  priority?: boolean;
  showBrandBadge?: boolean;
}

export function ProductCard({
  id,
  emoji,
  name,
  price,
  originalPrice,
  badge,
  brand,
  unit,
  stock,
  category,
  image_url,
  qtyInCart = 0,
  theme,
  onAdd,
  onUpdateQty,
  onClick,
  onAddRef,
  priority = false,
  showBrandBadge = false,
}: ProductCardProps) {
  const stockLow = stock > 0 && stock <= 5;
  const outOfStock = stock <= 0;
  const onSale = originalPrice !== undefined && originalPrice > price;
  const savings = onSale ? originalPrice! - price : 0;

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { showToast } = useToast();

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
    <Card hover onClick={onClick} className={`flex flex-col group relative card-reveal ${
      theme === 'deals' ? 'border-red-300/60' : theme === 'bestsellers' ? 'border-warm-accent/70' : ''
    }`} data-testid="product-card">
      {/* Badges + wishlist */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex justify-between items-start pointer-events-none">
        {theme === 'bestsellers' ? (
          <span className="bg-warm-accent text-warm-fg text-[9px] font-black px-2 py-0.5 rounded-full shadow-warm-sm uppercase tracking-wider font-display">
            ⭐ Best Seller
          </span>
        ) : badge ? (
          <span className="bg-red-600 text-warm-surface text-[9px] font-black px-2 py-0.5 rounded-full shadow-warm-sm uppercase tracking-wider font-display">
            {badge}
          </span>
        ) : showBrandBadge && brand ? (
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shadow-warm-sm uppercase tracking-wider font-display ${
            brand === 'Polar' ? 'bg-blue-100 text-blue-700' :
            brand === 'Igloo' ? 'bg-red-100 text-red-700' :
            brand === 'Savoy' ? 'bg-green-100 text-green-700' :
            'bg-warm-accent text-warm-fg'
          }`}>
            {brand}
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={handleWishlistToggle}
          className="pointer-events-auto w-10 h-10 rounded-full bg-warm-surface/95 backdrop-blur-sm shadow-warm-sm flex items-center justify-center text-lg transition-transform hover:scale-105 active:scale-95 border border-warm-border"
          aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
        >
          {isWishlisted ? (
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.3 la-15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-warm-muted hover:text-red-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          )}
        </button>
      </div>

      {/* Image Container — taller, cleaner, editorial */}
      <div className="relative w-full aspect-[4/3] bg-warm-bg/30 overflow-hidden flex items-center justify-center shrink-0">
        {image_url && !imageError ? (
          <Image
            src={image_url}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-3 transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.06]"
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            onError={() => setImageError(true)}
          />
        ) : null}
        {(!image_url || imageError) && (
          <div className="absolute inset-0 flex items-center justify-center p-4 opacity-30">
            <CategoryPlaceholder category={category} />
          </div>
        )}
        {/* Subtle bottom gradient fade into content */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-warm-surface/60 to-transparent pointer-events-none" />
      </div>

      {/* Content — refined editorial layout */}
      <div className="p-3.5 flex flex-col flex-1 gap-1.5">
        {/* Price block: prominent, clean */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-black text-warm-fg font-display tracking-tight">{formatBdt(price)}</span>
          {onSale && (
            <span className="text-[11px] text-warm-muted line-through font-mono">{formatBdt(originalPrice)}</span>
          )}
        </div>

        {onSale && (
          <p className="text-[10px] font-bold text-red-600 leading-none">
            Save {formatBdt(savings)}
          </p>
        )}

        <p className="text-[10px] text-warm-dim leading-none">
          {formatUnitPrice(price, unit)}
        </p>

        <h3 className="text-[13px] font-semibold leading-snug line-clamp-2 text-warm-fg font-body min-h-[2.4em]">
          {name}
        </h3>
        <p className="text-[10px] text-warm-muted leading-none">{unit}</p>

        <div className="mt-auto pt-2">
          {qtyInCart > 0 ? (
            <div className="flex items-center justify-between gap-1.5 w-full">
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateQty(-1); }}
                className="w-10 h-10 rounded-full border-2 border-warm-accent bg-warm-surface text-warm-fg flex items-center justify-center text-base font-bold hover:bg-warm-accent active:scale-95 transition-all"
                aria-label="Remove one"
              >
                −
              </button>
              <QtyNumber qty={qtyInCart} className="font-black text-sm min-w-[20px] text-center text-warm-fg font-mono" />
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateQty(1); }}
                className="w-10 h-10 rounded-full border-2 border-warm-accent bg-warm-surface text-warm-fg flex items-center justify-center text-base font-bold hover:bg-warm-accent active:scale-95 transition-all"
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
              className={`w-full h-10 rounded-full border-2 text-warm-fg text-[11px] sm:text-xs font-black active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] disabled:border-warm-border disabled:text-warm-muted disabled:hover:bg-warm-surface px-2 sm:px-3 ${
                theme === 'deals'
                  ? 'border-red-400 hover:bg-red-50'
                  : 'border-warm-accent hover:bg-warm-accent'
              }`}
            >
              <span className="hidden sm:inline">Add to Cart</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
