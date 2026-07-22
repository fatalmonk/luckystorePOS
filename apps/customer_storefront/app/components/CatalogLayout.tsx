'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Funnel, X, Check, ArrowDown, ArrowUp, Sparkle, Tag } from '@phosphor-icons/react';
import { ProductCard } from './ProductCard';
import { useCartActions } from '../hooks/useCartActions';
import { CATEGORY_GROUPS } from '../lib/types';
import type { Product, CategoryGroup } from '../lib/types';

const CartFlyAnimation = dynamic(
  () => import('./CartFlyAnimation').then((m) => ({ default: m.CartFlyAnimation })),
  { ssr: false }
);

const PRICE_OPTIONS = [
  { value: '0-100', label: 'Under ৳100' },
  { value: '100-500', label: '৳100 – ৳500' },
  { value: '500-1000', label: '৳500 – ৳1000' },
  { value: '1000-999999', label: '৳1000+' },
];

const AVAILABILITY_OPTIONS = [
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low_stock', label: 'Low Stock (≤5)' },
  { value: 'out_of_stock', label: 'Out of Stock' },
];

const SORT_OPTIONS = [
  { value: 'best', label: 'Best Match' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];

function normalizeBrand(b?: string | null): string {
  return (b || '').trim().toLowerCase();
}

interface CatalogLayoutProps {
  products: Product[];
  categorySlug: string;
  group?: CategoryGroup;
  parentGroup?: CategoryGroup;
  categories: { id: string; slug: string; name: string; emoji: string }[];
  theme: string;
  sort: string;
  searchParams: Record<string, string | string[] | undefined>;
}

export function CatalogLayout({
  products,
  categorySlug,
  group,
  parentGroup,
  categories,
  theme,
  sort,
  searchParams,
}: CatalogLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const urlParams = useSearchParams();

  const { cart, flyItems, handleAddToCart, handleUpdateQty, handleFlyComplete, handleClick } = useCartActions();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Extract active query params
  const activePriceParam = (urlParams.get('price') || searchParams?.price || '') as string;
  const activePrices = activePriceParam ? activePriceParam.split(',') : [];

  const activeAvailParam = (urlParams.get('availability') || searchParams?.availability || '') as string;
  const activeAvailabilities = activeAvailParam ? activeAvailParam.split(',') : [];

  const activeBrandParam = (urlParams.get('brand') || searchParams?.brand || '') as string;
  const activeBrands = activeBrandParam ? activeBrandParam.split(',') : [];

  const activeSort = (urlParams.get('sort') || sort || 'best') as string;
  const searchQuery = (urlParams.get('q') || searchParams?.q || '') as string;

  // Filter calculation
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  // Derive unique brands from current dataset
  const brandCounts = products.reduce((acc, p) => {
    const b = p.brand || 'Others';
    acc[b] = (acc[b] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const availableBrands = Object.keys(brandCounts).sort((a, b) => brandCounts[b] - brandCounts[a]);

  // Apply filters in-memory for catalog view
  let filtered = [...products];

  if (theme === 'deals') {
    filtered = filtered.filter((p) => p.originalPrice && p.originalPrice > p.price);
  } else if (theme === 'new') {
    filtered = filtered.filter((p) => p.created_at && new Date(p.created_at).getTime() > thirtyDaysAgo);
  } else if (theme === 'bestsellers') {
    filtered = filtered.filter((p) => p.stock > 10);
  }

  if (activeAvailabilities.length > 0) {
    filtered = filtered.filter((p) => {
      if (activeAvailabilities.includes('in_stock') && p.stock > 5) return true;
      if (activeAvailabilities.includes('low_stock') && p.stock > 0 && p.stock <= 5) return true;
      if (activeAvailabilities.includes('out_of_stock') && p.stock === 0) return true;
      return false;
    });
  }

  if (activePrices.length > 0) {
    const parsedRanges = activePrices.map((r) => {
      const [min, max] = r.split('-').map(Number);
      return { min, max };
    });
    filtered = filtered.filter((p) => parsedRanges.some((r) => p.price >= r.min && p.price <= r.max));
  }

  if (activeBrands.length > 0) {
    const normalizedSelected = activeBrands.map(normalizeBrand);
    filtered = filtered.filter((p) => normalizedSelected.includes(normalizeBrand(p.brand)));
  }

  // Sorting
  if (activeSort === 'price_asc') filtered.sort((a, b) => a.price - b.price);
  else if (activeSort === 'price_desc') filtered.sort((a, b) => b.price - a.price);
  else if (activeSort === 'newest')
    filtered.sort((a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime());

  // Count active filters
  const totalActiveFilterCount =
    activePrices.length + activeAvailabilities.length + activeBrands.length + (activeSort !== 'best' ? 1 : 0);

  // Helper to push URL query updates
  const updateQueryParam = (key: string, values: string[]) => {
    const params = new URLSearchParams(urlParams.toString());
    if (values.length > 0) {
      params.set(key, values.join(','));
    } else {
      params.delete(key);
    }
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  const togglePriceFilter = (val: string) => {
    const updated = activePrices.includes(val) ? activePrices.filter((v) => v !== val) : [...activePrices, val];
    updateQueryParam('price', updated);
  };

  const toggleAvailFilter = (val: string) => {
    const updated = activeAvailabilities.includes(val)
      ? activeAvailabilities.filter((v) => v !== val)
      : [...activeAvailabilities, val];
    updateQueryParam('availability', updated);
  };

  const toggleBrandFilter = (val: string) => {
    const updated = activeBrands.includes(val) ? activeBrands.filter((v) => v !== val) : [...activeBrands, val];
    updateQueryParam('brand', updated);
  };

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(urlParams.toString());
    if (newSort === 'best') params.delete('sort');
    else params.set('sort', newSort);
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams(urlParams.toString());
    params.delete('price');
    params.delete('availability');
    params.delete('brand');
    params.delete('sort');
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  // Close mobile bottom sheet on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileFilterOpen(false);
    };
    if (isMobileFilterOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileFilterOpen]);

  const getQtyInCart = (productId: string) => {
    const item = cart.find((c) => c.id === productId);
    return item?.qty || 0;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Top Toolbar */}
      <div className="bg-warm-surface border border-warm-border/60 rounded-[20px] p-4 shadow-warm-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Results summary & query tags */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-warm-muted">
            <Link href="/" className="hover:text-warm-fg transition-colors">Home</Link>
            <span>/</span>
            <Link href="/category" className="hover:text-warm-fg transition-colors">Shop</Link>
            {categorySlug !== 'all' && (
              <>
                <span>/</span>
                <span className="text-warm-fg font-bold capitalize">{categorySlug.replace(/-/g, ' ')}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-tight text-warm-fg">
              {searchQuery ? `Search results for "${searchQuery}"` : categorySlug === 'all' ? 'All Products' : group?.label || categorySlug}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-warm-bg border border-warm-border/60 text-xs font-extrabold text-warm-fg">
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        {/* Toolbar Controls: Mobile Filter Trigger & Sort Dropdown */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Mobile Filter Sheet Trigger */}
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(true)}
            className="md:hidden flex items-center gap-2 px-3.5 py-2 rounded-full bg-warm-fg text-warm-accent font-extrabold text-xs shadow-warm-sm active:scale-95 transition-all"
          >
            <Funnel weight="fill" size={16} />
            <span>Filters</span>
            {totalActiveFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-warm-accent text-warm-fg flex items-center justify-center text-[10px] font-black">
                {totalActiveFilterCount}
              </span>
            )}
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-warm-bg border border-warm-border/60 rounded-full px-3 py-1.5 text-xs font-bold text-warm-fg">
            <span className="text-warm-muted hidden sm:inline">Sort:</span>
            <select
              value={activeSort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="bg-transparent outline-none font-bold text-xs text-warm-fg cursor-pointer"
              aria-label="Sort products"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {totalActiveFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs font-bold text-warm-muted">Active Filters:</span>
          {activePrices.map((p) => {
            const label = PRICE_OPTIONS.find((opt) => opt.value === p)?.label || p;
            return (
              <button
                key={p}
                onClick={() => togglePriceFilter(p)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-warm-surface border border-warm-border text-warm-fg text-xs font-bold hover:bg-warm-bg transition-colors shadow-warm-sm"
              >
                <span>{label}</span>
                <X weight="bold" size={12} className="text-warm-muted" />
              </button>
            );
          })}
          {activeAvailabilities.map((a) => {
            const label = AVAILABILITY_OPTIONS.find((opt) => opt.value === a)?.label || a;
            return (
              <button
                key={a}
                onClick={() => toggleAvailFilter(a)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-warm-surface border border-warm-border text-warm-fg text-xs font-bold hover:bg-warm-bg transition-colors shadow-warm-sm"
              >
                <span>{label}</span>
                <X weight="bold" size={12} className="text-warm-muted" />
              </button>
            );
          })}
          {activeBrands.map((b) => (
            <button
              key={b}
              onClick={() => toggleBrandFilter(b)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-warm-surface border border-warm-border text-warm-fg text-xs font-bold hover:bg-warm-bg transition-colors shadow-warm-sm"
            >
              <span>Brand: {b}</span>
              <X weight="bold" size={12} className="text-warm-muted" />
            </button>
          ))}
          <button
            onClick={clearAllFilters}
            className="text-xs font-extrabold text-red-500 hover:underline px-2 py-1"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Catalog Main Layout Grid: Left Sticky Sidebar (Desktop) + Right Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Desktop Sticky Sidebar */}
        <aside className="hidden md:block md:col-span-3 sticky top-20 bg-warm-surface border border-warm-border/60 rounded-[24px] p-5 shadow-warm-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-warm-border/40">
            <h3 className="font-extrabold text-sm text-warm-fg flex items-center gap-1.5">
              <Funnel weight="bold" size={16} /> Filters
            </h3>
            {totalActiveFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-[11px] font-bold text-red-500 hover:underline"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Categories Sidebar List */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-warm-muted">Categories</h4>
            <div className="space-y-1">
              <Link
                href="/category"
                className={`flex items-center justify-between py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  categorySlug === 'all'
                    ? 'bg-warm-fg text-warm-accent shadow-sm'
                    : 'text-warm-fg hover:bg-warm-bg'
                }`}
              >
                <span>All Products</span>
              </Link>
              {CATEGORY_GROUPS.map((g) => (
                <Link
                  key={g.slug}
                  href={`/category/${g.slug}`}
                  className={`flex items-center justify-between py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                    categorySlug === g.slug || group?.slug === g.slug || parentGroup?.slug === g.slug
                      ? 'bg-warm-fg text-warm-accent shadow-sm'
                      : 'text-warm-fg hover:bg-warm-bg'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{g.emoji}</span>
                    <span>{g.label}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="space-y-2 pt-2 border-t border-warm-border/40">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-warm-muted">Price Range</h4>
            <div className="space-y-1.5">
              {PRICE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-warm-fg py-1 px-1 rounded-lg hover:bg-warm-bg transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={activePrices.includes(opt.value)}
                    onChange={() => togglePriceFilter(opt.value)}
                    className="w-4 h-4 rounded border-2 border-warm-border text-warm-fg accent-warm-fg focus:ring-1 focus:ring-warm-accent cursor-pointer"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Availability Filter */}
          <div className="space-y-2 pt-2 border-t border-warm-border/40">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-warm-muted">Stock Status</h4>
            <div className="space-y-1.5">
              {AVAILABILITY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-warm-fg py-1 px-1 rounded-lg hover:bg-warm-bg transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={activeAvailabilities.includes(opt.value)}
                    onChange={() => toggleAvailFilter(opt.value)}
                    className="w-4 h-4 rounded border-2 border-warm-border text-warm-fg accent-warm-fg focus:ring-1 focus:ring-warm-accent cursor-pointer"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Brand Filter (conditional) */}
          {availableBrands.length > 1 && (
            <div className="space-y-2 pt-2 border-t border-warm-border/40">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-warm-muted">Brands</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-hide">
                {availableBrands.map((b) => (
                  <label
                    key={b}
                    className="flex items-center justify-between cursor-pointer text-xs font-semibold text-warm-fg py-1 px-1 rounded-lg hover:bg-warm-bg transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={activeBrands.includes(b)}
                        onChange={() => toggleBrandFilter(b)}
                        className="w-4 h-4 rounded border-2 border-warm-border text-warm-fg accent-warm-fg focus:ring-1 focus:ring-warm-accent cursor-pointer"
                      />
                      <span>{b}</span>
                    </div>
                    <span className="text-[10px] text-warm-muted font-bold">({brandCounts[b]})</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Products Grid Area */}
        <main className="md:col-span-9 space-y-4">
          {filtered.length === 0 ? (
            <div className="bg-warm-surface border border-warm-border/60 rounded-[24px] p-12 text-center space-y-3">
              <span className="text-4xl">🔍</span>
              <h3 className="text-lg font-bold text-warm-fg">No products match your filters</h3>
              <p className="text-xs text-warm-muted max-w-sm mx-auto">
                Try clearing some of your price or availability filters to view more products.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-5 py-2.5 rounded-full bg-warm-fg text-warm-accent font-extrabold text-xs hover:bg-warm-fg-strong transition-all shadow-sm"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filtered.map((product, index) => {
                let addBtnRef: HTMLButtonElement | null = null;
                return (
                  <div key={product.id} className="h-full flex flex-col">
                    <ProductCard
                      id={product.id}
                      emoji={product.emoji}
                      name={product.name}
                      price={product.price}
                      originalPrice={product.originalPrice}
                      badge={product.badge}
                      brand={product.brand}
                      unit={product.unit}
                      stock={product.stock}
                      category={product.category}
                      image_url={product.image_url}
                      qtyInCart={getQtyInCart(product.id)}
                      priority={index === 0}
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
          )}
        </main>
      </div>

      {/* Mobile Accessible Filter Bottom Sheet */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in duration-200">
          <div
            className="w-full bg-warm-surface rounded-t-[28px] max-h-[85vh] flex flex-col overflow-hidden border-t border-warm-border shadow-2xl animate-in slide-in-from-bottom duration-300"
            role="dialog"
            aria-modal="true"
            aria-label="Filter products"
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between p-4 border-b border-warm-border/60">
              <div className="flex items-center gap-2">
                <Funnel weight="bold" size={18} />
                <h3 className="text-base font-extrabold text-warm-fg">Filter &amp; Sort</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-8 h-8 rounded-full bg-warm-bg flex items-center justify-center text-warm-fg"
                aria-label="Close filters"
              >
                <X weight="bold" size={18} />
              </button>
            </div>

            {/* Sheet Body (Scrollable) */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              {/* Mobile Price Filter */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-warm-muted">Price Range</h4>
                <div className="grid grid-cols-2 gap-2">
                  {PRICE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => togglePriceFilter(opt.value)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                        activePrices.includes(opt.value)
                          ? 'bg-warm-fg text-warm-accent border-warm-fg'
                          : 'bg-warm-bg text-warm-fg border-warm-border/60'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Availability Filter */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-warm-muted">Availability</h4>
                <div className="grid grid-cols-3 gap-2">
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleAvailFilter(opt.value)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                        activeAvailabilities.includes(opt.value)
                          ? 'bg-warm-fg text-warm-accent border-warm-fg'
                          : 'bg-warm-bg text-warm-fg border-warm-border/60'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Brand Filter */}
              {availableBrands.length > 1 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-warm-muted">Brands</h4>
                  <div className="flex flex-wrap gap-2">
                    {availableBrands.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => toggleBrandFilter(b)}
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                          activeBrands.includes(b)
                            ? 'bg-warm-fg text-warm-accent border-warm-fg'
                            : 'bg-warm-bg text-warm-fg border-warm-border/60'
                        }`}
                      >
                        {b} ({brandCounts[b]})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sheet Footer */}
            <div className="p-4 border-t border-warm-border/60 bg-warm-surface flex items-center gap-3">
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex-1 py-3 rounded-full bg-warm-bg text-warm-fg text-xs font-black uppercase tracking-wider hover:bg-warm-border/40 transition-colors"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-3 rounded-full bg-warm-fg text-warm-accent text-xs font-black uppercase tracking-wider hover:bg-warm-fg-strong transition-colors shadow-warm-sm"
              >
                Apply ({filtered.length})
              </button>
            </div>
          </div>
        </div>
      )}

      <CartFlyAnimation items={flyItems} onComplete={handleFlyComplete} />
    </div>
  );
}
