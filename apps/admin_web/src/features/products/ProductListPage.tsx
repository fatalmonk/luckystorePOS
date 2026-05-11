import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageContainer } from '../../layouts/PageContainer';
import { Card } from '../../components/ui/Card';
import { Plus, Edit2, Package } from 'lucide-react';
import { ProductEditDrawer } from './ProductEditDrawer';
import { ProductAddModal } from './ProductAddModal';
import { useRealtimeSubscription } from '../../hooks/useRealtime';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProductDetailDrawer } from './ProductDetailDrawer';
import { DataTable, DataTableToolbar } from '../../components/datatable';
import { getProductColumns } from './columns';
import { usePersistedTableState } from '../../hooks/usePersistedTableState';
import { processTableData } from '../../lib/table-query';



export function ProductListPage() {
  useRealtimeSubscription({
    table: 'items',
    event: '*',
    invalidateKeys: [['products']],
  });

  const { state: tableState, setSearch, setSort, setFilter } = usePersistedTableState({
    tableId: 'products',
    defaultState: {
      sort: { id: 'name', desc: false }
    }
  });
  const debouncedSearch = useDebounce(tableState.search, 300);
  const categoryFilter = tableState.filters['category_id'] || '';

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

  const filteredProducts = useMemo(() => {
    return processTableData({
      data: products,
      search: debouncedSearch,
      searchFields: ['name', 'sku', 'barcode'],
      sort: tableState.sort,
      filters: tableState.filters
    });
  }, [products, debouncedSearch, tableState.sort, tableState.filters]);

  const columns = useMemo(() => getProductColumns(setEditingProduct), []);

  if (error) {
    return (
      <PageContainer className="products-container">
        <PageHeader title="Products" subtitle="Manage your shop's catalog." />
        <Card className="mt-6">
          <ErrorState message="Failed to load products." onRetry={() => refetch()} />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="products-container">
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

      <DataTable
        columns={columns}
        data={filteredProducts}
        isLoading={isLoading}
        sortBy={tableState.sort}
        onSortChange={setSort}
        onRowClick={(row) => setViewingProductId(row.id)}
        toolbar={
          <DataTableToolbar
            searchValue={tableState.search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by name, SKU, or barcode..."
            actions={
              <div className="flex gap-2">
                <select 
                  className="input py-1.5 text-sm min-w-[140px]"
                  value={categoryFilter}
                  onChange={e => setFilter('category_id', e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            }
          />
        }
        emptyState={
          <EmptyState
            icon={<Package size={48} />}
            title={tableState.search ? 'No products match your search' : 'No products yet'}
            description={tableState.search ? 'Try adjusting your search terms.' : 'Add your first product to get started.'}
            action={!tableState.search ? <Button onClick={() => setIsAddModalOpen(true)} icon={<Plus size={18} />}>Add Product</Button> : undefined}
          />
        }
      />

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
    </PageContainer>
  );
}