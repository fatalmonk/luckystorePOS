'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ToastProvider, useToast } from './components/Toast';
import { CartProvider, useCartContext } from './components/CartProvider';
import { ProductGrid } from './components/ProductGrid';
import { CategoryGrid } from './components/CategoryGrid';
import { fetchProducts, fetchCategories } from './lib/products';
import type { Product } from './lib/types';

function HomeContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const { cart, addToCart, updateQty, totalItems } = useCartContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; slug: string; name: string; emoji: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchProducts(), fetchCategories()])
      .then(([prods, cats]) => {
        setProducts(prods);
        setCategories(cats);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load products:', err?.message ?? err, err?.code, err?.details);
        setLoading(false);
      });
  }, []);

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
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest opacity-85 mb-2">Week 1 Launch</p>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold mb-2 leading-tight">Free Delivery on orders ৳500+</h2>
              <p className="text-sm sm:text-base opacity-92">Cash on delivery. No app download needed.</p>
            </div>
          </section>

          <CategoryGrid categories={categories} />

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">Popular Now</h2>
            </div>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-[#e7e5e4] rounded-[14px] h-64 animate-pulse" />
                ))}
              </div>
            ) : (
              <ProductGrid
                products={products.slice(0, 12)}
                cart={cart}
                onAdd={(product) => {
                  addToCart(product);
                  showToast(`Added ${product.name}`);
                }}
                onUpdateQty={(id, delta) => updateQty(id, delta)}
                onClick={(id) => router.push(`/product/${id}`)}
              />
            )}
          </section>
        </div>
      </main>
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
