import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { api } from '../../lib/api';
import { ErrorState, EmptyState, SkeletonBlock } from '../../components/PageState';
import { Search, Plus, Edit2, Package, LayoutGrid, List as ListIcon, Image as ImageIcon, Tag } from 'lucide-react';
import { ProductEditDrawer } from './ProductEditDrawer';
import { ProductAddModal } from './ProductAddModal';
import { useRealtimeSubscription } from '../../hooks/useRealtime';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProductDetailDrawer } from './ProductDetailDrawer';
import { Card } from '../../components/ui/Card';
import { MetricCard } from '../../components/data-display/MetricCard';
import { CategoryThumbnailGrid } from './CategoryThumbnailGrid';

const ROW_HEIGHT = 64;
const VISIBLE_ROWS = 15;

export function ProductListPage() {
  useRealtimeSubscription({
    table: 'items',
    event: '*',
    invalidateKeys: [['products']],
  });

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'stock-asc'>('name-asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const { data: products, isLoading, error, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.products.list(),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const filteredProducts = useMemo(() => {
    let filtered = products?.filter((p: any) => {
      const matchesSearch =
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.sku?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesCategory = selectedCategoryId ? p.category_id === selectedCategoryId : true;
      return matchesSearch && matchesCategory;
    }) ?? [];

    filtered = [...filtered].sort((a: any, b: any) => {
      switch (sortBy) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'price-asc': return (a.price || 0) - (b.price || 0);
        case 'price-desc': return (b.price || 0) - (a.price || 0);
        case 'stock-asc': return (a.stock || 0) - (b.stock || 0);
        default: return 0;
      }
    });

    return filtered;
  }, [products, debouncedSearch, sortBy, selectedCategoryId]);

  const stats = useMemo(() => {
    const all = products ?? [];
    const total = all.length;
    const lowStock = all.filter((p: any) => (p.stock || 0) > 0 && (p.stock || 0) <= 5).length;
    const outOfStock = all.filter((p: any) => (p.stock || 0) === 0).length;
    const totalValue = all.reduce((sum: number, p: any) => sum + ((p.price || 0) * (p.stock || 0)), 0);
    return { total, lowStock, outOfStock, totalValue };
  }, [products]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredProducts.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  if (error) {
    return (
      <div className="products-container">
        <PageHeader title="Products" subtitle="Manage your shop's catalog." />
        <Card className="mt-6">
          <ErrorState message="Failed to load products." onRetry={() => refetch()} />
        </Card>
      </div>
    );
  }

  return (
    <div className="products-container">
      <PageHeader
        title="Products"
        subtitle="Manage your shop's catalog."
        actions={
          <Button onClick={() => setIsAddModalOpen(true)} icon={<Plus size={18} />}>
            Add Product
          </Button>
        }
        className="mb-6"
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Products"
          value={stats.total}
          icon={<Package size={20} />}
          color="primary"
        />
        <MetricCard
          title="Low Stock"
          value={stats.lowStock}
          icon={<Tag size={20} />}
          color="warning"
          badge={stats.lowStock > 0 ? 'Action needed' : undefined}
        />
        <MetricCard
          title="Out of Stock"
          value={stats.outOfStock}
          icon={<Package size={20} />}
          color="danger"
        />
        <MetricCard
          title="Inventory Value"
          value={`৳${stats.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          icon={<ImageIcon size={20} />}
          color="success"
        />
      </div>

      {/* Category Thumbnails */}
      <Card className="mb-6" padding="md">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Browse by Category
        </h3>
        {isLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {Array(6).fill(0).map((_, i) => (
              <SkeletonBlock key={i} className="w-24 h-28 rounded-xl flex-shrink-0" />
            ))}
          </div>
        ) : (
          <CategoryThumbnailGrid
            categories={categories?.map((c: any) => ({
              id: c.id,
              name: c.name || c.category,
              itemCount: products?.filter((p: any) => p.category_id === c.id).length ?? 0,
              imageUrl: c.image_url,
              color: c.color,
              icon: c.icon,
            })) ?? []}
            selectedId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
          />
        )}
      </Card>

      {/* Search, Filter, Sort, View Toggle */}
      <Card className="flex flex-col md:flex-row gap-4 mb-6 p-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name, SKU, or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-md border border-border-default bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-md border border-border-default bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="price-asc">Price Low-High</option>
            <option value="price-desc">Price High-Low</option>
            <option value="stock-asc">Stock Low-High</option>
          </select>
          <div className="flex rounded-md border border-border-default overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 flex items-center gap-1.5 text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary text-primary-on'
                  : 'bg-surface text-text-secondary hover:bg-background-subtle'
              }`}
            >
              <LayoutGrid size={16} />
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 flex items-center gap-1.5 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary text-primary-on'
                  : 'bg-surface text-text-secondary hover:bg-background-subtle'
              }`}
            >
              <ListIcon size={16} />
              List
            </button>
          </div>
        </div>
      </Card>

      {/* Products Content */}
      <Card padding="none" className="overflow-hidden">
        {isLoading ? (
          viewMode === 'grid' ? (
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array(10).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <SkeletonBlock className="w-full aspect-square rounded-lg" />
                  <SkeletonBlock className="w-3/4 h-4" />
                  <SkeletonBlock className="w-1/2 h-4" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 space-y-4">
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
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={<Package size={48} />}
            title={searchTerm || selectedCategoryId ? 'No products match your filters' : 'No products yet'}
            description={searchTerm || selectedCategoryId ? 'Try adjusting your search or category filter.' : 'Add your first product to get started.'}
            action={!searchTerm && !selectedCategoryId ? <Button onClick={() => setIsAddModalOpen(true)} icon={<Plus size={18} />}>Add Product</Button> : undefined}
          />
        ) : viewMode === 'grid' ? (
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((p: any) => (
              <div
                key={p.id}
                onClick={() => setViewingProductId(p.id)}
                className="group flex flex-col bg-surface rounded-lg border border-border-default overflow-hidden cursor-pointer transition-all hover:shadow-level-2 hover:border-primary/30"
              >
                {/* Product Image */}
                <div className="relative w-full aspect-square bg-background-subtle flex items-center justify-center overflow-hidden">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-text-muted">
                      <Package size={40} className="mb-2 opacity-40" />
                      <span className="text-xs">No image</span>
                    </div>
                  )}
                  {/* Stock badge overlay */}
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant={
                        (p.stock || 0) === 0 ? 'danger' :
                        (p.stock || 0) <= 5 ? 'warning' : 'success'
                      }
                      className="text-[10px] px-2 py-0.5 font-bold"
                    >
                      {(p.stock || 0) === 0 ? 'OUT' : p.stock || 0}
                    </Badge>
                  </div>
                  {/* Category badge overlay */}
                  {p.categories?.name && (
                    <div className="absolute bottom-2 left-2">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface/90 text-text-secondary backdrop-blur-sm">
                        {p.categories.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3 flex flex-col gap-1.5">
                  <h4 className="text-sm font-semibold text-text-primary line-clamp-2 leading-tight min-h-[2.5em]">
                    {p.name}
                  </h4>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold font-mono text-primary">
                      ৳{p.price}
                    </span>
                    <span className="text-xs text-text-muted font-mono">
                      {p.sku || p.barcode || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <Badge variant={p.active ? 'success' : 'neutral'} className="text-[10px]">
                      {p.active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); setEditingProduct(p); }}
                      className="h-7 w-7 p-0"
                    >
                      <Edit2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="overflow-auto"
            style={{ height: `${Math.min(filteredProducts.length, VISIBLE_ROWS) * ROW_HEIGHT}px` }}
          >
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const p = filteredProducts[virtualRow.index];
                return (
                  <div
                    key={p.id}
                    onClick={() => setViewingProductId(p.id)}
                    className="flex items-center absolute w-full border-b border-border-default hover:bg-background-subtle cursor-pointer transition-colors"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {/* Thumbnail */}
                    <div className="p-4 w-[8%] min-w-[64px]">
                      <div className="w-12 h-12 rounded-lg bg-background-subtle flex items-center justify-center overflow-hidden border border-border-default">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <Package size={20} className="text-text-muted opacity-50" />
                        )}
                      </div>
                    </div>
                    <div className="p-4 w-[24%] min-w-0">
                      <div className="font-semibold text-text-primary truncate">{p.name}</div>
                      <div className="text-xs text-text-muted truncate">{p.categories?.name || 'No Category'}</div>
                    </div>
                    <div className="p-4 w-[16%] min-w-0 text-sm">
                      <div className="text-text-primary truncate">{p.sku}</div>
                      <div className="text-text-muted text-xs truncate">{p.barcode}</div>
                    </div>
                    <div className="p-4 w-[12%] font-mono font-bold text-text-primary whitespace-nowrap">৳{p.price}</div>
                    <div className="p-4 w-[12%] text-center">
                      <span className={'font-bold font-mono ' + ((p.stock || 0) <= 5 ? 'text-danger' : 'text-text-primary')}>
                        {p.stock || 0}
                      </span>
                    </div>
                    <div className="p-4 w-[12%]">
                      <Badge variant={p.active ? 'success' : 'neutral'}>
                        {p.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="p-4 w-[16%] text-right flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => { e.stopPropagation(); setEditingProduct(p); }}
                        icon={<Edit2 size={16} />}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <ProductEditDrawer
        product={editingProduct}
        categories={categories}
        onClose={() => setEditingProduct(null)}
      />

      <ProductDetailDrawer
        productId={viewingProductId}
        onClose={() => setViewingProductId(null)}
        onEdit={(p) => {
          setViewingProductId(null);
          setEditingProduct(p);
        }}
      />

      <ProductAddModal
        isOpen={isAddModalOpen}
        categories={categories}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
