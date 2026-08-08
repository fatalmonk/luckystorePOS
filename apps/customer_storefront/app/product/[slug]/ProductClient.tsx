'use client';

import Link from 'next/link';
import { toProductSlug } from '../../lib/products/slugify';
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

interface ProductClientProps {
  product: Product;
  crossSell: Product[];
}

function ProductContent({ product, crossSell }: ProductClientProps) {
  const { showToast } = useToast();
  const { cart, addToCart, updateQty } = useCartContext();
  const { addViewed } = useRecentlyViewed();

  // Record product view post-mount
  useEffect(() => {
    if (product?.id) {
      addViewed(product.id);
    }
  }, [product?.id, addViewed]);

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

  const productUrl = `/product/${toProductSlug(product.name, product.id)}`;

  return (
    <>
      <ProductJsonLd product={product} />
      <Header />

      <main className="flex-1 pb-28 md:pb-12">
        <div className="max-w-3xl mx-auto bg-warm-surface min-h-full rounded-t-2xl mt-2">
          {/* Breadcrumb Navigation */}
          <div className="pt-2">
            <Breadcrumbs
              items={[
                { label: product.category, href: `/category/${product.category}` },
                { label: product.name, href: productUrl },
              ]}
            />
          </div>

          {/* Hero Section */}
          <div className="px-4 pt-4 pb-5 sm:px-6 lg:px-8">
            <div className="relative w-full aspect-square max-w-[360px] mx-auto rounded-2xl bg-warm-bg overflow-hidden mb-6">
              <ProductImage
                src={product.image_url}
                alt={product.name}
                category={product.category}
                sizes="(max-width: 768px) 100vw, 360px"
                imageClassName="w-full h-full object-contain p-6 sm:p-8"
                priority
                iconSize={64}
              />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-warm-fg mb-1">
                  {product.name}
                </h1>
                <p className="text-sm text-warm-muted">{product.unit}</p>
              </div>
              <div aria-live="polite" aria-atomic="true" className="shrink-0">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${stockStatus.bg} ${stockStatus.color}`}
                  aria-label={stockStatus.aria}
                >
                  {stockStatus.text}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-tight text-warm-fg">
                {formatBdt(product.price)}
              </span>
            </div>

            {/* Action Area — Desktop & Inline */}
            <div className="mt-6">
              <TrustStrip className="mb-4" />
              {qtyInCart > 0 ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateQty(-1)}
                    className="w-12 h-12 rounded-full border-2 border-warm-accent bg-warm-surface text-warm-fg flex items-center justify-center text-base font-bold hover:bg-warm-accent active:scale-95 transition-all press-feedback"
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
                    className="w-12 h-12 rounded-full border-2 border-warm-accent bg-warm-surface text-warm-fg flex items-center justify-center text-base font-bold hover:bg-warm-accent active:scale-95 transition-all press-feedback disabled:opacity-50"
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
                    className="h-12 flex-1 cursor-not-allowed rounded-warm-md border border-warm-border bg-warm-bg px-5 text-sm font-bold text-warm-muted"
                    aria-label={`${product.name} is out of stock`}
                  >
                    Out of stock
                  </button>
                  {product.category && (
                    <Link
                      href={`/category/${encodeURIComponent(product.category)}`}
                      className="h-12 px-5 rounded-full bg-warm-bg text-warm-fg text-sm font-bold hover:bg-warm-border-light active:scale-[0.98] transition-all flex items-center justify-center"
                    >
                      See Similar Items →
                    </Link>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleAdd}
                  className="h-12 px-8 rounded-full bg-warm-accent text-warm-accent-text text-sm font-bold hover:bg-warm-accent-hover active:scale-[0.98] transition-all press-feedback"
                >
                  Add to Cart
                </button>
              )}
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
      <div className="fixed bottom-[var(--bottom-nav-height)] left-0 right-0 z-40 bg-warm-surface/95 backdrop-blur-md border-t border-warm-border p-3 px-4 flex items-center justify-between shadow-lg md:hidden">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-warm-fg line-clamp-1">{product.name}</span>
          <span className="text-sm font-black text-warm-fg">{formatBdt(product.price)}</span>
        </div>
        <div>
          {qtyInCart > 0 ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleUpdateQty(-1)}
                className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full border-2 border-warm-accent bg-warm-surface text-warm-fg flex items-center justify-center font-bold text-base active:scale-95"
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
                className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full border-2 border-warm-accent bg-warm-surface text-warm-fg flex items-center justify-center font-bold text-base active:scale-95 disabled:opacity-50"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              disabled={product.stock <= 0}
              className="px-5 py-2.5 h-11 min-h-[44px] rounded-full bg-warm-accent text-warm-accent-text font-extrabold text-xs shadow-sm hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
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

export default function ProductClient({ product, crossSell }: ProductClientProps) {
  return <ProductContent product={product} crossSell={crossSell} />;
}
