'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { ToastProvider, useToast } from '../components/Toast';
import { CartProvider, useCartContext } from '../components/CartProvider';
import { ProductGrid } from '../components/ProductGrid';
import { CategoryGrid } from '../components/CategoryGrid';
import { CartSheet } from '../components/CartSheet';
import { CartFlyAnimation } from '../components/CartFlyAnimation';
import { FilterSidebar } from '../components/FilterSidebar';
import { SkeletonGrid, SkeletonCategoryGrid, SkeletonHeader } from '../components/SkeletonGrid';
import { fetchProducts, fetchCategories } from '../lib/products';
import { CATEGORY_LABELS } from '../lib/types';
import type { Product, Category } from '../lib/types';

interface FlyItem {
  id: string;
  emoji: string;
  startX: number;
  startY: number;
}

function CategoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { cart, addToCart, updateQty, totalItems, total } = useCartContext();

  // Parse filters from URL (shallow routing)
  const currentCat = (searchParams.get('cat') as Category | 'all') || 'all';
  const theme = searchParams.get('theme') || '';
  const searchTerm = searchParams.get('q') || '';
  const priceParam = searchParams.get('price');
  const priceRange = priceParam ? priceParam.split(',').map(Number) : undefined;
  const brands = searchParams.get('brand')?.split(',') || [];
  const availability = searchParams.get('availability')?.split(',') || [];
  const sort = (searchParams.get('sort') as string) || 'best';

  const activeFilters = useMemo(() => ({
    cat: currentCat !== 'all' ? currentCat : undefined,
    theme: theme || undefined,
    q: searchTerm || undefined,
    priceRange: priceRange as [number, number] | undefined,
    brands: brands.length ? brands : undefined,
    availability: availability.length ? availability : undefined,
    sort: sort !== 'best' ? sort : undefined,
  }), [currentCat, theme, searchTerm, priceRange, brands, availability, sort]);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; slug: string; name: string; emoji: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [flyItems, setFlyItems] = useState<FlyItem[]>([]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Fetch data based on URL filters
  useEffect(() => {
    setLoading(true);
    fetchCategories()
      .then((cats) => {
        setCategories(cats);
        const catId = currentCat !== 'all'
          ? cats.find((c) => c.slug === currentCat || c.name.toLowerCase() === currentCat)?.id
          : undefined;
        return fetchProducts(searchTerm || undefined, catId);
      })
      .then((prods) => {
        // Apply client-side filters that aren't handled by the RPC
        let filtered = prods;

        // Price range filter
        if (priceRange) {
          filtered = filtered.filter((p) => {
            const min = priceRange[0] ?? 0;
            const max = priceRange[1] ?? Infinity;
            return p.price >= min && p.price <= max;
          });
        }

        // Availability filter
        if (availability.length) {
          filtered = filtered.filter((p) => {
            if (availability.includes('in_stock') && p.stock > 5) return true;
            if (availability.includes('low_stock') && p.stock > 0 && p.stock <= 5) return true;
            return false;
          });
        }

        // Sort
        switch (sort) {
          case 'price_asc':
            filtered.sort((a, b) => a.price - b.price);
            break;
          case 'price_desc':
            filtered.sort((a, b) => b.price - a.price);
            break;
          case 'newest':
            // Would need created_at field - skip for now
            break;
          default:
            // Best match - keep original order
            break;
        }

        setProducts(filtered);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load category:', err?.message ?? err, err?.code);
        setLoading(false);
      });
  }, [currentCat, theme, searchTerm, priceRange, brands, availability, sort]);

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

  const handleFilterChange = useCallback((filters: Record<string, string | undefined>) => {
    // Filters are applied via URL navigation in FilterSidebar
    // This callback is for any additional logic needed
    console.log('Filters updated:', filters);
  }, []);

  const title = searchTerm
    ? `Search: "${searchTerm}"`
    : theme === 'deals'
    ? 'Rollbacks & Deals'
    : theme === 'new'
    ? 'New Arrivals'
    : theme === 'bestsellers'
    ? 'Best Sellers'
    : currentCat === 'all'
    ? 'All Products'
    : CATEGORY_LABELS[currentCat];

  return (
    <>
      <Header cartCount={totalItems} onCartClick={() => setCartSheetOpen(true)} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Two-column layout: Sidebar + Product Grid */}
        <div className="flex flex-col lg:flex-row">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden px-4 py-3 border-b border-[#e7e5e4]">
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="w-full h-[48px] min-h-[44px] flex items-center justify-center gap-2 bg-white border border-[#e7e5e4] rounded-[14px] text-sm font-medium text-[#1c1917] hover:bg-[#faf8f5] transition-colors press-feedback"
            >
              <span className="text-lg">🔍</span>
              <span>Filters</span>
            </button>
          </div>

          <div className="flex flex-1">
            {/* Filter Sidebar */}
            <FilterSidebar
              categories={categories}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
            />

            {/* Product Grid Area */}
            <div className="flex-1 lg:ml-0">
              <div className="p-4 sm:p-6 lg:p-8 xl:p-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold tracking-tight">{title}</h2>
                  {Object.keys(activeFilters).some(k => activeFilters[k as keyof typeof activeFilters]) && (
                    <span className="text-xs text-[#a8a29e] bg-[#f5f5f4] px-2 py-1 rounded-full">
                      {Object.values(activeFilters).filter(Boolean).length} filter(s) active
                    </span>
                  )}
                </div>

                {/* Sticky Category Bar */}
                <CategoryGrid categories={categories} active={theme || currentCat} sticky />

                <div className="mt-4">
                  {loading ? (
                    <SkeletonGrid count={6} />
                  ) : (
                    <ProductGrid
                      products={products}
                      cart={cart}
                      onAdd={handleAddToCart}
                      onUpdateQty={(id, delta) => updateQty(id, delta)}
                      onClick={(id) => router.push(`/product/${id}`)}
                    />
                  )}

                  {products.length === 0 && !loading && (
                    <div className="text-center py-16">
                      <p className="text-[#78716c]">No products found</p>
                      <button
                        onClick={() => router.push('/category')}
                        className="mt-4 text-sm font-medium text-[#0071DC] hover:underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <BottomNav cartCount={totalItems} cartTotal={total} onCartPillClick={() => setCartSheetOpen(true)} />
      <CartSheet open={cartSheetOpen} onClose={() => setCartSheetOpen(false)} />
      <CartFlyAnimation items={flyItems} onComplete={handleFlyComplete} />
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