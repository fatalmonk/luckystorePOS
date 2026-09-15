'use client';

import Link from 'next/link';
import { toProductSlug } from '../../lib/products/slugify';
import { withLocale, type Locale } from '../../lib/i18n/config';
import { useEffect } from 'react';
import { Header } from '../../components/updated/Header';
import { BottomNav } from '../../components/BottomNav';
import { useToast } from '../../components/Toast';
import { useCartContext } from '../../components/CartProvider';
import { QtyNumber } from '../../components/ui/QtyNumber';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { ProductJsonLd } from '../../components/seo/ProductJsonLd';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { formatBdt } from '../../lib/formatPrice';
import type { Product } from '../../lib/products/types';
import { TrustStrip } from '../../components/product/TrustStrip';
import { ProductCarousel } from '../../components/product/ProductCarousel';
import { ProductImage } from '../../components/product/ProductImage';
import { trackViewItem } from '../../lib/analytics';

interface ProductClientProps {
  product: Product;
  crossSell: Product[];
  locale?: Locale;
  productUrlName?: string;
}

function ProductContent({ product, crossSell, locale = 'en', productUrlName }: ProductClientProps) {
  const { showToast } = useToast();
  const { cart, addToCart, updateQty } = useCartContext();
  const { addViewed } = useRecentlyViewed();

  // Record product view post-mount
  useEffect(() => {
    if (product?.id) {
      addViewed(product.id);
      trackViewItem(product);
    }
  }, [product, addViewed]);

  const qtyInCart = cart.find((c) => c.id === product.id)?.qty || 0;

  const stockStatus =
    product.stock <= 0
      ? { text: 'Out of Stock', color: 'text-warm-danger', bg: 'bg-warm-danger-bg', aria: 'Out of stock' }
      : product.stock <= 5
      ? { text: `Only ${product.stock} left`, color: 'text-warm-warning', bg: 'bg-warm-warning-bg', aria: `Low stock, only ${product.stock} left` }
      : { text: 'In Stock', color: 'text-warm-success', bg: 'bg-warm-success-bg', aria: 'In stock' };

  const handleAdd = () => {
    if (product.stock <= 0) {
      showToast('Sorry, this item is out of stock');
      return;
    }
    addToCart(product);
    showToast(`Added ${product.name} to cart`);
  };

  const handleUpdateQty = (delta: number) => {
    if (qtyInCart + delta <= 0) {
      updateQty(product.id, -1);
    } else {
      updateQty(product.id, delta);
    }
  };

  const productUrl = withLocale(`/product/${toProductSlug(productUrlName ?? product.name, product.id)}`, locale);

  return (
    <>
      <ProductJsonLd product={product} />
      <Header />

      <main className="flex-1 pb-28 md:pb-12">
        <div className="mx-auto mt-2 min-h-full max-w-[var(--container-storefront)] rounded-t-warm-panel bg-warm-bg px-[var(--space-page-x)] md:mt-6">
          {/* Breadcrumb Navigation */}
          <div className="pt-2 md:pt-0">
            <Breadcrumbs
              items={[
                { label: product.category, href: `/category/${product.category}` },
                { label: product.name, href: productUrl },
              ]}
            />
          </div>

          {/* Hero Section */}
          <div className="grid gap-6 py-5 md:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] md:items-start md:gap-8 lg:gap-10">
            <div className="mx-auto w-full max-w-[420px] md:sticky md:top-24 md:max-w-none">
              <div className="relative aspect-square overflow-hidden rounded-warm-sheet border border-warm-image-well-border bg-warm-image-well">
                <ProductImage
                  src={product.image_url}
                  alt={product.name}
                  category={product.category}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  imageClassName="w-full h-full object-contain p-6 sm:p-8 lg:p-10"
                  priority
                  iconSize={64}
                />
              </div>
            </div>

            <div className="rounded-warm-panel border border-warm-border bg-warm-bg p-4 shadow-warm-panel sm:p-6 lg:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-warm-fg mb-1">
                    {product.name}
                  </h1>
                  <p className="text-sm text-warm-muted">{product.unit}</p>
                </div>
                <div aria-live="polite" aria-atomic="true" className="shrink-0">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-warm-control text-xs font-bold ${stockStatus.bg} ${stockStatus.color}`}
                    aria-label={stockStatus.aria}
                  >
                    {stockStatus.text}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-mono text-4xl font-extrabold text-warm-fg">
                  {formatBdt(product.price)}
                </span>
              </div>

              {/* Action Area — Desktop & Inline */}
              <div className="mt-6">
                <TrustStrip className="mb-4" />
                {qtyInCart > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleUpdateQty(-1)}
                      className="w-12 h-12 rounded-warm-control border-2 border-warm-accent bg-warm-image-well text-warm-fg flex items-center justify-center text-base font-bold hover:bg-warm-accent active:scale-95 transition-all press-feedback focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <QtyNumber
                      qty={qtyInCart}
                      className="font-bold text-sm min-w-[28px] text-center"
                      aria-label={`Quantity ${qtyInCart} in cart`}
                    />
                    <button
                      onClick={() => handleUpdateQty(1)}
                      disabled={qtyInCart >= product.stock}
                      className="w-12 h-12 rounded-warm-control border-2 border-warm-accent bg-warm-image-well text-warm-fg flex items-center justify-center text-base font-bold hover:bg-warm-accent active:scale-95 transition-all press-feedback focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent disabled:opacity-50"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                    <span className="ml-2 text-sm font-semibold text-warm-muted">
                      {formatBdt(product.price * qtyInCart)} total
                    </span>
                  </div>
                ) : product.stock <= 0 ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      type="button"
                      disabled
                      className="h-12 flex-1 cursor-not-allowed rounded-warm-control border border-warm-border bg-warm-bg px-5 text-sm font-bold text-warm-muted"
                      aria-label={`${product.name} is out of stock`}
                    >
                      Out of stock
                    </button>
                    {product.category && (
                      <Link
                        href={`/category/${encodeURIComponent(product.category)}`}
                        className="h-12 px-5 rounded-warm-control bg-warm-image-well text-warm-fg text-sm font-bold hover:bg-warm-border-light active:scale-[0.98] transition-all flex items-center justify-center"
                      >
                        See Similar Items
                      </Link>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleAdd}
                    className="h-12 px-8 rounded-warm-control bg-warm-accent text-warm-accent-text text-sm font-bold hover:bg-warm-accent-hover active:scale-[0.98] transition-all press-feedback focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                  >
                    Add to Cart
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="border-t border-warm-border px-4 py-5 sm:px-6 lg:px-8">
            <h2 className="text-sm font-bold mb-2 text-warm-fg">Description</h2>
            <p className="text-sm text-warm-muted leading-relaxed">
              {product.description || `Fresh ${product.name} delivered to your door.`}
            </p>
          </div>

          {product.nutrition && (
            <div className="border-t border-warm-border px-4 py-5 sm:px-6 lg:px-8">
              <h2 className="text-sm font-bold mb-2 text-warm-fg">Nutrition per 100ml</h2>
              <p className="text-sm text-warm-muted leading-relaxed">{product.nutrition}</p>
            </div>
          )}

          <ProductCarousel title="More to explore" products={crossSell} />
        </div>
      </main>

      {/* Sticky Mobile Add-to-Cart Bar */}
      <div className="fixed bottom-[var(--bottom-nav-height)] left-0 right-0 z-40 bg-warm-bg/95 backdrop-blur-md border-t border-warm-border p-3 px-4 flex items-center justify-between shadow-warm-lg md:hidden">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-warm-fg line-clamp-1">{product.name}</span>
          <span className="text-sm font-black text-warm-fg">{formatBdt(product.price)}</span>
        </div>
        <div>
          {qtyInCart > 0 ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleUpdateQty(-1)}
                className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-warm-control border-2 border-warm-accent bg-warm-image-well text-warm-fg flex items-center justify-center font-bold text-base active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <QtyNumber
                qty={qtyInCart}
                className="font-bold text-sm min-w-[24px] text-center"
                aria-label={`Quantity ${qtyInCart} in cart`}
              />
              <button
                onClick={() => handleUpdateQty(1)}
                disabled={qtyInCart >= product.stock}
                className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-warm-control border-2 border-warm-accent bg-warm-image-well text-warm-fg flex items-center justify-center font-bold text-base active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent disabled:opacity-50"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              disabled={product.stock <= 0}
              className="px-5 py-2.5 h-11 min-h-[44px] rounded-warm-control bg-warm-accent text-warm-accent-text font-extrabold text-xs shadow-warm-card-hover hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent disabled:opacity-50"
            >
              {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          )}
        </div>
      </div>

      <BottomNav />
    </>
  );
}

export default function ProductClient({ product, crossSell, locale, productUrlName }: ProductClientProps) {
  return <ProductContent product={product} crossSell={crossSell} locale={locale} productUrlName={productUrlName} />;
}
