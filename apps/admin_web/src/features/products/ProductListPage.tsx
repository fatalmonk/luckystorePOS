import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { api } from '../../lib/api';
import { ErrorState, EmptyState, SkeletonBlock } from '../../components/PageState';
import { Search, Plus, Edit2, Package } from 'lucide-react';
import { ProductEditDrawer } from './ProductEditDrawer';
import { ProductAddModal } from './ProductAddModal';
import { useRealtimeSubscription } from '../../hooks/useRealtime';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProductDetailDrawer } from './ProductDetailDrawer';
import { Card } from '../../components/ui/Card';

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

  const { data: products, isLoading, error, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.products.list(),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const filteredProducts = useMemo(() => {
    let filtered = products?.filter((p: any) =>
      p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(debouncedSearch.toLowerCase())
    ) ?? [];

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
  }, [products, debouncedSearch, sortBy]);

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
        className="mb-8"
      />

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
          <select className="px-3 py-2 rounded-md border border-border-default bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary text-sm">
            <option value="">All Categories</option>
            {categories?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
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
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="bg-background-subtle border-b border-border-default hidden sm:flex">
          <div className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[28%]">Product</div>
          <div className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[18%]">SKU / Barcode</div>
          <div className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[12%]">Price</div>
          <div className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[12%] text-center">Stock</div>
          <div className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[12%]">Status</div>
          <div className="p-4 text-xs font-semibold text-text-secondary uppercase tracking-wider w-[18%] text-right">Actions</div>
        </div>

        {isLoading ? (
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
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={<Package size={48} />}
            title={searchTerm ? 'No products match your search' : 'No products yet'}
            description={searchTerm ? 'Try adjusting your search terms.' : 'Add your first product to get started.'}
            action={!searchTerm ? <Button onClick={() => setIsAddModalOpen(true)} icon={<Plus size={18} />}>Add Product</Button> : undefined}
          />
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
                    <div className="p-4 w-[28%] min-w-0">
                      <div className="font-semibold text-text-primary truncate">{p.name}</div>
                      <div className="text-xs text-text-muted truncate">{p.categories?.name || 'No Category'}</div>
                    </div>
                    <div className="p-4 w-[18%] min-w-0 text-sm">
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
                    <div className="p-4 w-[18%] text-right flex justify-end gap-2">
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