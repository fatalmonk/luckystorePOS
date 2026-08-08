'use client';

import React from 'react';
import Link from 'next/link';
import { useState } from 'react';
import { formatBdt } from '../lib/formatPrice';
import { toProductSlug } from '../lib/products/slugify';
import type { Product } from '../lib/types';
import { useCartActions } from '../hooks/useCartActions';
import { ProductImage } from './product/ProductImage';

export interface CompactProductCardProps {
  product: Product;
  index?: number;
  offerBadge?: string;
}

export function CompactProductCard({ product, index = 0, offerBadge }: CompactProductCardProps) {
  const { cart, handleAddToCart, handleUpdateQty } = useCartActions();
  const [btnEl, setBtnEl] = useState<HTMLButtonElement | null>(null);

  const qtyInCart = cart.find((c) => c.id === product.id)?.qty || 0;
  const productHref = `/product/${toProductSlug(product.name, product.id)}`;
  const onSale = product.originalPrice != null && product.originalPrice > product.price;

  return (
    <article
      className="group relative flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-warm-border bg-warm-surface shadow-warm-rest transition-all hover:shadow-warm-hover"
      data-testid="product-card"
    >
      {/* Image */}
      <Link
        href={productHref}
        aria-label={`View ${product.name}`}
        className="relative aspect-square w-full overflow-hidden bg-[#f8f8f8] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-warm-accent"
      >
        <ProductImage
          src={product.image_url}
          alt={product.name}
          category={product.category}
          sizes="(max-width: 640px) 40vw, 200px"
          imageClassName="object-contain p-2"
          priority={index === 0}
          showLoadingState
        />
      </Link>

      {/* Add / Qty button */}
      <div className="absolute right-2 top-2 z-10">
        {qtyInCart > 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-full border border-warm-border bg-warm-surface p-1 shadow-warm-sm">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleUpdateQty(product.id, -1);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full text-warm-fg transition-colors hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
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
              className="flex h-7 w-7 items-center justify-center rounded-full text-warm-fg transition-colors hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
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
            className="flex h-9 w-9 items-center justify-center rounded-full border border-warm-border bg-warm-surface text-warm-fg shadow-warm-sm transition-colors hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent disabled:opacity-50"
            aria-label={`Add ${product.name} to cart`}
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1 p-3 pt-2">
        {/* Offer badge */}
        <div className="h-6">
          {offerBadge || product.badge ? (
            <span className="inline-block rounded-full bg-[#f8bbd0] px-2 py-0.5 text-[10px] font-extrabold text-[#880e4f] sm:text-xs">
              {offerBadge || product.badge}
            </span>
          ) : onSale ? (
            <span className="inline-block rounded-full bg-[#f8bbd0] px-2 py-0.5 text-[10px] font-extrabold text-[#880e4f] sm:text-xs">
              Save {formatBdt(product.originalPrice! - product.price)}
            </span>
          ) : null}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-black text-warm-fg sm:text-lg">
            {formatBdt(product.price)}
          </span>
          {onSale && (
            <span className="text-xs text-warm-muted line-through">
              {formatBdt(product.originalPrice)}
            </span>
          )}
        </div>

        {/* Name */}
        <Link
          href={productHref}
          className="line-clamp-2 text-xs font-semibold leading-4 text-warm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent sm:text-sm sm:leading-5"
        >
          {product.name} {product.unit && <span className="text-warm-muted">· {product.unit}</span>}
        </Link>
      </div>
    </article>
  );
}
