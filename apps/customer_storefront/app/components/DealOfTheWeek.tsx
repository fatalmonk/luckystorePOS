'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ProductCard } from './ProductCard';
import { DealCountdown } from './DealCountdown';
import { useCartActions } from '../hooks/useCartActions';
import { getDealOfTheWeekProducts, getDiscountPercentage } from '../lib/deals';
import type { Product } from '../lib/types';

const CartFlyAnimation = dynamic(
  () => import('./CartFlyAnimation').then((m) => ({ default: m.CartFlyAnimation })),
  { ssr: false }
);

interface DealOfTheWeekProps {
  products: Product[];
}

export function DealOfTheWeek({ products }: DealOfTheWeekProps) {
  const selection = useMemo(() => getDealOfTheWeekProducts(products), [products]);
  const { cart, flyItems, handleAddToCart, handleUpdateQty, handleFlyComplete, handleClick } = useCartActions();



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
    <section className="bg-gradient-to-br from-warm-fg via-[#18171c] to-warm-fg text-white rounded-[24px] p-5 sm:p-7 shadow-warm-md border border-warm-accent/30 space-y-6">
      {/* Top Banner Header with Countdown */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-warm-accent text-warm-fg text-[11px] font-black uppercase tracking-wider">
              Limited Time
            </span>
            <span className="text-warm-accent font-bold text-xs">Rolling Weekly Deal</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
            <span>🔥</span> Deal of the Week
          </h2>
        </div>

        {/* Edge-Synchronized Deal Countdown Timer */}
        <DealCountdown />
      </div>

      {/* Main Deal Layout: Left Lead Product Card (Prominent) | Right Supporting Products Mosaic */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Lead Product Hero Card */}
        <div className="lg:col-span-5 bg-white/5 border border-white/10 rounded-[20px] p-5 flex flex-col justify-between space-y-4">
          <div className="relative flex items-center justify-center p-6 bg-white/5 rounded-2xl border border-white/5">
            <span className="absolute top-3 left-3 bg-red-600 text-white font-black text-xs px-3 py-1 rounded-full shadow-md">
              {leadDiscount}% OFF
            </span>
            <span className="text-7xl sm:text-8xl transform hover:scale-110 transition-transform duration-300">
              {leadProduct.emoji}
            </span>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-warm-accent uppercase tracking-wide">
              {leadProduct.category}
            </span>
            <h3 className="text-lg sm:text-xl font-black text-white">{leadProduct.name}</h3>
            <p className="text-xs text-gray-300 line-clamp-2">{leadProduct.description}</p>

            <div className="flex items-baseline gap-2 pt-2">
              <span className="text-2xl font-black text-warm-accent">৳{leadProduct.price}</span>
              {leadProduct.originalPrice && (
                <span className="text-sm font-bold text-gray-400 line-through">
                  ৳{leadProduct.originalPrice}
                </span>
              )}
              <span className="text-xs text-gray-400 font-medium">/ {leadProduct.unit}</span>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <Link
              href="/category?theme=deals"
              className="flex-1 text-center py-3 px-4 rounded-full bg-warm-accent text-warm-fg text-xs font-black uppercase tracking-wider hover:bg-warm-accent-hover transition-colors shadow-warm-sm"
            >
              Shop All Deals →
            </Link>
          </div>
        </div>

        {/* Supporting Products Mosaic */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-gray-200">More Top Savings</h4>
            <Link
              href="/category?theme=deals"
              className="text-xs font-bold text-warm-accent hover:underline"
            >
              View All Deals ({products.filter((p) => p.originalPrice && p.originalPrice > p.price).length}) →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                    onClick={() => handleClick(product.id)}
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
    </section>
  );
}
