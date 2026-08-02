'use client';

import Link from 'next/link';
import Image from 'next/image';
import { toProductSlug } from '../../lib/products/slugify';
import { useEffect } from 'react';
import { Header } from '../../components/updated/Header';
import { BottomNav } from '../../components/BottomNav';
import { useToast } from '../../components/Toast';
import { useCartContext } from '../../components/CartProvider';
import { WishlistButton } from '../../components/WishlistButton';
import { QtyNumber } from '../../components/ui/QtyNumber';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { ProductJsonLd } from '../../components/seo/ProductJsonLd';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { formatBdt } from '../../lib/formatPrice';
import type { Product } from '../../lib/types';

interface ProductClientProps {
  product: Product;
}

function ProductContent({ product }: ProductClientProps) {
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
      ? { text: 'Out of Stock', color: 'text-red-600', bg: 'bg-red-50' }
      : product.stock <= 5
      ? { text: `Only ${product.stock} left`, color: 'text-amber-700', bg: 'bg-amber-50' }
      : { text: 'In Stock', color: 'text-green-700', bg: 'bg-green-50' };

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

  const taka = Math.floor(product.price);
  const paisa = Math.round((product.price % 1) * 100).toString().padStart(2, '0');

  return (
    <>
      <ProductJsonLd product={product} />
      <Header />

      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-28 md:pb-12">
        <div className="max-w-3xl mx-auto bg-warm-surface min-h-full rounded-t-2xl mt-2">
          {/* Breadcrumb Navigation */}
          <div className="pt-2">
            <Breadcrumbs
              items={[
                { label: product.category, href: `/category/${product.category}` },
                { label: product.name, href: `/product/${toProductSlug(product.name, product.id)}` },
              ]}
            />
          </div>

          {/* Hero Section */}
          <div className="px-4 pt-4 pb-5 sm:px-6 lg:px-8">
            <div className="relative w-full aspect-square max-w-[360px] mx-auto rounded-2xl bg-warm-bg overflow-hidden mb-6">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 360px"
                  className="w-full h-full object-contain p-6 sm:p-8"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const placeholder = e.currentTarget.parentElement?.querySelector('[data-placeholder]');
                    if (placeholder) placeholder.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div data-placeholder className={`absolute inset-0 grid place-items-center text-[100px] ${product.image_url ? 'hidden' : ''}`}>
                {product.emoji}
              </div>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-warm-fg mb-1">
                  {product.name}
                </h1>
                <p className="text-sm text-warm-muted">{product.unit}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${stockStatus.bg} ${stockStatus.color}`}>
                {stockStatus.text}
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-tight text-warm-fg">৳{taka}</span>
              <span className="text-lg font-extrabold text-warm-fg">{paisa}</span>
            </div>

            {/* Action Area — Desktop & Inline */}
            <div className="mt-6">
              {qtyInCart > 0 ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateQty(-1)}
                    className="w-12 h-12 rounded-full border-2 border-warm-accent bg-warm-surface text-warm-fg flex items-center justify-center text-base font-bold hover:bg-warm-accent active:scale-95 transition-all press-feedback"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <QtyNumber qty={qtyInCart} className="font-bold text-sm min-w-[28px] text-center" />
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
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <WishlistButton productId={product.id} productName={product.name} />
                  </div>
                  <Link
                    href={`/category/${product.category}`}
                    className="h-12 px-5 rounded-full bg-warm-bg text-warm-fg text-sm font-bold hover:bg-warm-border-light active:scale-[0.98] transition-all flex items-center justify-center"
                  >
                    See Similar Items →
                  </Link>
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
            <h2 className="text-[15px] font-bold mb-2 text-warm-fg">Description</h2>
            <p className="text-sm text-warm-muted leading-relaxed">
              {product.description || `Fresh ${product.name} delivered to your door.`}
            </p>
          </div>

          {product.nutrition && (
            <div className="border-t border-warm-border px-4 py-5 sm:px-6 lg:px-8">
              <h2 className="text-[15px] font-bold mb-2 text-warm-fg">Nutrition per 100ml</h2>
              <p className="text-sm text-warm-muted leading-relaxed">{product.nutrition}</p>
            </div>
          )}
        </div>
      </main>

      {/* Sticky Mobile Add-to-Cart Bar */}
      <div className="fixed bottom-[60px] left-0 right-0 z-40 bg-warm-surface/95 backdrop-blur-md border-t border-warm-border p-3 px-4 flex items-center justify-between shadow-lg md:hidden">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-warm-fg line-clamp-1">{product.name}</span>
          <span className="text-sm font-black text-warm-fg">{formatBdt(product.price)}</span>
        </div>
        <div>
          {qtyInCart > 0 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleUpdateQty(-1)}
                className="w-9 h-9 rounded-full border-2 border-warm-accent bg-warm-surface text-warm-fg flex items-center justify-center font-bold text-sm"
              >
                −
              </button>
              <QtyNumber qty={qtyInCart} className="font-bold text-xs min-w-[20px] text-center" />
              <button
                onClick={() => handleUpdateQty(1)}
                disabled={qtyInCart >= product.stock}
                className="w-9 h-9 rounded-full border-2 border-warm-accent bg-warm-surface text-warm-fg flex items-center justify-center font-bold text-sm disabled:opacity-50"
              >
                +
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              disabled={product.stock <= 0}
              className="px-5 py-2.5 rounded-full bg-[#f0c444] text-[#0B0B0D] font-extrabold text-xs shadow-sm hover:opacity-90 disabled:opacity-50"
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

export default function ProductClient({ product }: ProductClientProps) {
  return <ProductContent product={product} />;
}

