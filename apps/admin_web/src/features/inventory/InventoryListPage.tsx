import { useState, useMemo, useRef, useEffect, useDeferredValue, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { ErrorState } from '../../components/PageState';
import { Search, RefreshCw, History, Package, AlertTriangle, TrendingDown, Wallet, LayoutGrid, List as ListIcon, Download, ScanLine, ArrowUpDown, Plus } from 'lucide-react';
import { useNotify } from '../../components/NotificationContext';
import { downloadCSV } from '../../lib/format';
import { ProductDetailDrawer } from '../products/ProductDetailDrawer';
import { ProductUpdateDrawer } from './ProductUpdateDrawer';
import { ProductAddModal } from './AddProductModal';
import { Link } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';
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

interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  current_qty: number;
  reorder_status: 'OK' | 'LOW' | 'OUT';
  last_updated?: string;
  price?: number;
  cost?: number;  // cost price
  mrp?: number;
  category_id?: string;
  image_url?: string;
  barcode?: string;
  last_purchased_date?: string;
}

export function InventoryListPage() {
  const { storeId, tenantId } = useAuth();
  const { notify } = useNotify();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => window.innerWidth >= 1024 ? 'list' : 'grid');
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  
  // Advanced Sorting
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'stock-asc' | 'stock-desc' | 'margin-asc' | 'margin-desc' | 'value-asc' | 'value-desc'>('name-asc');
  
  // Deferred search to avoid blocking render thread
  const deferredSearch = useDeferredValue(debouncedSearch);
  
  // Modal Open States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
  const [isBulkStockModalOpen, setIsBulkStockModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  const { data: inventory, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory', storeId],
    queryFn: () => api.inventory.list(storeId),
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
  } = useInventoryBulkActions(storeId, tenantId, inventory);

  // Stable callbacks — prevent memoized card re-renders on every parent render
  const handleViewProduct = useCallback((item: InventoryItem) => setViewingProductId(item.id), []);
  const handleEditProduct = useCallback((item: InventoryItem) => setEditingProduct(item), []);

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
      return matchesSearch && matchesCategory;
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
  }, [inventory, deferredSearch, selectedCategoryId, sortBy]);

  const stats = useMemo(() => {
    const all = inventory ?? [];
    const total = all.length;
    const lowStock = all.filter((p: InventoryItem) => p.reorder_status === 'LOW').length;
    const outOfStock = all.filter((p: InventoryItem) => p.reorder_status === 'OUT').length;
    const totalValue = all.reduce((sum: number, p: InventoryItem) => sum + ((p.price || 0) * p.current_qty), 0);
    return { total, lowStock, outOfStock, totalValue };
  }, [inventory]);

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
    estimateSize: () => 360,
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
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm font-medium">
            <span className="flex items-center gap-1.5 text-text-secondary px-2 py-1 rounded-md bg-surface border border-border-subtle shadow-sm">
              <Package size={14} className="text-primary" />
              <AnimatedMetric value={stats.total} /> SKUs
            </span>
            <span className="flex items-center gap-1.5 text-text-secondary px-2 py-1 rounded-md bg-surface border border-border-subtle shadow-sm">
              <AlertTriangle size={14} className="text-warning-dark" />
              <AnimatedMetric value={stats.lowStock} /> Low
            </span>
            <span className="flex items-center gap-1.5 text-text-secondary px-2 py-1 rounded-md bg-surface border border-border-subtle shadow-sm">
              <TrendingDown size={14} className="text-danger" />
              <AnimatedMetric value={stats.outOfStock} /> Out
            </span>
            <span className="flex items-center gap-1.5 text-text-secondary px-2 py-1 rounded-md bg-surface border border-border-subtle shadow-sm">
              <Wallet size={14} className="text-success-dark" />
              <AnimatedMetric value={stats.totalValue} format prefix="৳" /> Value
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
        className="mb-4"
      />

      {/* Sticky Single Toolbar */}
      <div 
        className="sticky -mt-4 -mx-6 px-6 pt-4 pb-4 top-0 z-20 border-b border-border-default mb-6"
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
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search inventory by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-md border border-border-default bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              />
            </div>
            
            <div className="flex gap-2">
              <div className="relative">
                <ArrowUpDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="pl-9 pr-8 py-2 rounded-md border border-border-default bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer shadow-sm"
                >
                  <option value="name-asc">Name A→Z</option>
                  <option value="name-desc">Name Z→A</option>
                  <option value="stock-asc">Stock ↑ Low→High</option>
                  <option value="stock-desc">Stock ↓ High→Low</option>
                  <option value="margin-asc">Margin ↑ Low→High</option>
                  <option value="margin-desc">Margin ↓ High→Low</option>
                  <option value="value-asc">Value ↑ Low→High</option>
                  <option value="value-desc">Value ↓ High→Low</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
              
              <Button
                variant="secondary"
                icon={<ScanLine size={18} />}
                onClick={() => setIsBarcodeModalOpen(true)}
                title="Scan Barcode"
                className="shadow-sm"
              >
                <span className="hidden sm:inline">Scan</span>
              </Button>
              
              <div className="flex rounded-md border border-border-default overflow-hidden flex-shrink-0 shadow-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 flex items-center justify-center transition-colors ${
                    viewMode === 'grid' ? 'bg-primary text-primary-on' : 'bg-surface text-text-secondary hover:bg-background-subtle'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 flex items-center justify-center transition-colors ${
                    viewMode === 'list' ? 'bg-primary text-primary-on' : 'bg-surface text-text-secondary hover:bg-background-subtle'
                  }`}
                  title="List View"
                >
                  <ListIcon size={16} />
                </button>
              </div>
            </div>
          </div>
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
                    {rowItems.map((item) => (
                      <InventoryProductCard
                        key={item.id}
                        item={item}
                        isHighlighted={highlightedProductId === item.id}
                        isSelected={selectedIds.has(item.id)}
                        onToggleSelect={toggleSelect}
                        onUpdateStock={handleViewProduct}
                        tenantId={tenantId}
                        priority={virtualRow.index === 0}
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
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectAll={toggleSelectAll}
            onUpdateStock={handleViewProduct}
            onViewHistory={handleViewProduct}
            onEditProduct={handleEditProduct}
            onDelete={(item) => console.log('Delete', item)}
          />
        )}
      </div>

      <ProductAddModal
        isOpen={isAddModalOpen}
        categories={categories}
        onClose={() => setIsAddModalOpen(false)}
      />

      <ProductUpdateDrawer
        product={editingProduct}
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