'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { ToastProvider, useToast } from '../components/Toast';
import { CartProvider, useCartContext } from '../components/CartProvider';
import { ProductGrid } from '../components/ProductGrid';
import { fetchProducts, fetchCategories } from '../lib/products';
import { CATEGORY_LABELS } from '../lib/types';
import type { Product, Category } from '../lib/types';

function CategoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { cart, addToCart, updateQty, totalItems } = useCartContext();

  const currentCat = (searchParams.get('cat') as Category | 'all') || 'all';
  const searchTerm = searchParams.get('q') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; slug: string; name: string; emoji: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchProducts(searchTerm || undefined, currentCat !== 'all' ? currentCat : undefined),
      fetchCategories(),
    ])
      .then(([prods, cats]) => {
        setProducts(prods);
        setCategories(cats);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load category:', err);
        setLoading(false);
      });
  }, [currentCat, searchTerm]);

  const title = searchTerm
    ? `Search: "${searchTerm}"`
    : currentCat === 'all'
    ? 'All Products'
    : CATEGORY_LABELS[currentCat];

  return (
    <>
      <Header cartCount={totalItems} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-[18px]">
          <h2 className="text-lg font-bold tracking-tight mb-3">{title}</h2>

          {/* Category Filter */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => router.push('/category')}
              className={`flex-shrink-0 px-3 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                currentCat === 'all'
                  ? 'bg-[#dc5f3b] text-white'
                  : 'bg-[#faf8f5] text-[#1c1917] border border-[#e7e5e4] hover:bg-[#f5f5f4]'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set('cat', cat.slug);
                  params.delete('q');
                  router.push(`/category?${params.toString()}`);
                }}
                className={`flex-shrink-0 px-3 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                  currentCat === cat.slug
                    ? 'bg-[#dc5f3b] text-white'
                    : 'bg-[#faf8f5] text-[#1c1917] border border-[#e7e5e4] hover:bg-[#f5f5f4]'
                }`}
              >
                {CATEGORY_LABELS[cat.slug as Category] || cat.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-[#e7e5e4] rounded-[14px] h-64 animate-pulse" />
              ))}
            </div>
          ) : (
            <ProductGrid
              products={products}
              cart={cart}
              onAdd={(product) => {
                addToCart(product);
                showToast(`Added ${product.name}`);
              }}
              onUpdateQty={(id, delta) => updateQty(id, delta)}
              onClick={(id) => router.push(`/product/${id}`)}
            />
          )}

          {products.length === 0 && !loading && (
            <div className="text-center py-16">
              <p className="text-[#78716c]">No products found</p>
            </div>
          )}
        </div>
      </main>
      <BottomNav cartCount={totalItems} />
    </>
  );
}

export default function CategoryPage() {
  return (
    <ToastProvider>
      <CartProvider>
        <Suspense fallback={<div className="p-[18px]">Loading...</div>}>
          <CategoryContent />
        </Suspense>
      </CartProvider>
    </ToastProvider>
  );
}
