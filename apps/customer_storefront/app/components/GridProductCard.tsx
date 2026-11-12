'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Heart } from '@phosphor-icons/react/dist/csr/Heart';
import { formatBdt } from '../lib/formatPrice';
import { getDisplayProductUnit } from '../lib/products/displayProductUnit';
import { getDiscountBadgePercentage } from '../lib/dealSelection';
import { toProductSlug } from '../lib/products/slugify';
import { getProductGalleryImages } from '../lib/products/productGalleryRegistry';
import { toBengaliNumerals, withLocale, type Locale } from '../lib/i18n/config';
import { getDictionary } from '../lib/i18n/dictionaries';
import type { Product } from '../lib/types';
import { useProductCart } from '../hooks/useProductCart';
import { useProductWishlist } from '../hooks/useProductWishlist';
import { ProductImage } from './product/ProductImage';
import { QtyNumber } from './ui/QtyNumber';
import { CartAnnouncer } from './ui/CartAnnouncer';
import { MarketCard } from './ui/MarketSurface';
import { Badge } from './ui/Badge';
import { trackSelectItem } from '../lib/analytics';
import { LiquidButton } from './animate-ui/buttons/liquid';

export interface GridProductCardProps {
  product: Product;
  locale?: Locale;
  linkName?: string;
  priority?: boolean;
  listId?: string;
  listName?: string;
  index?: number;
}

export function formatLocalizedBdt(value: number | null | undefined, locale: Locale): string {
  const formatted = formatBdt(value);
  return locale === 'bn' ? toBengaliNumerals(formatted) : formatted;
}

