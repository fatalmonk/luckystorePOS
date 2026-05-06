import { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { api } from '../../lib/api';
import { ErrorState, EmptyState, SkeletonBlock } from '../../components/PageState';
import { Search, Plus, Edit2, Package, Filter } from 'lucide-react';
import { clsx } from 'clsx';
import { ProductEditDrawer } from './ProductEditDrawer';
import { ProductAddModal } from './ProductAddModal';
import { useNotify } from '../../components/Notification';
import { useRealtimeSubscription } from '../../hooks/useRealtime';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProductDetailDrawer } from './ProductDetailDrawer';

const ROW_HEIGHT = 64;
const VISIBLE_ROWS = 15;

export function ProductListPage() {
  const { notify } = useNotify();

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

  const { data: products, isLoading, error, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.products.list(),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const filteredProducts = useMemo(() =>
    products?.filter((p: any) =>
      p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(debouncedSearch.toLowerCase())
    ) ?? [],
    [products, debouncedSearch]
  );

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
        <PageHeader 
          title="Products" 
          subtitle="Manage your shop's catalog." 
        />
        <div className="card">
          <ErrorState message="Failed to load products." onRetry={() => refetch()} />
        </div>
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

      <div className="card flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search by name, SKU, or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-md border border-border-color bg-input text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2">
          <select className="px-3 py-2 rounded-md border border-border-color bg-input text-text-main focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">All Categories</option>
            {categories?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select className="px-3 py-2 rounded-md border border-border-color bg-input text-text-main focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Sort By</option>
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="stock">Stock</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Fixed header */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.02)', color: 'var(--text-muted)' }}>
              <th style={{ padding: 'var(--space-4)', width: '28%' }}>Product</th>
              <th style={{ padding: 'var(--space-4)', width: '18%' }}>SKU / Barcode</th>
              <th style={{ padding: 'var(--space-4)', width: '12%' }}>Price</th>
              <th style={{ padding: 'var(--space-4)', width: '12%' }}>Cost</th>
              <th style={{ padding: 'var(--space-4)', width: '10%' }}>Stock</th>
              <th style={{ padding: 'var(--space-4)', width: '12%' }}>Status</th>
              <th style={{ padding: 'var(--space-4)', textAlign: 'right', width: '8%' }}>Actions</th>
            </tr>
          </thead>
        </table>

        {isLoading ? (
          <div className="p-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex gap-4 py-3">
                <SkeletonBlock className="w-[28%] h-5" />
                <SkeletonBlock className="w-[18%] h-5" />
                <SkeletonBlock className="w-[12%] h-5" />
                <SkeletonBlock className="w-[12%] h-5" />
                <SkeletonBlock className="w-[10%] h-5" />
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
            style={{ height: `${Math.min(filteredProducts.length, VISIBLE_ROWS) * ROW_HEIGHT + 4}px`, overflow: 'auto' }}
          >
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const p = filteredProducts[virtualRow.index];
                return (
                  <div
                    key={p.id}
                    onClick={() => setViewingProductId(p.id)}
                    className="hover:bg-[rgba(0,0,0,0.02)] cursor-pointer transition-colors"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      position: 'absolute',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--border-color)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    <div style={{ padding: 'var(--space-4)', width: '28%', minWidth: 0 }}>
                      <div style={{ fontWeight: '600' }}>{p.name}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{p.categories?.name || 'No Category'}</div>
                    </div>
                    <div style={{ padding: 'var(--space-4)', width: '18%', minWidth: 0 }}>
                      <div>{p.sku}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{p.barcode}</div>
                    </div>
                    <div style={{ padding: 'var(--space-4)', width: '12%' }}>৳{p.price}</div>
                    <div style={{ padding: 'var(--space-4)', width: '12%', color: 'var(--text-muted)' }}>৳{p.cost}</div>
                    <div style={{ padding: 'var(--space-4)', width: '10%' }}>
                      <span style={{
                        fontWeight: '600',
                        color: (p.stock || 0) <= 5 ? 'var(--color-danger)' : 'inherit'
                      }}>
                        {p.stock || 0}
                      </span>
                    </div>
                    <div style={{ padding: 'var(--space-4)', width: '12%' }}>
                      <Badge variant={p.active ? 'success' : 'neutral'}>
                        {p.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div style={{ padding: 'var(--space-4)', textAlign: 'right', width: '8%' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingProduct(p); }}
                        style={{ color: 'var(--color-primary)', padding: 'var(--space-1)' }}
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

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