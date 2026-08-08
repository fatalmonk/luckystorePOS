'use client';

import React from 'react';
import Link from 'next/link';
import { useState } from 'react';
import { formatBdt } from '../lib/formatPrice';
import { getDiscountBadgePercentage } from '../lib/deals';
import { toProductSlug } from '../lib/products/slugify';
import type { Product } from '../lib/types';
import { useCartActions } from '../hooks/useCartActions';
import { ProductImage } from './product/ProductImage';

export interface GridProductCardProps {
  product: Product;
  index?: number;
  brandOverlay?: string;
}

export function GridProductCard({ product, index = 0, brandOverlay }: GridProductCardProps) {
  const { cart, handleAddToCart, handleUpdateQty } = useCartActions();
  const [btnEl, setBtnEl] = useState<HTMLButtonElement | null>(null);

  const qtyInCart = cart.find((c) => c.id === product.id)?.qty || 0;
  const productHref = `/product/${toProductSlug(product.name, product.id)}`;
  const onSale = product.originalPrice != null && product.originalPrice > product.price;
  const discountPercentage = getDiscountBadgePercentage(product);
  const outOfStock = product.stock <= 0;

  return (
    <article
      className="group relative flex h-full w-full flex-col overflow-hidden rounded-warm-lg border border-warm-border bg-warm-surface transition-shadow hover:shadow-warm-rest"
      data-testid="grid-product-card"
    >
      <Link
        href={productHref}
        aria-label={`View ${product.name}`}
        className="relative aspect-square w-full overflow-hidden border-b border-warm-image-well-border bg-warm-image-well p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-warm-accent"
      >
        <ProductImage
          src={product.image_url}
          alt={product.name}
          category={product.category}
          sizes="(max-width: 640px) 33vw, 200px"
          imageClassName="product-image-on-well object-contain p-2"
          priority={index === 0}
          showLoadingState
        />

        {brandOverlay && (
          <span className="pointer-events-none absolute bottom-2 left-2 z-10 rounded-warm-sm bg-warm-surface/95 px-2 py-1 text-xs font-bold text-warm-fg">
            {brandOverlay}
          </span>
        )}
        {discountPercentage !== null && (
          <span className="absolute left-2 top-2 z-10 rounded-warm-sm bg-warm-accent px-2 py-1 text-xs font-black text-warm-accent-text">
            {discountPercentage}% off
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-h-[3.75rem]">
          <Link
            href={productHref}
            className="line-clamp-2 rounded-warm-sm text-xs font-semibold leading-4 text-warm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent sm:text-sm sm:leading-5"
          >
            {product.name}
          </Link>
          <p className="mt-1 text-xs text-warm-muted">{product.unit}</p>
        </div>

        <div className="flex min-h-6 items-baseline gap-1.5">
          <span className="font-mono text-base font-bold text-warm-fg sm:text-lg">
            {formatBdt(product.price)}
          </span>
          {onSale && (
            <span className="font-mono text-xs text-warm-muted line-through">
              {formatBdt(product.originalPrice)}
            </span>
          )}
        </div>

        <div className="mt-auto pt-1">
          {qtyInCart > 0 ? (
            <div className="flex h-11 items-center justify-between rounded-warm-md border border-warm-border bg-warm-bg px-1">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleUpdateQty(product.id, -1);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-warm-sm text-warm-fg transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                aria-label={`Remove one ${product.name}`}
              >
                −
              </button>
              <span className="min-w-[1rem] text-center text-xs font-bold text-warm-fg">
                {qtyInCart}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleUpdateQty(product.id, 1);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-warm-sm text-warm-fg transition-colors hover:bg-warm-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                aria-label={`Add another ${product.name}`}
              >
                +
              </button>
            </div>
          ) : (
            <button
              ref={setBtnEl}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddToCart(product, btnEl);
              }}
              disabled={product.stock <= 0}
              className="h-11 w-full rounded-warm-md bg-warm-accent px-2 text-xs font-black text-warm-accent-text transition-colors hover:bg-warm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent disabled:cursor-not-allowed disabled:border disabled:border-warm-border disabled:bg-warm-bg disabled:text-warm-muted"
              aria-label={outOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
            >
              {outOfStock ? 'Out of stock' : 'Add'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
