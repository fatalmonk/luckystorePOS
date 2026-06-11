'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ToastProvider, useToast } from './components/Toast';
import { CartProvider, useCartContext } from './components/CartProvider';
import { ProductCarousel } from './components/ProductCarousel';
import { CategoryGrid } from './components/CategoryGrid';
import { HeroBanner } from './components/HeroBanner';
import { CartSheet } from './components/CartSheet';
import { CartFlyAnimation } from './components/CartFlyAnimation';
import { PromoGrid, PromoGridSkeleton } from './components/PromoGrid';
import { SocialCarousel, SocialCarouselSkeleton } from './components/SocialCarousel';
import { SkeletonCarousel, SkeletonHeader, SkeletonHero } from './components/SkeletonGrid';
import { fetchProducts, fetchCategories } from './lib/products';
import type { Product } from './lib/types';

interface FlyItem {
  id: string;
  emoji: string;
  startX: number;
  startY: number;
}

function HomeContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const { cart, addToCart, updateQty, totalItems, total } = useCartContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; slug: string; name: string; emoji: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [flyItems, setFlyItems] = useState<FlyItem[]>([]);

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

  const handleAddToCart = useCallback((product: Product, buttonEl?: HTMLButtonElement | null) => {
    addToCart(product);
    showToast(`Added ${product.name}`);

    if (buttonEl) {
      const rect = buttonEl.getBoundingClientRect();
      setFlyItems((prev) => [
        ...prev,
        {
          id: `${product.id}-${Date.now()}`,
          emoji: product.emoji,
          startX: rect.left + rect.width / 2,
          startY: rect.top + rect.height / 2,
        },
      ]);
    }
  }, [addToCart, showToast]);

  const handleFlyComplete = useCallback((id: string) => {
    setFlyItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return (
    <>
      <Header
        cartCount={totalItems}
        onCartClick={() => setCartSheetOpen(true)}
      />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8 xl:px-10">
          {/* Hero Banner */}
          {loading ? (
            <SkeletonHero />
          ) : (
            <HeroBanner
              title="Free Delivery on orders ৳500+"
              subtitle="Cash on delivery. No app download needed."
              badge="Week 1 Launch"
              bgGradient="from-[#FFF34D] to-[#C4C087]"
            />
          )}

          {/* Secondary Navigation - CategoryGrid */}
          <CategoryGrid categories={categories} />

          {/* Promo Grid (Asymmetric) */}
          {loading ? (
            <PromoGridSkeleton />
          ) : (
            <PromoGrid />
          )}

          {/* Popular Now Carousel */}
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-3">Popular Now</h2>
            {loading ? (
              <SkeletonCarousel count={4} />
            ) : (
              <ProductCarousel
                title="Popular Now"
                products={products.slice(0, 12)}
                cart={cart}
                onAdd={handleAddToCart}
                onUpdateQty={(id, delta) => updateQty(id, delta)}
                onClick={(id) => router.push(`/product/${id}`)}
              />
            )}
          </section>

          {/* Social Commerce Carousel */}
          {loading ? (
            <SocialCarouselSkeleton count={5} />
          ) : (
            <SocialCarousel />
          )}
        </div>
      </main>
      <BottomNav
        cartCount={totalItems}
        cartTotal={total}
        onCartPillClick={() => setCartSheetOpen(true)}
      />
      <CartSheet open={cartSheetOpen} onClose={() => setCartSheetOpen(false)} />
      <CartFlyAnimation items={flyItems} onComplete={handleFlyComplete} />
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