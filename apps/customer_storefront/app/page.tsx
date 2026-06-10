/* Hallmark · macrostructure: Workbench · genre: modern-minimal · theme: Warm Modern
 * audience: local Bangladeshi grocery shoppers · use: browse and buy essentials
 * tone: soft · paper: #faf8f5 · accent: #dc5f3b terracotta
 * diversification: first-run · slop-test: passed
 */

'use client';

import { useRouter } from 'next/navigation';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ToastProvider, useToast } from './components/Toast';
import { CartProvider, useCartContext } from './components/CartProvider';
import { ProductCard } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { SAMPLE_CATALOG, CATEGORY_EMOJIS, CATEGORY_LABELS } from './lib/types';
import type { Category } from './lib/types';

function HomeContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const { cart, addToCart, updateQty, totalItems, totalPrice } = useCartContext();

  const popularProducts = SAMPLE_CATALOG.slice(0, 12);

  const categories: Category[] = [
    'dairy',
    'grocery',
    'beverages',
    'snacks',
    'household',
    'produce',
    'bakery',
    'frozen',
  ];

  const getQtyInCart = (productId: string) => {
    const item = cart.find((c) => c.id === productId);
    return item?.qty || 0;
  };

  return (
    <>
      <Header cartCount={totalItems} />

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8 xl:p-10">
          {/* Promo Banner */}
          <section className="relative bg-gradient-to-br from-[#dc5f3b] to-[#b94a28] text-white rounded-[14px] p-5 sm:p-6 lg:p-8 mb-6 lg:mb-8 overflow-hidden">
            <div className="absolute -top-5 -right-5 w-[100px] h-[100px] bg-white/5 rounded-full" />
            <div className="relative max-w-3xl">
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest opacity-85 mb-2">
                Week 1 Launch
              </p>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold mb-2 leading-tight">
                Free Delivery on orders ৳500+
              </h2>
              <p className="text-sm sm:text-base opacity-92">Cash on delivery. No app download needed.</p>
            </div>
          </section>

          {/* Categories — responsive grid expansion */}
          <section className="mb-8 lg:mb-10">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight mb-4">Categories</h2>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => router.push(`/category?cat=${cat}`)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[14px] bg-white border border-[#e7e5e4] grid place-items-center text-2xl sm:text-[28px] shadow-sm group-hover:-translate-y-1 group-hover:shadow-md group-hover:border-[#dc5f3b] transition-all duration-200">
                    {CATEGORY_EMOJIS[cat]}
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-[#1c1917] text-center">{CATEGORY_LABELS[cat]}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Popular Products — responsive grid scaling */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">Popular Now</h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push('/category')}
              >
                See all →
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
              {popularProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  {...product}
                  qtyInCart={getQtyInCart(product.id)}
                  onAdd={() => {
                    addToCart(product);
                    showToast(`Added ${product.name}`);
                  }}
                  onUpdateQty={(delta) => {
                    updateQty(product.id, delta);
                  }}
                  onClick={() => router.push(`/product/${product.id}`)}
                />
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Floating Cart Summary — desktop only */}
      {totalItems > 0 && (
        <div className="hidden lg:block fixed bottom-6 right-6 bg-white border border-[#e7e5e4] rounded-[14px] shadow-lg p-4 z-50">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-[#78716c]">{totalItems} items</p>
              <p className="text-lg font-bold">৳{totalPrice}</p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push('/checkout')}
            >
              Checkout →
            </Button>
          </div>
        </div>
      )}

      <BottomNav cartCount={totalItems} />
    </>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <CartProvider>
        <HomeContent />
      </CartProvider>
    </ToastProvider>
  );
}