export function GridProductCard({ product, locale = 'en', linkName, priority = false, listId, listName, index }: GridProductCardProps) {
  const dict = getDictionary(locale);
  const { isWishlisted, isPending, toggle } = useProductWishlist(product.id, product.name);
  const productHref = withLocale(`/product/${toProductSlug(linkName ?? product.name, product.id)}`, locale);
  const onSale = product.originalPrice != null && product.originalPrice > product.price;
  const discountPercentage = getDiscountBadgePercentage(product);
  const stockLow = product.stock === 1;
  const outOfStock = product.stock <= 0;
  const availabilityUnknown = product.availabilityUnknown === true;
  const localGalleryImage = getProductGalleryImages(product.id)?.[0];
  const productImageSrc = localGalleryImage?.url || product.image_url;
  const cartProduct = localGalleryImage?.url && localGalleryImage.url !== product.image_url
    ? { ...product, image_url: localGalleryImage.url }
    : product;
  const { quantity, canAdd, add, increment, decrement, announcement } = useProductCart(cartProduct);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const previewTriggerRef = useRef<HTMLElement | null>(null);
  const previewDialogRef = useRef<HTMLDivElement>(null);
  const badgeLabel = availabilityUnknown
    ? (locale === 'bn' ? 'দাম পুরোনো হতে পারে · অর্ডার বন্ধ' : 'Snapshot · price may be outdated · ordering unavailable')
    : outOfStock
    ? dict.productCard.outOfStock
    : stockLow
      ? dict.productCard.lastOne
      : discountPercentage !== null
        ? `${locale === 'bn' ? toBengaliNumerals(discountPercentage) : discountPercentage}% ${locale === 'bn' ? 'ছাড়' : 'off'}`
        : null;

  useEffect(() => {
    if (!isPreviewOpen) return;
    const previousOverflow = document.body.style.overflow;
    const dialog = previewDialogRef.current;
    const closeButton = dialog?.querySelector<HTMLButtonElement>('[data-preview-close]');
    document.body.style.overflow = 'hidden';
    closeButton?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsPreviewOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previewTriggerRef.current?.focus({ preventScroll: true });
    };
  }, [isPreviewOpen]);


  return (
    <MarketCard
      interactive
      stockState={availabilityUnknown ? 'unavailable' : outOfStock ? 'unavailable' : stockLow ? 'limited' : 'available'}
      className="group relative flex h-full w-full flex-col"
      data-testid="grid-product-card"
    >
      <CartAnnouncer message={announcement} />

      <div className="pointer-events-none absolute left-2.5 right-2.5 top-2.5 z-20 flex items-start justify-between gap-2">
        {badgeLabel ? (
          <Badge
            variant={availabilityUnknown || outOfStock ? 'neutral' : stockLow ? 'warning' : 'sale'}
            className="max-w-[calc(100%-3.5rem)] truncate px-2 py-0.5 text-xs"
          >
            {badgeLabel}
          </Badge>
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
          className="pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-warm-control border border-warm-image-well-border bg-warm-image-well/90 text-lg shadow-warm-card-hover backdrop-blur-sm transition-colors hover:border-warm-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent disabled:opacity-70"
        >
          <Heart
            size={18}
            weight={isWishlisted ? 'fill' : 'bold'}
            className={isWishlisted ? 'text-warm-danger' : 'text-warm-muted transition-colors'}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="product-card-image-well relative aspect-[4/3] w-full shrink-0 overflow-hidden border-b border-warm-image-well-border bg-warm-image-well">
        <Link
          href={productHref}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
              trackSelectItem(product, { listId, listName, index });
              return;
            }
            event.preventDefault();
            trackSelectItem(product, { listId, listName, index });
            previewTriggerRef.current = event.currentTarget;
            setIsPreviewOpen(true);
          }}
          ref={previewTriggerRef as React.Ref<HTMLAnchorElement>}
          aria-label={`${dict.productCard.quickView}: ${product.name}`}
          className="absolute inset-0 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-warm-accent"
        >
          <ProductImage
            src={productImageSrc}
            alt={localGalleryImage?.alt || product.name}
            category={product.category}
            sizes="(max-width: 640px) calc(50vw - 24px), (max-width: 1024px) calc(33vw - 24px), (max-width: 1280px) calc(25vw - 24px), 301px"
            imageClassName="product-image-on-well object-contain p-1"
            priority={priority}
            showLoadingState
          />
        </Link>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-2 p-3">
        <div className="flex flex-col gap-1">
          <Link
            href={productHref}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                trackSelectItem(product, { listId, listName, index });
                return;
              }
              event.preventDefault();
              trackSelectItem(product, { listId, listName, index });
              previewTriggerRef.current = event.currentTarget;
              setIsPreviewOpen(true);
            }}
            className="-mx-1 -my-1 inline-flex min-h-11 items-center rounded-sm px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
          >
            <h3 className="line-clamp-3 break-words font-body text-sm font-semibold leading-5 text-warm-fg">
              {product.name}
            </h3>
          </Link>

          <p className="text-xs leading-none text-warm-dim">{getDisplayProductUnit(product.name, product.unit)}</p>

          <div className="mt-1 flex min-h-6 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="font-mono text-lg font-bold tabular-nums text-warm-fg">{formatLocalizedBdt(product.price, locale)}</span>
            {onSale && (
              <span className="font-mono text-xs tabular-nums text-warm-muted line-through">{formatLocalizedBdt(product.originalPrice, locale)}</span>
            )}
            {onSale && product.originalPrice != null && (
              <span className="text-[11px] font-bold text-warm-muted">
                {dict.productCard.save} {formatLocalizedBdt(product.originalPrice - product.price, locale)}
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
                −
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
          ) : availabilityUnknown ? (
            <button
              type="button"
              disabled
              className="h-12 w-full cursor-not-allowed rounded-warm-control border border-warm-border bg-warm-bg px-3 text-xs font-bold text-warm-muted"
              aria-label={`${product.name} availability is unverified`}
            >
              {locale === 'bn' ? 'স্টক যাচাই করা যায়নি' : 'Availability unverified'}
            </button>
          ) : outOfStock ? (
            <button
              type="button"
              disabled
              className="h-12 w-full cursor-not-allowed rounded-warm-control border border-warm-border bg-warm-bg px-3 text-xs font-bold text-warm-muted"
              aria-label={`${product.name} is out of stock`}
            >
              {dict.productCard.outOfStock}
            </button>
          ) : (
            <LiquidButton
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                add(event.currentTarget);
              }}
              fillHeight="3px"
              delay="0.3s"
              tapScale={0.97}
              className="h-12 w-full rounded-warm-control border border-warm-muted px-2 text-xs font-black text-warm-fg [--liquid-button-background-color:var(--color-surface)] [--liquid-button-color:var(--color-accent)] hover:text-warm-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent disabled:cursor-not-allowed sm:px-3"
              aria-label={`${dict.productCard.addToCart}: ${product.name}`}
            >
              <span className="market-card-add-label-full relative z-10">{dict.productCard.addToCart}</span>
              <span className="market-card-add-label-short relative z-10">{locale === 'bn' ? 'যোগ' : 'Add'}</span>
            </LiquidButton>
          )}
        </div>

      </div>
      {isPreviewOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-end justify-center bg-warm-fg/60 p-0 backdrop-blur-sm md:items-center md:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsPreviewOpen(false);
          }}
        >
          <div
            ref={previewDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`quick-view-title-${product.id}`}
            className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-warm-sheet border border-warm-border bg-warm-bg shadow-warm-lg md:max-h-[min(38rem,85vh)] md:rounded-warm-panel"
          >
            <div className="flex items-center justify-between gap-3 border-b border-warm-border/70 px-4 py-3">
              <h2 id={`quick-view-title-${product.id}`} className="min-w-0 truncate font-heading text-lg font-black text-warm-fg">{product.name}</h2>
              <button
                type="button"
                data-preview-close
                onClick={() => setIsPreviewOpen(false)}
                aria-label={dict.productCard.closeQuickView}
                className="grid size-11 shrink-0 place-items-center rounded-full text-xl text-warm-muted hover:bg-warm-image-well focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
              >×</button>
            </div>
            <div className="overflow-y-auto overscroll-contain p-4">
              <div className="relative mx-auto flex h-52 max-w-sm items-center justify-center overflow-hidden rounded-warm-panel border border-warm-image-well-border bg-warm-image-well sm:h-60">
                <ProductImage
                  src={productImageSrc}
                  alt={localGalleryImage?.alt || product.name}
                  category={product.category}
                  sizes="(max-width: 640px) 90vw, 400px"
                  imageClassName="product-image-on-well object-contain p-3"
                  priority
                  showLoadingState
                />
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-2xl font-black tabular-nums text-warm-fg">{formatLocalizedBdt(product.price, locale)}</span>
                  {onSale && product.originalPrice != null && <span className="font-mono text-sm text-warm-muted line-through">{formatLocalizedBdt(product.originalPrice, locale)}</span>}
                </div>
                <div className="flex items-start justify-between gap-3 border-y border-warm-border/60 py-3 text-sm">
                  <span className="text-warm-muted">{dict.productCard.packSize}</span>
                  <span className="text-right font-semibold text-warm-fg">{getDisplayProductUnit(product.name, product.unit)}</span>
                </div>
                <p className={`text-xs font-semibold ${availabilityUnknown || outOfStock ? 'text-warm-muted' : stockLow ? 'text-warm-danger' : 'text-warm-success'}`}>
                  {availabilityUnknown
                    ? (locale === 'bn' ? 'স্টক যাচাই করা যায়নি' : 'Availability unverified')
                    : outOfStock
                      ? dict.productCard.outOfStock
                      : stockLow
                        ? dict.productCard.lastOne
                        : dict.productCard.stockRemaining.replace('{count}', locale === 'bn' ? toBengaliNumerals(product.stock) : String(product.stock))}
                </p>
                {quantity > 0 ? (
                  <div className="flex min-h-12 items-center justify-between rounded-warm-control border border-warm-border bg-warm-surface p-1">
                    <button type="button" onClick={decrement} className="grid size-11 place-items-center rounded-full text-lg font-bold text-warm-fg hover:bg-warm-image-well focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent" aria-label={`${locale === 'bn' ? 'একটি সরান' : 'Remove one'} ${product.name}`}>−</button>
                    <QtyNumber qty={quantity} className="min-w-8 text-center font-mono font-black text-warm-fg" />
                    <button type="button" onClick={increment} disabled={!canAdd} className="grid size-11 place-items-center rounded-full text-lg font-bold text-warm-fg hover:bg-warm-image-well focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent disabled:cursor-not-allowed disabled:opacity-40" aria-label={`${locale === 'bn' ? 'আরও যোগ করুন' : 'Add another'} ${product.name}`}>+</button>
                  </div>
                ) : availabilityUnknown || outOfStock ? (
                  <button type="button" disabled className="min-h-12 w-full cursor-not-allowed rounded-warm-control border border-warm-border bg-warm-surface text-sm font-bold text-warm-muted">{availabilityUnknown ? (locale === 'bn' ? 'স্টক যাচাই করা যায়নি' : 'Availability unverified') : dict.productCard.outOfStock}</button>
                ) : (
                  <button type="button" onClick={(event) => add(event.currentTarget)} className="min-h-12 w-full rounded-warm-control bg-warm-accent px-4 text-sm font-black text-warm-accent-text transition-colors hover:bg-warm-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent">{dict.productCard.addToCart}</button>
                )}
                <Link href={productHref} onClick={() => trackSelectItem(product, { listId, listName, index })} className="flex min-h-11 items-center justify-center rounded-warm-control text-sm font-bold text-warm-fg underline decoration-warm-border underline-offset-4 hover:text-warm-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent">
                  {dict.productCard.viewDetails}
                </Link>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </MarketCard>
  );
}
