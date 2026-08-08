'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Funnel, X, Check, ArrowDown, ArrowUp, Sparkle, Tag, MagnifyingGlass } from '@phosphor-icons/react';
import { ProductCard } from './ProductCard';
import { useCartActions } from '../hooks/useCartActions';
import { CATEGORY_GROUPS, normalizeCategorySlug } from '../lib/types';
import type { Product, CategoryGroup } from '../lib/types';
import { getCategoryIcon } from './icons/CategoryIcons';

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

const BRAND_ALIASES: Record<string, string> = {
  'cerelace': 'Cerelac',
  'cerelac': 'Cerelac',
  'aril': 'Aril',
  '鈦aril': 'Aril',
};

const NON_BRAND_WORDS = new Set(['chicken', 'chocolate', 'ata', 'basmati', 'others']);

function cleanBrandName(raw?: string | null): string {
  if (!raw) return 'Others';
  let clean = raw.replace(/[\uFEFF\u0000-\u001F\u007F-\u009F]/g, '').trim();
  clean = clean.replace(/^[^\w\s\u0980-\u09FF]+/, '').trim();
  if (!clean) return 'Others';

  const lower = clean.toLowerCase();
  if (BRAND_ALIASES[lower]) return BRAND_ALIASES[lower];
  if (NON_BRAND_WORDS.has(lower)) return 'Others';

  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function normalizeBrand(b?: string | null): string {
  return cleanBrandName(b).toLowerCase();
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

  const { cart, flyItems, handleAddToCart, handleUpdateQty, handleFlyComplete } = useCartActions();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Extract active query params
  const activePriceParam = (urlParams.get('price') || searchParams?.price || '') as string;
  const activePrices = useMemo(
    () => (activePriceParam ? activePriceParam.split(',') : []),
    [activePriceParam],
  );

  const activeAvailParam = (urlParams.get('availability') || searchParams?.availability || '') as string;
  const activeAvailabilities = useMemo(
    () => (activeAvailParam ? activeAvailParam.split(',') : []),
    [activeAvailParam],
  );

  const activeBrandParam = (urlParams.get('brand') || searchParams?.brand || '') as string;
  const activeBrands = useMemo(
    () => (activeBrandParam ? activeBrandParam.split(',') : []),
    [activeBrandParam],
  );

  const activeSort = (urlParams.get('sort') || sort || 'best') as string;
  const searchQuery = (urlParams.get('q') || searchParams?.q || '') as string;

  // Filter calculation
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  // Derive unique brands from current dataset
  const { brandCounts, availableBrands } = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const b = cleanBrandName(p.brand);
      if (b !== 'Others') {
        counts[b] = (counts[b] || 0) + 1;
      }
    });
    const brands = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return { brandCounts: counts, availableBrands: brands };
  }, [products]);

  // Apply filters in-memory for catalog view
  const filtered = useMemo(() => {
    let result = [...products];
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    if (theme === 'deals') {
      result = result.filter((p) => p.originalPrice && p.originalPrice > p.price);
    } else if (theme === 'new') {
      result = result.filter((p) => p.created_at && new Date(p.created_at).getTime() > thirtyDaysAgo);
    } else if (theme === 'bestsellers') {
      result = result.filter((p) => p.stock > 10);
    }

    if (activeAvailabilities.length > 0) {
      result = result.filter((p) => {
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
      result = result.filter((p) => parsedRanges.some((r) => p.price >= r.min && p.price <= r.max));
    }

    if (activeBrands.length > 0) {
      const normalizedSelected = activeBrands.map(normalizeBrand);
      result = result.filter((p) => normalizedSelected.includes(normalizeBrand(p.brand)));
    }

    // Sorting
    if (activeSort === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (activeSort === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (activeSort === 'newest') {
      result.sort((a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime());
    } else {
      // Best Match: Demote out-of-stock items (stock <= 0) to bottom
      result.sort((a, b) => {
        const aInStock = (a.stock ?? 0) > 0 ? 1 : 0;
        const bInStock = (b.stock ?? 0) > 0 ? 1 : 0;
        return bInStock - aInStock;
      });
    }

    return result;
  }, [products, theme, activeAvailabilities, activePrices, activeBrands, activeSort]);

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

  const modalRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 24;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination when active filters or sort change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activePrices, activeAvailabilities, activeBrands, activeSort, categorySlug]);

  // Focus trapping, body scroll lock, and accessibility for Mobile Filter Sheet
  useEffect(() => {
    if (!isMobileFilterOpen) return;

    document.body.style.overflow = 'hidden';
    const previousActiveElement = document.activeElement as HTMLElement | null;

    if (modalRef.current) {
      const focusables = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length > 0) focusables[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileFilterOpen(false);
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        previousActiveElement.focus();
      }
    };
  }, [isMobileFilterOpen]);

  const getQtyInCart = (productId: string) => {
    const item = cart.find((c) => c.id === productId);
    return item?.qty || 0;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Top Toolbar */}
      <div className="bg-warm-surface border border-warm-border dark:border-transparent rounded-[20px] p-4 shadow-warm-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Results summary & query tags */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-warm-muted flex-wrap">
            <Link href="/" className="hover:text-warm-fg transition-colors py-1 px-1.5 rounded inline-flex items-center min-h-[44px]">Home</Link>
            <span>/</span>
            <Link href="/category" className="hover:text-warm-fg transition-colors py-1 px-1.5 rounded inline-flex items-center min-h-[44px]">Shop</Link>
            {categorySlug !== 'all' && (
              <>
                <span>/</span>
                <span className="text-warm-fg font-bold capitalize py-1 px-1.5 inline-flex items-center min-h-[44px]">{categorySlug.replace(/-/g, ' ')}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {categorySlug !== 'all' ? (
              <h2 className="text-lg font-black tracking-tight text-warm-fg">
                {searchQuery ? `Search results for "${searchQuery}"` : group?.label || categorySlug.replace(/-/g, ' ')}
              </h2>
            ) : (
              <h1 className="text-lg font-black tracking-tight text-warm-fg">
                {searchQuery ? `Search results for "${searchQuery}"` : 'All Products'}
              </h1>
            )}
            <span
              aria-live="polite"
              aria-atomic="true"
              className="px-2.5 py-0.5 rounded-full bg-warm-bg border border-warm-border text-xs font-extrabold text-warm-fg"
            >
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
            aria-expanded={isMobileFilterOpen}
            aria-controls="mobile-filter-drawer"
            className="md:hidden min-h-[44px] flex items-center gap-2 px-3.5 py-2 rounded-full bg-warm-fg text-warm-accent font-extrabold text-xs shadow-warm-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent transition-all"
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
          <div className="flex items-center gap-1.5 bg-warm-bg border border-warm-border/60 rounded-full px-3 py-1.5 min-h-[44px] text-xs font-bold text-warm-fg">
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

      {/* Sub-categories Thumbnail Strip/Grid */}
      {(() => {
        const currentCategory = categories.find((c) => c.slug === categorySlug);
        const targetParentId = (currentCategory as any)?.parent_id || currentCategory?.id;
        const subCats = categories.filter((c) => {
          if (c.slug === group?.slug || c.slug === parentGroup?.slug) return false;
          if (targetParentId && (c as any).parent_id) {
            return (c as any).parent_id === targetParentId;
          }
          const normC = normalizeCategorySlug(c.slug);
          if (group) return group.subCategories.some((sub) => normalizeCategorySlug(sub) === normC);
          if (parentGroup) return parentGroup.subCategories.some((sub) => normalizeCategorySlug(sub) === normC);
          return false;
        });

        if (subCats.length === 0) return null;

        return (
          <div className="bg-warm-surface border border-warm-border dark:border-transparent rounded-[20px] p-4 shadow-warm-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-warm-muted">
                Explore Sub-categories
              </span>
              <span className="text-xs text-warm-muted font-bold">
                {subCats.length} sub-categories
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {subCats.map((sub) => {
                const isActive = categorySlug === sub.slug;
                return (
                  <Link
                    key={sub.id}
                    href={`/category/${sub.slug}`}
                    className={`group relative flex flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent min-h-[90px] ${
                      isActive
                        ? 'border-warm-accent bg-warm-fg text-warm-accent shadow-warm-sm font-black'
                        : 'border-warm-border/70 bg-warm-bg text-warm-fg hover:border-warm-accent hover:bg-warm-surface'
                    }`}
                  >
                    <span className="transition-transform group-hover:scale-110" aria-hidden="true">
                      {getCategoryIcon(sub.slug || sub.name, 28)}
                    </span>
                    <span className={`text-xs font-extrabold leading-tight truncate max-w-full ${isActive ? 'text-warm-accent' : 'text-warm-fg'}`}>
                      {sub.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}

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
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-full bg-warm-surface border border-warm-border text-warm-fg text-xs font-bold hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent transition-colors shadow-warm-sm"
              >
                <span>{label}</span>
                <X weight="bold" size={14} className="text-warm-muted" />
              </button>
            );
          })}
          {activeAvailabilities.map((a) => {
            const label = AVAILABILITY_OPTIONS.find((opt) => opt.value === a)?.label || a;
            return (
              <button
                key={a}
                onClick={() => toggleAvailFilter(a)}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-full bg-warm-surface border border-warm-border text-warm-fg text-xs font-bold hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent transition-colors shadow-warm-sm"
              >
                <span>{label}</span>
                <X weight="bold" size={14} className="text-warm-muted" />
              </button>
            );
          })}
          {activeBrands.map((b) => (
            <button
              key={b}
              onClick={() => toggleBrandFilter(b)}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-full bg-warm-surface border border-warm-border text-warm-fg text-xs font-bold hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent transition-colors shadow-warm-sm"
            >
              <span>Brand: {b}</span>
              <X weight="bold" size={14} className="text-warm-muted" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs font-extrabold text-warm-danger hover:underline px-3 py-2 min-h-[44px] inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent rounded-full"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Catalog Main Layout Grid: Left Sticky Sidebar (Desktop) + Right Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Desktop Sticky Sidebar */}
        <aside className="hidden md:block md:col-span-3 sticky top-[120px] z-20 max-h-[calc(100vh-8.5rem)] overflow-y-auto custom-scrollbar bg-warm-surface border border-warm-border dark:border-transparent rounded-[24px] p-5 shadow-warm-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-warm-border dark:border-transparent">
            <h2 className="font-extrabold text-sm text-warm-fg flex items-center gap-1.5">
              <Funnel weight="bold" size={16} /> Filters
            </h2>
            {totalActiveFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[11px] font-bold text-warm-danger hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-warm-accent rounded"
              >
                Clear All
              </button>
            )}
          </div>



          {/* Brand Filter (conditional) */}
          {availableBrands.length > 1 && (
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-warm-muted">Brands</h3>
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

          {/* Price Range Filter */}
          <div className={`space-y-2 ${availableBrands.length > 1 ? 'pt-2 border-t border-warm-border/40' : ''}`}>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-warm-muted">Price Range</h3>
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
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-warm-muted">Stock Status</h3>
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
        </aside>

        {/* Products Grid Area */}
        <section aria-label="Product catalog" className="md:col-span-9 space-y-6">
          {filtered.length === 0 ? (
            <div className="bg-warm-surface border border-warm-border/60 rounded-[24px] p-12 text-center space-y-3">
              <MagnifyingGlass className="mx-auto text-warm-muted" size={36} weight="bold" aria-hidden="true" />
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
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filtered.slice(0, visibleCount).map((product, index) => (
                  <div key={product.id} className="h-full flex flex-col">
                    <ProductCard
                      id={product.id}
                      emoji={product.emoji}
                      name={product.name}
                      price={product.price}
                      originalPrice={product.originalPrice}
                      brand={product.brand}
                      unit={product.unit}
                      stock={product.stock}
                      category={product.category}
                      image_url={product.image_url}
                      qtyInCart={getQtyInCart(product.id)}
                      priority={index < 4}
                      onAdd={(btnEl) => handleAddToCart(product, btnEl)}
                      onUpdateQty={(delta) => handleUpdateQty(product.id, delta)}
                    />
                  </div>
                ))}
              </div>

              {/* Load More Pagination */}
              {visibleCount < filtered.length && (
                <div className="pt-6 pb-2 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                    className="min-h-[44px] px-8 py-3 rounded-full bg-warm-surface border border-warm-border text-warm-fg font-extrabold text-xs hover:bg-warm-bg hover:border-warm-accent transition-all shadow-warm-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent"
                  >
                    Load More Products ({filtered.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Mobile Accessible Filter Bottom Sheet */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-warm-fg/60 backdrop-blur-sm md:hidden animate-in fade-in duration-200">
          <div
            id="mobile-filter-drawer"
            ref={modalRef}
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
                className="w-11 h-11 rounded-full bg-warm-bg flex items-center justify-center text-warm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent transition-colors"
                aria-label="Close filters"
              >
                <X weight="bold" size={18} />
              </button>
            </div>

            {/* Sheet Body (Scrollable) */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1">
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
                        aria-pressed={activeBrands.includes(b)}
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

              {/* Mobile Price Filter */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-warm-muted">Price Range</h4>
                <div className="grid grid-cols-2 gap-2">
                  {PRICE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => togglePriceFilter(opt.value)}
                      aria-pressed={activePrices.includes(opt.value)}
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
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-warm-muted">Stock Status</h4>
                <div className="grid grid-cols-3 gap-2">
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleAvailFilter(opt.value)}
                      aria-pressed={activeAvailabilities.includes(opt.value)}
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
