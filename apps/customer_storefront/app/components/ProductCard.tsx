'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatBdt, formatUnitPrice } from '../lib/formatPrice';
import { toProductSlug } from '../lib/products/slugify';
import type { Category } from '../lib/types';
import { getLocalWishlist, saveLocalWishlist, toggleWishlistItemServer } from '../lib/wishlistHelpers';
import { useToast } from './Toast';
import { QtyNumber } from './ui/QtyNumber';
import { getOrCreateFingerprint, WishlistButton } from './WishlistButton';
import { CartAnnouncer } from './ui/CartAnnouncer';
import { MarketCard } from './ui/MarketSurface';
import { CategoryPlaceholder as SharedCategoryPlaceholder } from './CategoryPlaceholder';

function CategoryPlaceholder({ category }: { category: Category }) {
  const baseClasses = "w-12 h-12 text-warm-muted";

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
          <rect x="6" y="7" width="12" height="15" rx="2" fill="currentColor" opacity="0.1" />
          <path d="M6 7L12 3L18 7" fill="currentColor" opacity="0.2" />
          <circle cx="12" cy="14" r="3" fill="var(--warm-saffron)" opacity="0.3" />
          <path d="M9 13.5C9.5 13 11 13 12 14.5C13 16 14.5 14 15 13.5" stroke="var(--warm-saffron)" strokeWidth="1.5" />
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
  onAdd: (btnEl?: HTMLButtonElement | null) => void;
  onUpdateQty: (delta: number) => void;
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
  onAddRef,
  priority = false,
  showBrandBadge = false,
}: ProductCardProps) {
  const stockLow = stock === 1;
  const outOfStock = stock <= 0;
  const onSale = originalPrice !== undefined && originalPrice > price;
  const savings = onSale ? originalPrice! - price : 0;

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const { showToast } = useToast();
  const productHref = `/product/${toProductSlug(name, id)}`;

  useEffect(() => {
    const list = getLocalWishlist();
    const isPresent = list.includes(id);
    const timer = setTimeout(() => setIsWishlisted(isPresent), 0);
    return () => clearTimeout(timer);
  }, [id]);

  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [image_url]);

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
    <MarketCard
      interactive
      stockState={outOfStock ? 'unavailable' : stockLow ? 'limited' : 'available'}
      className={`group relative flex h-full flex-col ${theme === 'bestsellers' ? 'border-warm-accent/70' : ''}`}
      data-testid="product-card"
    >
      <CartAnnouncer message={announcement} />
      {/* Badges + wishlist */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex justify-between items-start pointer-events-none">
        {outOfStock ? (
          <span className="product-badge-neutral rounded-full px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wide">
            Out of stock
          </span>
        ) : stockLow ? (
          <span className="product-badge-warning rounded-full px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wide">
            Last one
          </span>
        ) : theme === 'bestsellers' ? (
          <span className="product-badge-accent rounded-full px-2 py-0.5 font-display text-xs font-black uppercase tracking-wide">
            Best seller
          </span>
        ) : badge ? (
          <span className="product-badge-sale rounded-full px-2 py-0.5 font-display text-xs font-black uppercase tracking-wide">
            {badge}
          </span>
        ) : showBrandBadge && brand ? (
          <span className="rounded-full px-2 py-0.5 font-display text-xs font-black uppercase tracking-wide bg-warm-accent/20 text-warm-fg border border-warm-accent/40 backdrop-blur-sm">
            {brand}
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={handleWishlistToggle}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-warm-border bg-warm-surface/95 text-lg shadow-warm-sm backdrop-blur-sm transition-colors hover:border-warm-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
          aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
        >
          {isWishlisted ? (
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-warm-muted hover:text-red-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          )}
        </button>
      </div>

      {/* Image Container — taller, cleaner, editorial */}
      <Link
        href={productHref}
        aria-label={`View ${name}`}
        className="relative w-full aspect-[4/3] bg-warm-surface overflow-hidden flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-warm-accent"
      >
        {image_url && !imageLoaded && !imageError && (
          <div
            data-testid="product-image-loading"
            className="absolute inset-3 animate-pulse rounded-xl bg-warm-border/50"
            aria-hidden="true"
          />
        )}
        {image_url && !imageError ? (
          <Image
            src={image_url}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-2"
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageLoaded(true);
              setImageError(true);
            }}
          />
        ) : null}
        {(!image_url || imageError) && (
          <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center p-4 opacity-30">
            <SharedCategoryPlaceholder category={category} />
          </div>
        )}
      </Link>

      {/* Content — refined editorial layout with consistent heights */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-1.5">
        <div className="flex flex-col gap-1">
          {/* Price block: prominent, clean */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black text-warm-fg font-display tracking-tight">{formatBdt(price)}</span>
            {onSale && (
              <span className="font-mono text-xs text-warm-muted line-through">{formatBdt(originalPrice)}</span>
            )}
          </div>

          {/* Reserved slot for sale savings to align all cards vertically */}
          <div className="h-3.5 flex items-center">
            {onSale ? (
              <p className="product-savings text-xs font-bold leading-none">
                Save {formatBdt(savings)}
              </p>
            ) : null}
          </div>

          <p className="text-xs leading-none text-warm-dim">
            {formatUnitPrice(price, unit)}
          </p>

          <Link
            href={productHref}
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
          >
            <h3 className="min-h-[3.75rem] break-words text-sm font-semibold leading-5 text-warm-fg font-body">
              {name}
            </h3>
          </Link>
        </div>

        <div className="mt-auto pt-2">
          {qtyInCart > 0 ? (
            <div className="flex items-center justify-between gap-1.5 w-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAnnouncement(`Removed one ${name} from cart`);
                  onUpdateQty(-1);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-warm-accent bg-warm-surface text-base font-bold text-warm-fg transition-colors hover:bg-warm-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                aria-label={`Remove one ${name}`}
              >
                −
              </button>
              <QtyNumber qty={qtyInCart} className="font-black text-sm min-w-[20px] text-center text-warm-fg font-mono" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAnnouncement(`Added another ${name} to cart`);
                  onUpdateQty(1);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-warm-accent bg-warm-surface text-base font-bold text-warm-fg transition-colors hover:bg-warm-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                aria-label={`Add another ${name}`}
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
              onClick={(e) => {
                e.stopPropagation();
                setAnnouncement(`${name} added to cart`);
                onAdd(e.currentTarget);
              }}
              disabled={stock <= 0}
              className="h-11 w-full rounded-full bg-warm-accent px-2 text-xs font-black text-warm-accent-text transition-colors duration-300 hover:bg-warm-accent-hover active:scale-[0.96] disabled:bg-warm-border disabled:text-warm-muted sm:px-3"
              aria-label={`Add ${name} to cart`}
            >
              <span className="market-card-add-label-full">Add to Cart</span>
              <span className="market-card-add-label-short">Add</span>
            </button>
          )}
        </div>
      </div>
    </MarketCard>
  );
}
