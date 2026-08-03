'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { formatBdt } from '../../lib/formatPrice';
import { toProductSlug } from '../../lib/products/slugify';
import { useCartContext } from '../CartProvider';
import { useToast } from '../Toast';
import { QtyNumber } from '../ui/QtyNumber';
import type { Product } from '../../lib/products/types';

interface MiniProductCardProps {
  product: Product;
}

/**
 * Compact cross-sell product card with quick-add.
 * - Plus button expands into quantity stepper when the product is in cart.
 * - Respects stock state (disabled/muted when out of stock).
 * - Falls back to emoji placeholder on image error.
 */
export function MiniProductCard({ product }: MiniProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const { cart, addToCart, updateQty } = useCartContext();
  const { showToast } = useToast();
  const href = `/product/${toProductSlug(product.name, product.id)}`;
  const outOfStock = product.stock <= 0;
  const qtyInCart = cart.find((c) => c.id === product.id)?.qty || 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addToCart(product);
    showToast(`Added ${product.name} to cart`);
  };

  const handleUpdateQty = (e: React.MouseEvent, delta: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (qtyInCart + delta <= 0) {
      updateQty(product.id, -1);
    } else {
      updateQty(product.id, delta);
    }
  };

  return (
    <Link
      href={href}
      className={`group relative flex w-[140px] shrink-0 flex-col rounded-warm-lg border border-warm-border bg-warm-surface p-2 transition-all hover:shadow-warm-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent ${outOfStock ? 'opacity-60' : ''}`}
      aria-label={outOfStock ? `${product.name}, out of stock` : product.name}
    >
      {!outOfStock && (
        <div className="absolute bottom-1.5 right-1.5 z-10">
          {qtyInCart > 0 ? (
            <div className="flex items-center gap-1 rounded-full border border-warm-accent bg-warm-surface p-0.5 shadow-sm">
              <button
                type="button"
                onClick={(e) => handleUpdateQty(e, -1)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-warm-fg transition-colors hover:bg-warm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                aria-label={`Remove one ${product.name}`}
              >
                −
              </button>
              <QtyNumber
                qty={qtyInCart}
                className="min-w-[16px] text-center text-xs font-bold text-warm-fg"
                aria-label={`Quantity ${qtyInCart} in cart`}
              />
              <button
                type="button"
                onClick={(e) => handleUpdateQty(e, 1)}
                disabled={qtyInCart >= product.stock}
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-warm-fg transition-colors hover:bg-warm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent disabled:opacity-50"
                aria-label={`Add another ${product.name}`}
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-warm-accent text-warm-accent-text shadow-sm transition-transform active:scale-95 hover:bg-warm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              aria-label={`Add ${product.name} to cart`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          )}
        </div>
      )}

      <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-warm-md bg-warm-bg">
        {product.image_url && !imageError ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="140px"
            className="object-contain p-2"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl" aria-hidden="true">
            {product.emoji}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="text-xs font-bold text-warm-fg line-clamp-2">{product.name}</p>
        {product.unit ? (
          <p className="text-xs text-warm-muted">{product.unit}</p>
        ) : null}
        <p className="text-xs font-black text-warm-fg">{formatBdt(product.price)}</p>

        {outOfStock ? (
          <span className="mt-0.5 rounded-full bg-warm-border-light px-1.5 py-0.5 text-xs font-bold text-warm-muted">
            Out of stock
          </span>
        ) : null}
      </div>
    </Link>
  );
}
