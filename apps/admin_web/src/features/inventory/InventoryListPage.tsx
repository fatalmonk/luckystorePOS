import type { InventoryItem } from '@/types/inventory';
import { useState, useMemo, useRef, useEffect, useDeferredValue, useCallback, lazy, Suspense } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { EmptyState, ErrorState } from '../../components/PageState';
import { History, Package, AlertTriangle, TrendingDown, Wallet, Plus } from 'lucide-react';
import { useNotify } from '../../components/NotificationContext';
import { Link } from 'react-router-dom';
import { useDebounce } from '@/hooks';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { CategoryThumbnailGrid } from '../products/CategoryThumbnailGrid';
import { SkeletonBlock } from '../../components/Skeleton';
import { AnimatedMetric } from '../../components/data-display/AnimatedMetric';
import { InventoryListTable } from '../../components/inventory/InventoryListTable';
import { BulkEditBar } from '../../components/inventory/BulkEditBar';
import { useInventoryBulkActions, useInventoryKeyboardShortcuts, useInventoryEditing } from '@/hooks';
import { AnalyticsWidgets } from '../../components/inventory/AnalyticsWidgets';
import { InventoryFilterToolbar } from '../../components/inventory/InventoryFilterToolbar';

// Lazy-loaded modals and drawers to minimize initial bundle size and optimize FCP/LCP
const ProductDetailDrawer = lazy(() => import('../products/ProductDetailDrawer').then(m => ({ default: m.ProductDetailDrawer })));
const ProductUpdateDrawer = lazy(() => import('./ProductUpdateDrawer').then(m => ({ default: m.ProductUpdateDrawer })));
const ProductAddModal = lazy(() => import('./AddProductModal').then(m => ({ default: m.ProductAddModal })));
const BulkPriceModal = lazy(() => import('../../components/inventory/BulkPriceModal').then(m => ({ default: m.BulkPriceModal })));
const BulkStockModal = lazy(() => import('../../components/inventory/BulkStockModal').then(m => ({ default: m.BulkStockModal })));
const BarcodeScannerModal = lazy(() => import('../../components/inventory/BarcodeScannerModal').then(m => ({ default: m.BarcodeScannerModal })));

