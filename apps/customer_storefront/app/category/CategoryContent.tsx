'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { useToast } from '../components/Toast';
import { useCartContext } from '../components/CartProvider';
import { ProductSwimlane } from '../components/ProductSwimlane';
import { SubCategoryPills } from '../components/SubCategoryPills';
import { SponsoredBanner } from '../components/SponsoredBanner';
import { NativeAdBanner } from '../components/NativeAdBanner';
import { CategoryFooter } from '../components/CategoryFooter';
import { CartSheet } from '../components/CartSheet';
import { CartFlyAnimation } from '../components/CartFlyAnimation';
import { SkeletonGrid } from '../components/SkeletonGrid';
import { HeroBanner } from '../components/HeroBanner';
import { PromoGrid } from '../components/PromoGrid';
import { fetchProducts, fetchCategories } from '../lib/products';
import { CATEGORY_LABELS, getCategoryGroup, isCategoryGroup } from '../lib/types';
import type { Product, Category } from '../lib/types';

interface FlyItem {
  id: string;
  emoji: string;
  startX: number;
  startY: number;
}

export function CategoryContent({ categorySlug }: { categorySlug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { cart, addToCart, updateQty, totalItems, total } = useCartContext();

  const currentCat = (categorySlug as Category | 'all') || 'all';
  const theme = searchParams.get('theme') || '';
  const searchTerm = searchParams.get('q') || '';
  const brandParam = searchParams.get('brand') || '';
  const availabilityParam = searchParams.get('availability') || '';
  const brands = useMemo(() => brandParam ? brandParam.split(',') : [], [brandParam]);
  const availability = useMemo(() => availabilityParam ? availabilityParam.split(',') : [], [availabilityParam]);
  const sort = (searchParams.get('sort') as string) || 'best';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; slug: Category; name: string; emoji: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [flyItems, setFlyItems] = useState<FlyItem[]>([]);

  // Detect if this is a group page
  const group = useMemo(() => getCategoryGroup(categorySlug), [categorySlug]);
  const isGroup = !!group;

  // Fetch data
  useEffect(() => {
    setLoading(true);
    fetchCategories()
      .then((cats) => {
        setCategories(cats);

        if (isGroup && group) {
          // Group page: fetch all products for all sub-categories
          const subCatIds = cats
            .filter((c) => group.subCategories.includes(c.slug))
            .map((c) => c.id);
          return fetchProducts(searchTerm || undefined, undefined, subCatIds.length > 0 ? subCatIds : undefined);
        } else if (currentCat !== 'all') {
          // Individual category page
          const catId = cats.find((c) => c.slug === currentCat || c.name.toLowerCase() === currentCat)?.id;
          return fetchProducts(searchTerm || undefined, catId);
        } else {
          // All products
          return fetchProducts(searchTerm || undefined);
        }
      })
      .then((prods) => {
        let filtered = prods;

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
          default:
            break;
        }

        setProducts(filtered);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load category:', err?.message ?? err, err?.code);
        setLoading(false);
      });
  }, [currentCat, theme, searchTerm, brands, availability, sort, isGroup, group]);

  // Derive swimlane products for individual category pages
  const { deals, bestSellers, under300, under500 } = useMemo(() => {
    const deals = products.filter((p) => p.originalPrice && p.originalPrice > p.price).slice(0, 8);
    const bestSellers = products.filter((p) => p.stock > 10).slice(0, 8);
    const under300 = products.filter((p) => p.price <= 300).slice(0, 8);
    const under500 = products.filter((p) => p.price <= 500).slice(0, 8);
    return { deals, bestSellers, under300, under500 };
  }, [products]);

  // For group pages: create a swimlane for each sub-category
  const subCategorySwimlanes = useMemo(() => {
    if (!isGroup || !group) return [];

    return group.subCategories
      .map((subSlug) => {
        const subProducts = products.filter((p) => p.category === subSlug).slice(0, 8);
        return {
          slug: subSlug,
          label: CATEGORY_LABELS[subSlug] || subSlug,
          products: subProducts,
        };
      })
      .filter((s) => s.products.length > 0);
  }, [products, isGroup, group]);

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

  const title = searchTerm
    ? `Search: "${searchTerm}"`
    : theme === 'deals'
    ? 'Rollbacks & Deals'
    : theme === 'new'
    ? 'New Arrivals'
    : theme === 'bestsellers'
    ? 'Best Sellers'
    : isGroup && group
    ? group.label
    : currentCat === 'all'
    ? 'All Products'
    : CATEGORY_LABELS[currentCat];

  return (
    <>
      <Header cartCount={totalItems} onCartClick={() => setCartSheetOpen(true)} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#faf8f5]">
        {/* Main Content Area — full width, no sidebar */}
        <div className="min-w-0">
          {/* ── HERO BANNER ── */}
          <HeroBanner
            title="⚡ Express Delivery"
            subtitle="Delivery in as soon as 1 hour. Shop your faves."
            badge="New"
            bgGradient="from-[#0071DC] to-[#005bb5]"
          />

          {/* ── PROMO GRID ── */}
          <div className="mt-2">
            <PromoGrid />
          </div>

          {/* ── SUB-CATEGORY PILLS ── */}
          <div className="mt-4">
            <SubCategoryPills
              categories={categories}
              active={currentCat !== 'all' ? currentCat : undefined}
              subCategories={isGroup && group ? group.subCategories : undefined}
            />
          </div>

          {/* ── SPONSORED BANNER ── */}
          <SponsoredBanner
            title="Your go-tos, elevated"
            subtitle="bettergoods snack stars"
            ctaText="Shop now"
            bgColor="#f0fdf4"
          />

          {/* ── LOADING STATE ── */}
          {loading ? (
            <div className="px-3 sm:px-4 lg:px-6 py-4">
              <SkeletonGrid count={8} />
            </div>
          ) : (
            <>
              {isGroup && group ? (
                <>
                  {/* ── GROUP PAGE: Swimlane per sub-category ── */}
                  {subCategorySwimlanes.map((swimlane) => (
                    <ProductSwimlane
                      key={swimlane.slug}
                      title={swimlane.label}
                      products={swimlane.products}
                      cart={cart}
                      onAdd={handleAddToCart}
                      onUpdateQty={(id, delta) => updateQty(id, delta)}
                      onClick={(id) => router.push(`/product/${id}`)}
                      action={{ label: 'See all', href: `/category/${swimlane.slug}` }}
                    />
                  ))}

                  {/* ── GROUP PAGE: Deals swimlane ── */}
                  {deals.length > 0 && (
                    <ProductSwimlane
                      title="Rollbacks & Deals"
                      products={deals}
                      cart={cart}
                      onAdd={handleAddToCart}
                      onUpdateQty={(id, delta) => updateQty(id, delta)}
                      onClick={(id) => router.push(`/product/${id}`)}
                    />
                  )}
                </>
              ) : (
                <>
                  {/* ── INDIVIDUAL CATEGORY: Thematic swimlanes ── */}
                  {deals.length > 0 && (
                    <ProductSwimlane
                      title="Rollbacks & Deals"
                      products={deals}
                      cart={cart}
                      onAdd={handleAddToCart}
                      onUpdateQty={(id, delta) => updateQty(id, delta)}
                      onClick={(id) => router.push(`/product/${id}`)}
                      action={{ label: 'See all', href: `/category/${categorySlug}?theme=deals` }}
                    />
                  )}

                  {bestSellers.length > 0 && (
                    <ProductSwimlane
                      title="Best Sellers"
                      products={bestSellers}
                      cart={cart}
                      onAdd={handleAddToCart}
                      onUpdateQty={(id, delta) => updateQty(id, delta)}
                      onClick={(id) => router.push(`/product/${id}`)}
                      action={{ label: 'See all', href: `/category/${categorySlug}?theme=bestsellers` }}
                    />
                  )}

                  {/* ── NATIVE AD BANNER (mid-page break) ── */}
                  <NativeAdBanner
                    title="Your fireside fave is back"
                    subtitle="More s'mores please!"
                    ctaText="Shop now"
                    bgColor="#1c1917"
                  />

                  {under300.length > 0 && (
                    <ProductSwimlane
                      title="Best sellers under ৳300"
                      products={under300}
                      cart={cart}
                      onAdd={handleAddToCart}
                      onUpdateQty={(id, delta) => updateQty(id, delta)}
                      onClick={(id) => router.push(`/product/${id}`)}
                    />
                  )}

                  {under500.length > 0 && (
                    <ProductSwimlane
                      title="Under ৳500"
                      products={under500}
                      cart={cart}
                      onAdd={handleAddToCart}
                      onUpdateQty={(id, delta) => updateQty(id, delta)}
                      onClick={(id) => router.push(`/product/${id}`)}
                    />
                  )}
                </>
              )}

              {/* ── NO RESULTS ── */}
              {products.length === 0 && !loading && (
                <div className="text-center py-16 px-3">
                  <p className="text-[#78716c]">No products found</p>
                  <button
                    onClick={() => router.push('/category')}
                    className="mt-4 text-sm font-medium text-[#0071DC] hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {/* ── CATEGORY FOOTER ── */}
              <CategoryFooter
                categorySlug={categorySlug}
                categoryName={title}
              />
            </>
          )}
        </div>
      </main>
      <BottomNav cartCount={totalItems} cartTotal={total} onCartPillClick={() => setCartSheetOpen(true)} />
      <CartSheet open={cartSheetOpen} onClose={() => setCartSheetOpen(false)} />
      <CartFlyAnimation items={flyItems} onComplete={handleFlyComplete} />
    </>
  );
}
