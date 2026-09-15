'use client';

import React from 'react';
import Link from 'next/link';
import { Heart } from '@phosphor-icons/react';
import { formatBdt } from '../lib/formatPrice';
import { getDiscountBadgePercentage } from '../lib/deals';
import { toProductSlug } from '../lib/products/slugify';
import { withLocale, type Locale } from '../lib/i18n/config';
import type { Product } from '../lib/types';
import { useProductCart } from '../hooks/useProductCart';
import { useProductWishlist } from '../hooks/useProductWishlist';
import { ProductImage } from './product/ProductImage';
import { QtyNumber } from './ui/QtyNumber';
import { CartAnnouncer } from './ui/CartAnnouncer';
import { MarketCard } from './ui/MarketSurface';
import { trackSelectItem } from '../lib/analytics';

export interface GridProductCardProps {
  product: Product;
  locale?: Locale;
  linkName?: string;
  priority?: boolean;
  listId?: string;
  listName?: string;
  index?: number;
}

export function GridProductCard({ product, locale = 'en', linkName, priority = false, listId, listName, index }: GridProductCardProps) {
  const { quantity, canAdd, add, increment, decrement, announcement } = useProductCart(product);
  const { isWishlisted, isPending, toggle } = useProductWishlist(product.id, product.name);
  const productHref = withLocale(`/product/${toProductSlug(linkName ?? product.name, product.id)}`, locale);
  const onSale = product.originalPrice != null && product.originalPrice > product.price;
  const discountPercentage = getDiscountBadgePercentage(product);
  const stockLow = product.stock === 1;
  const outOfStock = product.stock <= 0;
  const badgeLabel = outOfStock
    ? 'Out of stock'
    : stockLow
      ? 'Last one'
      : discountPercentage !== null
        ? `${discountPercentage}% off`
        : null;

  return (
    <MarketCard
      interactive
      stockState={outOfStock ? 'unavailable' : stockLow ? 'limited' : 'available'}
      className="group relative flex h-full w-full flex-col"
      data-testid="grid-product-card"
    >
      <CartAnnouncer message={announcement} />

      <div className="pointer-events-none absolute left-2.5 right-2.5 top-2.5 z-20 flex items-start justify-between gap-2">
        {badgeLabel ? (
          <span className={`max-w-[calc(100%-3.5rem)] truncate rounded-full px-2 py-0.5 font-display text-xs font-black uppercase tracking-wide ${
            outOfStock ? 'product-badge-neutral' : stockLow ? 'product-badge-warning' : 'product-badge-sale'
          }`}>
            {badgeLabel}
          </span>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void toggle();
          }}
          disabled={isPending}
          aria-pressed={isWishlisted}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-warm-control border border-warm-image-well-border bg-warm-image-well/90 text-lg shadow-warm-card-hover backdrop-blur-sm transition-colors hover:border-warm-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent disabled:opacity-70"
        >
          <Heart
            size={18}
            weight={isWishlisted ? 'fill' : 'bold'}
            className={isWishlisted ? 'text-warm-danger' : 'text-warm-muted transition-colors'}
            aria-hidden="true"
          />
        </button>
      </div>

      <Link
        href={productHref}
        onClick={() => trackSelectItem(product, { listId, listName, index })}
        aria-label={`View ${product.name}`}
        className="product-card-image-well relative flex aspect-[4/3] w-full shrink-0 items-center justify-center overflow-hidden border-b border-warm-image-well-border bg-warm-image-well focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-warm-accent"
      >
        <ProductImage
          src={product.image_url}
          alt={product.name}
          category={product.category}
          sizes="(max-width: 640px) calc(50vw - 24px), (max-width: 1024px) calc(33vw - 24px), (max-width: 1280px) calc(25vw - 24px), 301px"
          imageClassName="product-image-on-well object-contain p-1"
          priority={priority}
          showLoadingState
        />
      </Link>

      <div className="flex flex-1 flex-col justify-between gap-2 p-3">
        <div className="flex flex-col gap-1">
          <Link
            href={productHref}
            onClick={() => trackSelectItem(product, { listId, listName, index })}
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
          >
            <h3 className="line-clamp-3 break-words font-body text-sm font-semibold leading-5 text-warm-fg">
              {product.name}
            </h3>
          </Link>

          <p className="text-xs leading-none text-warm-dim">{product.unit}</p>

          <div className="mt-1 flex min-h-6 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="font-mono text-lg font-bold text-warm-fg">{formatBdt(product.price)}</span>
            {onSale && (
              <span className="font-mono text-xs text-warm-muted line-through">{formatBdt(product.originalPrice)}</span>
            )}
            {onSale && product.originalPrice != null && (
              <span className="text-[11px] font-bold text-warm-muted">
                Save {formatBdt(product.originalPrice - product.price)}
              </span>
            )}
          </div>
        </div>

        <div className="pt-1">
          {quantity > 0 ? (
            <div className="flex w-full items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  decrement();
                }}
                className="flex h-12 w-12 items-center justify-center rounded-warm-control border border-warm-muted bg-warm-surface text-base font-bold text-warm-fg transition-colors hover:bg-warm-image-well focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                aria-label={`Remove one ${product.name}`}
              >
                -
              </button>
              <QtyNumber qty={quantity} className="min-w-[20px] text-center font-mono text-sm font-black text-warm-fg" />
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  increment();
                }}
                disabled={!canAdd}
                className="flex h-12 w-12 items-center justify-center rounded-warm-control border border-warm-muted bg-warm-surface text-base font-bold text-warm-fg transition-colors hover:bg-warm-image-well focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Add another ${product.name}`}
              >
                +
              </button>
            </div>
          ) : outOfStock ? (
            <button
              type="button"
              disabled
              className="h-12 w-full cursor-not-allowed rounded-warm-control border border-warm-border bg-warm-bg px-3 text-xs font-bold text-warm-muted"
              aria-label={`${product.name} is out of stock`}
            >
              Out of stock
            </button>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                add(event.currentTarget);
              }}
              disabled={!canAdd}
              className="h-12 w-full rounded-warm-control border border-warm-muted bg-warm-surface px-2 text-xs font-black text-warm-fg transition-colors hover:bg-warm-image-well active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent disabled:cursor-not-allowed disabled:border disabled:border-warm-border disabled:bg-warm-bg disabled:text-warm-muted sm:px-3"
              aria-label={`Add to Cart: ${product.name}`}
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