export function InventoryListPage() {
  const { storeId, tenantId } = useAuth();
  const { notify } = useNotify();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(null);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  
  // Advanced Sorting
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'stock-asc' | 'stock-desc' | 'margin-asc' | 'margin-desc' | 'value-asc' | 'value-desc'>('name-asc');

  // Collapsible widgets state - default collapsed to defer secondary queries and save LCP/network payload
  const [showWidgets, setShowWidgets] = useState(() => {
    const saved = localStorage.getItem('inventory-widgets-visible');
    return saved !== null ? saved === 'true' : false;
  });

  const toggleWidgets = () => {
    const newValue = !showWidgets;
    setShowWidgets(newValue);
    localStorage.setItem('inventory-widgets-visible', String(newValue));
  };

  // View mode state: explicit user preference persisted in localStorage
  const [userViewMode, setUserViewMode] = useState<'card' | 'table' | null>(() => {
    const saved = localStorage.getItem('inventory-view-mode');
    if (saved === 'card' || saved === 'table') return saved;
    return null;
  });

  const handleViewChange = useCallback((newView: 'card' | 'table') => {
    setUserViewMode(newView);
    localStorage.setItem('inventory-view-mode', newView);
  }, []);

  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low' | 'out'>('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Deferred search to avoid blocking render thread
  const deferredSearch = useDeferredValue(debouncedSearch);

  const hasActiveFilters = deferredSearch.trim() !== '' || selectedCategoryId !== null || stockFilter !== 'all' || minPrice !== '' || maxPrice !== '';

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategoryId(null);
    setStockFilter('all');
    setMinPrice('');
    setMaxPrice('');
  };
  
  // Modal Open States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
  const [isBulkStockModalOpen, setIsBulkStockModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  const { data: inventory, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory', storeId],
    queryFn: () => api.inventory.list(storeId!),
    enabled: !!storeId,
  });

  const {
    selectedIds,
    setSelectedIds,
    bulkStockMutation,
    bulkPriceMutation,
    handleExportSelected,
    toggleSelectAll,
    toggleSelect,
  } = useInventoryBulkActions(storeId!, tenantId, inventory);

  // Stable callbacks — prevent memoized card re-renders on every parent render
  const handleViewProduct = useCallback((item: InventoryItem) => setViewingProductId(item.id), []);
  const handleEditProduct = useCallback((item: InventoryItem) => setEditingProduct(item), []);

  // Inline save handler from hook
  const { handleInlineSave } = useInventoryEditing(storeId);

  const handleDeleteProduct = async (item: InventoryItem) => {
    if (!window.confirm(`Are you sure you want to delete ${item.name}?`)) return;
    try {
      await api.inventory.deleteProduct(storeId, item.id);
      refetch();
    } catch (err) {
      console.error('Failed to delete product', err);
      alert('Failed to delete product');
    }
  };

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const enrichedCategories = useMemo(() => {
    return categories?.map((c: any) => ({
      id: c.id,
      name: c.name || c.category || '',
      parent_id: c.parent_id || null,
      itemCount: inventory?.filter((p: InventoryItem) => p.category_id === c.id).length ?? 0,
      imageUrl: c.image_url || undefined,
      color: c.color || undefined,
      icon: c.icon || undefined,
    })) ?? [];
  }, [categories, inventory]);

  // Derived view mode: explicit user preference if saved, otherwise default to 'table' for categories with >20 items, 'card' otherwise
  const viewMode: 'card' | 'table' = useMemo(() => {
    if (userViewMode !== null) return userViewMode;
    const count = selectedCategoryId
      ? (inventory?.filter(
          (p: InventoryItem) =>
            p.category_id === selectedCategoryId ||
            categories?.some((c: any) => c.id === p.category_id && c.parent_id === selectedCategoryId)
        ).length ?? 0)
      : (inventory?.length ?? 0);
    return count > 20 ? 'table' : 'card';
  }, [userViewMode, selectedCategoryId, inventory, categories]);

  const filteredItems = useMemo(() => {
    const filtered = inventory?.filter((p: InventoryItem) => {
      const matchesSearch =
        p.name.toLowerCase().includes(deferredSearch.toLowerCase()) ||
        p.sku?.toLowerCase().includes(deferredSearch.toLowerCase());
      const matchesCategory = selectedCategoryId
        ? (p.category_id === selectedCategoryId ||
           categories?.some((c: any) => c.id === p.category_id && c.parent_id === selectedCategoryId))
        : true;

      // Stock status filter
      let matchesStock = true;
      if (stockFilter === 'out') {
        matchesStock = p.current_qty === 0;
      } else if (stockFilter === 'low') {
        matchesStock = p.current_qty > 0 && p.current_qty <= 5;
      } else if (stockFilter === 'in_stock') {
        matchesStock = p.current_qty > 0;
      }

      // Price range filter
      const min = minPrice !== '' ? parseFloat(minPrice) : NaN;
      const max = maxPrice !== '' ? parseFloat(maxPrice) : NaN;
      const price = p.price || 0;
      let matchesPrice = true;
      if (!isNaN(min)) {
        matchesPrice = matchesPrice && price >= min;
      }
      if (!isNaN(max)) {
        matchesPrice = matchesPrice && price <= max;
      }

      return matchesSearch && matchesCategory && matchesStock && matchesPrice;
    }) ?? [];

    return [...filtered].sort((a, b) => {
      const marginA = a.cost && a.price ? ((a.price - a.cost) / a.price) : 0;
      const marginB = b.cost && b.price ? ((b.price - b.cost) / b.price) : 0;
      const valueA = (a.price || 0) * a.current_qty;
      const valueB = (b.price || 0) * b.current_qty;

      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'stock-asc':
          return a.current_qty - b.current_qty;
        case 'stock-desc':
          return b.current_qty - a.current_qty;
        case 'margin-asc':
          return marginA - marginB;
        case 'margin-desc':
          return marginB - marginA;
        case 'value-asc':
          return valueA - valueB;
        case 'value-desc':
          return valueB - valueA;
        default:
          return 0;
      }
    });
  }, [inventory, categories, deferredSearch, selectedCategoryId, sortBy, stockFilter, minPrice, maxPrice]);

  // Wire inventory keyboard shortcuts (Shift+A/E/G/S/X)
  useInventoryKeyboardShortcuts({
    isListView: viewMode === 'table',
    setIsListView: (val) => handleViewChange(val ? 'table' : 'card'),
    setIsBulkEditMode: (val) => {
      const next = typeof val === 'function' ? val(selectedIds.size > 0) : val;
      if (!next) setSelectedIds(new Set());
      else if (filteredItems.length > 0) toggleSelectAll(filteredItems.map((i) => i.id), true);
    },
    onAddProduct: () => setIsAddModalOpen(true),
    onExport: handleExportSelected,
    onScan: () => setIsBarcodeModalOpen(true),
  });

  const stats = useMemo(() => {
    const all = inventory ?? [];
    const total = all.length;
    const lowStock = all.filter((p: InventoryItem) => p.reorder_status === 'LOW').length;
    const outOfStock = all.filter((p: InventoryItem) => p.reorder_status === 'OUT').length;
    const totalValue = all.reduce((sum: number, p: InventoryItem) => sum + ((p.price || 0) * p.current_qty), 0);
    const potentialGP = all.reduce((sum: number, p: InventoryItem) => {
      const price = p.price || 0;
      const cost = p.cost || 0;
      if (price <= 0 || cost >= price) return sum;
      return sum + (price - cost) * p.current_qty;
    }, 0);
    return { total, lowStock, outOfStock, totalValue, potentialGP };
  }, [inventory]);

  // Analytics queries - deferred when widgets are collapsed
  const { data: topSellingItems, isLoading: topSellingLoading } = useQuery({
    queryKey: ['inventory-analytics-top-selling', storeId],
    queryFn: () => api.inventory.getTopSellingItems(storeId!, 30, 5),
    enabled: !!storeId && showWidgets,
  });

  const { data: slowMovingItems, isLoading: slowMovingLoading } = useQuery({
    queryKey: ['inventory-analytics-slow-moving', storeId],
    queryFn: () => api.inventory.getSlowMovingItems(storeId!, 30, 5),
    enabled: !!storeId && showWidgets,
  });

  const { data: dailyTrend, isLoading: dailyTrendLoading } = useQuery({
    queryKey: ['inventory-analytics-daily-trend', storeId],
    queryFn: () => api.inventory.getDailyMovementTrend(storeId!, 14),
    enabled: !!storeId && showWidgets,
  });

  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState(140);

  useEffect(() => {
    if (!toolbarRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setToolbarHeight(entry.target.clientHeight);
      }
    });
    resizeObserver.observe(toolbarRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.classList.add('inventory-page-scroll');
    }
    return () => {
      if (mainContent) {
        mainContent.classList.remove('inventory-page-scroll');
      }
    };
  }, []);



  if (error) {
    return (
      <div className="inventory-container pt-6">
        <PageHeader
          title="Stock Inventory"
          subtitle="Monitor and adjust stock levels."
        />
        <Card className="mt-6">
          <ErrorState message="Failed to load inventory." onRetry={() => refetch()} />
        </Card>
      </div>
    );
  }

  return (
    <div className="inventory-container flex flex-col pt-6">
        {/* Cinematic Page Header (gpt-taste) */}
      <div className="relative w-full max-w-6xl mx-auto py-16 md:py-24 flex flex-col items-center justify-center text-center">
        {/* Ambient background wash */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.05)_0%,rgba(0,0,0,0)_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(255,243,77,0.05)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />
        
        <h1 
          className="relative z-10 font-display font-bold text-warm-fg leading-tight tracking-tight mb-8"
          style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', maxWidth: '1000px' }}
        >
          Master your inventory flow <span className="inline-block w-24 h-[1em] rounded-full align-middle bg-gradient-to-r from-amber-400 to-yellow-500 mx-2 overflow-hidden shadow-lg opacity-90 border border-warm-border"></span> with precision.
        </h1>
        
        <div className="relative z-10 flex flex-wrap justify-center gap-4 mb-12">
           <button
             className="px-8 py-4 bg-warm-accent text-black font-bold rounded-full shadow-xl hover:scale-105 transition-transform duration-500 ease-out flex items-center gap-2"
             onClick={() => setIsAddModalOpen(true)}
           >
             <Plus size={20} />
             Add New Product
           </button>
           <Link to="/inventory/history" className="px-8 py-4 bg-warm-surface border border-warm-border text-warm-fg font-bold rounded-full shadow-lg hover:scale-105 transition-transform duration-500 ease-out flex items-center gap-2">
             <History size={20} />
             View Audit Log
           </Link>
        </div>

        {/* Ambient stats bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold max-w-4xl mx-auto min-h-[42px]">
            <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-warm-surface/80 backdrop-blur-md border border-warm-border/50 shadow-sm">
              <Package size={14} className="text-warm-fg" />
              <AnimatedMetric value={stats.total} /> Total SKUs
            </span>
            <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-warm-surface/80 backdrop-blur-md border border-warm-border/50 shadow-sm">
              <AlertTriangle size={14} className="text-warm-warning" />
              <AnimatedMetric value={stats.lowStock} /> Low Stock
            </span>
            <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-warm-surface/80 backdrop-blur-md border border-warm-border/50 shadow-sm">
              <TrendingDown size={14} className="text-warm-danger" />
              <AnimatedMetric value={stats.outOfStock} /> Stockouts
            </span>
            <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-warm-surface/80 backdrop-blur-md border border-warm-border/50 shadow-sm">
              <Wallet size={14} className="text-warm-success" />
              <AnimatedMetric value={stats.totalValue} format prefix="৳" /> Value
            </span>
        </div>
      </div>

      {/* Collapsible Analytics Widgets */}
      <div className="-mx-6 px-6 mb-1">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xs font-semibold text-warm-muted uppercase tracking-wider m-0 p-0">Analytics</h2>
          <button
            onClick={toggleWidgets}
            className="flex items-center gap-1 text-xs text-warm-muted hover:text-warm-fg transition-colors"
          >
            {showWidgets ? 'Hide' : 'Show'}
            {showWidgets ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
        {showWidgets && (
          <AnalyticsWidgets
            topSellingItems={topSellingItems}
            slowMovingItems={slowMovingItems}
            dailyTrend={dailyTrend}
            topSellingLoading={topSellingLoading}
            slowMovingLoading={slowMovingLoading}
            dailyTrendLoading={dailyTrendLoading}
          />
        )}
      </div>

      <h2 className="sr-only">Product Inventory Catalog</h2>

      {/* Sticky Single Toolbar */}
      <div
        ref={toolbarRef}
        className="sticky -mx-6 px-6 py-3 top-0 z-40"
        style={{ backgroundColor: 'var(--color-background-default)' }}
      >
        <div className="flex flex-col gap-3 max-w-full">
          {!categories ? (
            <div className="h-24 animate-pulse bg-background-subtle rounded-lg" />
          ) : (
            <CategoryThumbnailGrid
              categories={enrichedCategories}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
          )}
          
          <InventoryFilterToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortBy={sortBy}
            onSortChange={(sort: string) => setSortBy(sort as 'name-asc' | 'name-desc' | 'stock-asc' | 'stock-desc' | 'margin-asc' | 'margin-desc' | 'value-asc' | 'value-desc')}
            onOpenBarcode={() => setIsBarcodeModalOpen(true)}
            view={viewMode}
            onViewChange={handleViewChange}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="p-4 space-y-4 bg-surface border border-border-default rounded-xl">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <SkeletonBlock className="w-[28%] h-6" />
                <SkeletonBlock className="w-[18%] h-6" />
                <SkeletonBlock className="w-[12%] h-6" />
                <SkeletonBlock className="w-[12%] h-6" />
                <SkeletonBlock className="w-[12%] h-6" />
                <SkeletonBlock className="w-[18%] h-6 ml-auto" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              icon={<Package size={48} />}
              title={hasActiveFilters ? 'No matching products' : 'No inventory items yet'}
              description={hasActiveFilters
                ? 'Try changing or clearing your search and filters.'
                : 'Add a product to start tracking stock levels.'}
              action={
                <button
                  type="button"
                  className="button-primary"
                  onClick={hasActiveFilters ? clearFilters : () => setIsAddModalOpen(true)}
                >
                  {hasActiveFilters ? 'Clear filters' : 'Add new product'}
                </button>
              }
            />
          </Card>
        ) : (
          <InventoryListTable
            items={filteredItems}
            storeId={storeId}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectAll={toggleSelectAll}
            onUpdateStock={handleViewProduct}
            onViewHistory={handleViewProduct}
            onEditProduct={handleEditProduct}
            onDelete={handleDeleteProduct}
            onInlineSave={handleInlineSave}
            view={viewMode}
            scrollElement={(document.querySelector('.main-content') as HTMLDivElement) || null}
            toolbarHeight={toolbarHeight}
          />
        )}
      </div>

      <Suspense fallback={null}>
        {isAddModalOpen && (
          <ProductAddModal
            isOpen={isAddModalOpen}
            categories={categories}
            onClose={() => setIsAddModalOpen(false)}
          />
        )}

        {editingProduct && (
          <ProductUpdateDrawer
            product={editingProduct as any}
            storeId={storeId}
            onClose={() => setEditingProduct(null)}
          />
        )}

        {viewingProductId && (
          <ProductDetailDrawer
            productId={viewingProductId}
            onClose={() => setViewingProductId(null)}
            onEdit={(p) => {
              setViewingProductId(null);
              const fullItem = inventory?.find(i => i.id === p.id);
              setEditingProduct(fullItem ? { ...p, ...fullItem } : (p as unknown as InventoryItem));
            }}
          />
        )}

        {isBulkPriceModalOpen && (
          <BulkPriceModal
            isOpen={isBulkPriceModalOpen}
            onClose={() => setIsBulkPriceModalOpen(false)}
            onSubmit={(data) => {
              bulkPriceMutation.mutate(data, { onSuccess: () => setIsBulkPriceModalOpen(false) });
            }}
            selectedCount={selectedIds.size}
          />
        )}

        {isBulkStockModalOpen && (
          <BulkStockModal
            isOpen={isBulkStockModalOpen}
            onClose={() => setIsBulkStockModalOpen(false)}
            onSubmit={(data) => {
              bulkStockMutation.mutate(data, { onSuccess: () => setIsBulkStockModalOpen(false) });
            }}
            selectedCount={selectedIds.size}
          />
        )}

        {isBarcodeModalOpen && (
          <BarcodeScannerModal
            isOpen={isBarcodeModalOpen}
            onClose={() => setIsBarcodeModalOpen(false)}
            onScan={(barcode) => {
              const found = inventory?.find((p: InventoryItem) => p.sku === barcode || (p as any).barcode === barcode);
              if (found) {
                setSearchTerm(barcode);
                setViewingProductId(found.id);
                setHighlightedProductId(found.id);
              } else {
                notify(`Product with barcode ${barcode} not found`, 'error');
              }
            }}
          />
        )}
      </Suspense>

      {selectedIds.size > 0 && (
        <BulkEditBar
          selectedCount={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onUpdatePrices={() => setIsBulkPriceModalOpen(true)}
          onUpdateStock={() => setIsBulkStockModalOpen(true)}
          onExport={handleExportSelected}
        />
      )}
    </div>
  );
}
