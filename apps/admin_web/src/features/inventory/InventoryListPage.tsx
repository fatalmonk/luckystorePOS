import type { InventoryItem } from '@/types/inventory';
import { useState, useMemo, useRef, useEffect, useDeferredValue, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { ErrorState } from '../../components/PageState';
import { Search, RefreshCw, History, Package, AlertTriangle, TrendingDown, TrendingUp, Wallet, LayoutGrid, List as ListIcon, Download, ScanLine, ArrowUpDown, Plus, Filter, X } from 'lucide-react';
import { useNotify } from '../../components/NotificationContext';
import { downloadCSV } from '../../lib/format';
import { ProductDetailDrawer } from '../products/ProductDetailDrawer';
import { ProductUpdateDrawer } from './ProductUpdateDrawer';
import { ProductAddModal } from './AddProductModal';
import { Link } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';
import { useInventoryEditing } from '../../hooks/useInventoryEditing';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { CategoryThumbnailGrid } from '../products/CategoryThumbnailGrid';
import { ProductCardSkeletonGrid, SkeletonBlock } from '../../components/Skeleton';
import { AnimatedMetric } from '../../components/data-display/AnimatedMetric';
import { InventoryListTable } from '../../components/inventory/InventoryListTable';
import { InventoryProductCard } from './InventoryProductCard';
import { BulkEditBar } from '../../components/inventory/BulkEditBar';
import { BulkPriceModal } from '../../components/inventory/BulkPriceModal';
import { BulkStockModal } from '../../components/inventory/BulkStockModal';
import { BarcodeScannerModal } from '../../components/inventory/BarcodeScannerModal';
import { useInventoryBulkActions } from '../../hooks/useInventoryBulkActions';
import { AnalyticsWidgets } from '../../components/inventory/AnalyticsWidgets';
import { InventoryFilterToolbar } from '../../components/inventory/InventoryFilterToolbar';

export function InventoryListPage() {
  const { storeId, tenantId } = useAuth();
  const { notify } = useNotify();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(null);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => window.innerWidth >= 1024 ? 'list' : 'grid');
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  
  // Advanced Sorting
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'stock-asc' | 'stock-desc' | 'margin-asc' | 'margin-desc' | 'value-asc' | 'value-desc'>('name-asc');

  // Collapsible widgets state
  const [showWidgets, setShowWidgets] = useState(() => {
    const saved = localStorage.getItem('inventory-widgets-visible');
    return saved !== null ? saved === 'true' : true; // Default to visible
  });

  const toggleWidgets = () => {
    const newValue = !showWidgets;
    setShowWidgets(newValue);
    localStorage.setItem('inventory-widgets-visible', String(newValue));
  };

  const [showFilters, setShowFilters] = useState(false);
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low' | 'out'>('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Whether any filter (beyond 'all') is active — used to show Clear Filters button
  const hasActiveFilters = stockFilter !== 'all' || minPrice !== '' || maxPrice !== '';

  // Deferred search to avoid blocking render thread
  const deferredSearch = useDeferredValue(debouncedSearch);
  
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

  const [columnsCount, setColumnsCount] = useState(() => {
    const w = window.innerWidth;
    if (w >= 1536) return 5;
    if (w >= 1280) return 4;
    if (w >= 1024) return 3;
    if (w >= 640) return 2;
    return 1;
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w >= 1536) setColumnsCount(5);
      else if (w >= 1280) setColumnsCount(4);
      else if (w >= 1024) setColumnsCount(3);
      else if (w >= 640) setColumnsCount(2);
      else setColumnsCount(1);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Preload first visible images after inventory loads
  useEffect(() => {
    if (!inventory?.length) return;
    const preloadCount = viewMode === 'grid' ? Math.min(columnsCount * 2, 8) : 10;
    inventory.slice(0, preloadCount).forEach((item, i) => {
      if (!item.image_url) return;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = item.image_url;
      (link as any).fetchPriority = i < 4 ? 'high' : 'low';
      document.head.appendChild(link);
    });
    return () => {
      document.querySelectorAll('link[rel="preload"][as="image"]').forEach(el => el.remove());
    };
  }, [inventory, viewMode, columnsCount]);

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
      itemCount: inventory?.filter((p: InventoryItem) => p.category_id === c.id).length ?? 0,
      imageUrl: c.image_url || undefined,
      color: c.color || undefined,
      icon: c.icon || undefined,
    })) ?? [];
  }, [categories, inventory]);

  const filteredItems = useMemo(() => {
    const filtered = inventory?.filter((p: InventoryItem) => {
      const matchesSearch =
        p.name.toLowerCase().includes(deferredSearch.toLowerCase()) ||
        p.sku?.toLowerCase().includes(deferredSearch.toLowerCase());
      const matchesCategory = selectedCategoryId ? p.category_id === selectedCategoryId : true;

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
  }, [inventory, deferredSearch, selectedCategoryId, sortBy, stockFilter, minPrice, maxPrice]);

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

  // Analytics queries
  const { data: topSellingItems, isLoading: topSellingLoading } = useQuery({
    queryKey: ['inventory-analytics-top-selling', storeId],
    queryFn: () => api.inventory.getTopSellingItems(storeId!, 30, 5),
    enabled: !!storeId,
  });

  const { data: slowMovingItems, isLoading: slowMovingLoading } = useQuery({
    queryKey: ['inventory-analytics-slow-moving', storeId],
    queryFn: () => api.inventory.getSlowMovingItems(storeId!, 30, 5),
    enabled: !!storeId,
  });

  const { data: dailyTrend, isLoading: dailyTrendLoading } = useQuery({
    queryKey: ['inventory-analytics-daily-trend', storeId],
    queryFn: () => api.inventory.getDailyMovementTrend(storeId!, 14),
    enabled: !!storeId,
  });

  const gridScrollRef = useRef<HTMLDivElement>(null);

  const chunkedItems = useMemo(() => {
    const chunks: InventoryItem[][] = [];
    for (let i = 0; i < filteredItems.length; i += columnsCount) {
      chunks.push(filteredItems.slice(i, i + columnsCount));
    }
    return chunks;
  }, [filteredItems, columnsCount]);

  const gridVirtualizer = useVirtualizer({
    count: chunkedItems.length,
    getScrollElement: () => gridScrollRef.current,
    estimateSize: () => 340,
    overscan: 1,
  });

  if (error) {
    return (
      <div className="inventory-container">
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
    <div className="inventory-container flex flex-col h-full">
      <PageHeader
        title="Stock Inventory"
        subtitle={
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <span className="flex items-center gap-1 text-text-secondary px-2 py-0.5 rounded-md bg-surface border border-border-subtle shadow-sm">
              <Package size={12} className="text-primary" />
              <AnimatedMetric value={stats.total} /> SKUs
            </span>
            <span className="flex items-center gap-1 text-text-secondary px-2 py-0.5 rounded-md bg-surface border border-border-subtle shadow-sm">
              <AlertTriangle size={12} className="text-warning-dark" />
              <AnimatedMetric value={stats.lowStock} /> Low
            </span>
            <span className="flex items-center gap-1 text-text-secondary px-2 py-0.5 rounded-md bg-surface border border-border-subtle shadow-sm">
              <TrendingDown size={12} className="text-danger" />
              <AnimatedMetric value={stats.outOfStock} /> Out
            </span>
            <span className="flex items-center gap-1 text-text-secondary px-2 py-0.5 rounded-md bg-surface border border-border-subtle shadow-sm">
              <Wallet size={12} className="text-success-dark" />
              <AnimatedMetric value={stats.totalValue} format prefix="৳" /> Value
            </span>
            <span className="flex items-center gap-1 text-text-secondary px-2 py-0.5 rounded-md bg-surface border border-border-subtle shadow-sm">
              <TrendingUp size={12} className="text-success-dark" />
              <AnimatedMetric value={stats.potentialGP} format prefix="৳" /> GP
            </span>
          </div>
        }
        actions={
          <div className="flex gap-2">
            <Button
              variant="primary"
              icon={<Plus size={18} />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Add Product
            </Button>
            <Button
              variant="secondary"
              icon={<Download size={18} />}
              onClick={() => {
                const sanitizeCSVCell = (value: string) => (/^[=+\-@]/.test(value) ? `'${value}` : value);
                const rows = (inventory ?? []).map((item: InventoryItem) => ({
                  name: sanitizeCSVCell(item.name),
                  sku: sanitizeCSVCell(item.sku || ''),
                  currentStock: item.current_qty,
                  status: item.reorder_status,
                  price: item.price || 0,
                  value: (item.price || 0) * item.current_qty,
                  lastUpdated: item.last_updated || '',
                }));
                downloadCSV(rows, `inventory-${new Date().toISOString().split('T')[0]}.csv`);
              }}
              className="hidden sm:flex"
            >
              Export
            </Button>
            <Link to="/inventory/history">
              <Button variant="secondary" icon={<History size={18} />}>
                <span className="hidden sm:inline">History</span>
              </Button>
            </Link>
            <Button variant="secondary" onClick={() => refetch()} loading={isLoading}>
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </Button>
          </div>
        }
        className="mb-2"
      />

      {/* Collapsible Analytics Widgets */}
      <div className="-mx-6 px-6 mb-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-warm-muted uppercase tracking-wider">Analytics</span>
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

      {/* Sticky Single Toolbar */}
      <div
        className="sticky -mx-6 px-6 py-3 top-0 z-20 border-b border-border-default"
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
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            hasActiveFilters={hasActiveFilters}
            stockFilter={stockFilter}
            onStockFilterChange={(filter: string) => setStockFilter(filter as 'all' | 'in_stock' | 'low' | 'out')}
            minPrice={minPrice}
            onMinPriceChange={setMinPrice}
            maxPrice={maxPrice}
            onMaxPriceChange={setMaxPrice}
            onClearFilters={() => {
              setStockFilter('all');
              setMinPrice('');
              setMaxPrice('');
            }}
            onOpenBarcode={() => setIsBarcodeModalOpen(true)}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          viewMode === 'grid' ? (
            <ProductCardSkeletonGrid count={10} />
          ) : (
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
          )
        ) : filteredItems.length === 0 ? (
          <Card className="p-8 text-center text-text-muted">
            No inventory items found. Add products to start tracking stock levels.
          </Card>
        ) : viewMode === 'grid' ? (
          <div
            ref={gridScrollRef}
            className="overflow-y-auto pr-2 scrollbar-thin"
            style={{ height: 'calc(100vh - 350px)' }}
          >
            <div
              style={{
                height: `${gridVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {gridVirtualizer.getVirtualItems().map((virtualRow) => {
                const rowItems = chunkedItems[virtualRow.index];
                if (!rowItems) return null;
                return (
                  <div
                    key={virtualRow.index}
                    className="absolute top-0 left-0 w-full grid gap-4"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      gridTemplateColumns: `repeat(${columnsCount}, minmax(0, 1fr))`,
                      paddingBottom: '16px',
                    }}
                  >
                    {rowItems.map((item: any) => (
                      <InventoryProductCard
                        key={item.id}
                        item={item}
                        isHighlighted={highlightedProductId === item.id}
                        isSelected={selectedIds.has(item.id)}
                        onToggleSelect={toggleSelect}
                        onUpdateStock={handleViewProduct}
                        tenantId={tenantId}
                        priority={virtualRow.index === 0}
                        onInlineSave={handleInlineSave}
                        storeId={storeId}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
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
          />
        )}
      </div>

      <ProductAddModal
        isOpen={isAddModalOpen}
        categories={categories}
        onClose={() => setIsAddModalOpen(false)}
      />

      <ProductUpdateDrawer
        product={editingProduct as any}
        storeId={storeId}
        onClose={() => setEditingProduct(null)}
      />

      <ProductDetailDrawer
        productId={viewingProductId}
        onClose={() => setViewingProductId(null)}
        onEdit={(p) => {
          setViewingProductId(null);
          setEditingProduct(p as unknown as InventoryItem);
        }}
      />

      <BulkPriceModal
        isOpen={isBulkPriceModalOpen}
        onClose={() => setIsBulkPriceModalOpen(false)}
        onSubmit={(data) => {
          bulkPriceMutation.mutate(data, { onSuccess: () => setIsBulkPriceModalOpen(false) });
        }}
        selectedCount={selectedIds.size}
      />

      <BulkStockModal
        isOpen={isBulkStockModalOpen}
        onClose={() => setIsBulkStockModalOpen(false)}
        onSubmit={(data) => {
          bulkStockMutation.mutate(data, { onSuccess: () => setIsBulkStockModalOpen(false) });
        }}
        selectedCount={selectedIds.size}
      />

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

      {selectedIds.size > 0 && (
        <BulkEditBar
          selectedCount={selectedIds.size}
          totalCount={inventory?.length || 0}
          onClear={() => setSelectedIds(new Set())}
          onUpdatePrices={() => setIsBulkPriceModalOpen(true)}
          onUpdateStock={() => setIsBulkStockModalOpen(true)}
          onExport={handleExportSelected}
        />
      )}
    </div>
  );
}