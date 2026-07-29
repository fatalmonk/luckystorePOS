'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo } from 'react';
import { useCartActions } from '../hooks/useCartActions';
import { getDealOfTheWeekProducts, getDiscountPercentage } from '../lib/deals';
import type { Product } from '../lib/types';
import { DealCountdown } from './DealCountdown';
import { ProductCard } from './ProductCard';
import { MarketPanel } from './ui/MarketSurface';

const CartFlyAnimation = dynamic(
  () => import('./CartFlyAnimation').then((m) => ({ default: m.CartFlyAnimation })),
  { ssr: false }
);

interface DealOfTheWeekProps {
  products: Product[];
}

export function DealOfTheWeek({ products }: DealOfTheWeekProps) {
  const selection = useMemo(() => getDealOfTheWeekProducts(products), [products]);
  const { cart, flyItems, handleAddToCart, handleUpdateQty, handleFlyComplete } = useCartActions();



  if (!selection) {
    return null;
  }

  const { leadProduct, supportingProducts } = selection;
  const leadDiscount = getDiscountPercentage(leadProduct);

  const getQtyInCart = (productId: string) => {
    const item = cart.find((c) => c.id === productId);
    return item?.qty || 0;
  };

  return (
    <MarketPanel
      aria-labelledby="weekly-deal-title"
      tone="accent"
      className="deal-panel space-y-7 p-5 sm:p-7"
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="home-section-kicker">Save this week</p>
          <h2 id="weekly-deal-title" className="home-section-title">
            This week&apos;s best deal
          </h2>
          <p className="home-section-description">
            Our biggest featured saving, with more discounted products alongside it.
          </p>
        </div>
        <DealCountdown />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <article className="deal-lead-card flex flex-col justify-between space-y-4 rounded-[22px] p-5 lg:col-span-5">
          <Link
            href={`/product/${encodeURIComponent(leadProduct.id)}`}
            aria-label={`View ${leadProduct.name}`}
            className="deal-product-visual relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-[18px] border p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2 focus-visible:ring-offset-warm-bg sm:min-h-[340px]"
          >
            <span className="deal-discount absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-xs font-black shadow-md">
              {leadDiscount}% OFF
            </span>
            {leadProduct.image_url ? (
              <div className="relative h-[260px] w-full sm:h-[320px]">
                <Image
                  src={leadProduct.image_url}
                  alt={leadProduct.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 520px"
                  className="object-contain"
                />
              </div>
            ) : (
              <span className="text-8xl sm:text-9xl" aria-hidden="true">
                {leadProduct.emoji}
              </span>
            )}
          </Link>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-warm-muted">
              {leadProduct.category}
            </span>
            <h3 className="text-lg font-black text-warm-fg sm:text-xl">
              <Link
                href={`/product/${encodeURIComponent(leadProduct.id)}`}
                className="hover:text-warm-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent focus-visible:ring-offset-2 focus-visible:ring-offset-warm-bg"
              >
                {leadProduct.name}
              </Link>
            </h3>
            <p className="line-clamp-2 text-xs leading-5 text-warm-muted">{leadProduct.description}</p>

            <div className="flex flex-wrap items-baseline gap-2 pt-2">
              <span className="text-2xl font-black text-warm-accent">৳{leadProduct.price}</span>
              {leadProduct.originalPrice && (
                <span className="text-sm font-bold text-warm-muted line-through">
                  ৳{leadProduct.originalPrice}
                </span>
              )}
              <span className="text-xs font-medium text-warm-muted">/ {leadProduct.unit}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Link
              href="/category?theme=deals"
              className="home-primary-action inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-4 py-3 text-center text-xs font-black uppercase tracking-wider"
            >
              Shop all deals →
            </Link>
          </div>
        </article>

        <div className="space-y-4 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-warm-fg">More deals</h3>
            <Link
              href="/category?theme=deals"
              className="home-text-link inline-flex min-h-11 items-center text-xs font-bold"
            >
              See {products.filter((p) => p.originalPrice && p.originalPrice > p.price).length} deals →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {supportingProducts.map((product) => {
              let addBtnRef: HTMLButtonElement | null = null;
              return (
                <div key={product.id} className="text-warm-fg">
                  <ProductCard
                    id={product.id}
                    emoji={product.emoji}
                    name={product.name}
                    price={product.price}
                    originalPrice={product.originalPrice}
                    badge={product.badge}
                    unit={product.unit}
                    stock={product.stock}
                    category={product.category}
                    image_url={product.image_url}
                    qtyInCart={getQtyInCart(product.id)}
                    theme="deals"
                    onAdd={() => handleAddToCart(product, addBtnRef)}
                    onUpdateQty={(delta) => handleUpdateQty(product.id, delta)}
                    onAddRef={(el) => {
                      addBtnRef = el;
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <CartFlyAnimation items={flyItems} onComplete={handleFlyComplete} />
    </MarketPanel>
  );
}
