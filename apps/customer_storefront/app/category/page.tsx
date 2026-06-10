'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { ToastProvider, useToast } from '../components/Toast';
import { CartProvider, useCartContext } from '../components/CartProvider';
import { ProductCard } from '../components/ui/Card';
import { SAMPLE_CATALOG, CATEGORY_LABELS } from '../lib/types';
import type { Category } from '../lib/types';

const categories: (Category | 'all')[] = [
  'all',
  'dairy',
  'grocery',
  'beverages',
  'snacks',
  'household',
  'produce',
  'bakery',
  'frozen',
];

function CategoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { cart, addToCart, updateQty, totalItems } = useCartContext();

  const currentCat = (searchParams.get('cat') as Category | 'all') || 'all';
  const searchTerm = searchParams.get('q') || '';

  const filteredProducts = SAMPLE_CATALOG.filter((product) => {
    if (searchTerm) {
      return product.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    if (currentCat === 'all') return true;
    return product.category === currentCat;
  });

  const getQtyInCart = (productId: string) => {
    const item = cart.find((c) => c.id === productId);
    return item?.qty || 0;
  };

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
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  if (cat === 'all') {
                    params.delete('cat');
                  } else {
                    params.set('cat', cat);
                  }
                  params.delete('q');
                  router.push(`/category?${params.toString()}`);
                }}
                className={`flex-shrink-0 px-3 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                  currentCat === cat
                    ? 'bg-[#dc5f3b] text-white'
                    : 'bg-[#faf8f5] text-[#1c1917] border border-[#e7e5e4] hover:bg-[#f5f5f4]'
                }`}
              >
                {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 gap-3.5">
            {filteredProducts.map((product) => (
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

          {filteredProducts.length === 0 && (
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
