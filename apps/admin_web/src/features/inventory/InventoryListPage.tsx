import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { ErrorState } from '../../components/PageState';
import { Search, RefreshCw, History, Package, AlertTriangle, TrendingDown, DollarSign, LayoutGrid, List as ListIcon, Download } from 'lucide-react';
import { downloadCSV } from '../../lib/format';
import { ProductUpdateDrawer } from './ProductUpdateDrawer';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { MetricCard } from '../../components/data-display/MetricCard';
import { CategoryThumbnailGrid } from '../products/CategoryThumbnailGrid';
import { ProductCardSkeletonGrid } from '../../components/Skeleton';
import { AnimatedMetric } from '../../components/data-display/AnimatedMetric';
import { InventoryListTable } from '../../components/inventory/InventoryListTable';
import { InventoryProductCard } from './InventoryProductCard';

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
}

export function InventoryListPage() {
  const { storeId, tenantId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [adjustingProduct, setAdjustingProduct] = useState<InventoryItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);

  const { data: inventory, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory', storeId],
    queryFn: () => api.inventory.list(storeId),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const filteredItems = useMemo(() => {
    const filtered = inventory?.filter((p: InventoryItem) => {
      const matchesSearch =
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.sku?.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesCategory = selectedCategoryId ? p.category_id === selectedCategoryId : true;
      return matchesSearch && matchesCategory;
    }) ?? [];
    return filtered;
  }, [inventory, debouncedSearch, selectedCategoryId]);

  const stats = useMemo(() => {
    const all = inventory ?? [];
    const total = all.length;
    const lowStock = all.filter((p: InventoryItem) => p.reorder_status === 'LOW').length;
    const outOfStock = all.filter((p: InventoryItem) => p.reorder_status === 'OUT').length;
    const totalValue = all.reduce((sum: number, p: InventoryItem) => sum + ((p.price || 0) * p.current_qty), 0);
    return { total, lowStock, outOfStock, totalValue };
  }, [inventory]);

  const columns: Column<InventoryItem>[] = [
    {
      header: 'Product',
      accessor: 'name',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-background-subtle flex items-center justify-center overflow-hidden border border-border-default flex-shrink-0">
            {row.image_url ? (
              <img src={row.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <Package size={18} className="text-text-muted opacity-50" />
            )}
          </div>
          <div>
            <div className="font-semibold text-text-primary">{row.name}</div>
            <div className="text-xs text-text-muted">SKU: {row.sku || 'N/A'}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Current Stock',
      accessor: 'current_qty',
      render: (val) => (
        <span className={`text-lg font-bold font-mono ${(val as number) <= 5 ? 'text-danger' : 'text-text-primary'}`}>
          {val as number}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'reorder_status',
      render: (val) => {
        const status = val as string;
        let variant: 'success' | 'warning' | 'danger' = 'success';
        if (status === 'LOW') variant = 'warning';
        if (status === 'OUT') variant = 'danger';
        return (
          <Badge variant={variant} className="font-bold px-2 py-0.5">
            {status}
          </Badge>
        );
      },
    },
    {
      header: 'Retail',
      accessor: 'price',
      render: (_, row) => (
        <div className="font-mono text-text-primary">
          <span>৳{((row.price || 0) * row.current_qty).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          {row.mrp && row.mrp > 0 && (
            <span className="block text-xs text-text-muted">MRP: ৳{row.mrp}</span>
          )}
        </div>
      ),
    },
    {
      header: 'Cost',
      accessor: 'cost',
      render: (val) => (
        <span className="font-mono text-text-muted text-sm">
          ৳{(val as number || 0).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Margin',
      accessor: 'cost',
      render: (_, row) => {
        const cost = row.cost || 0;
        const price = row.price || 0;
        const margin = cost > 0 ? ((price - cost) / price * 100) : 0;
        return (
          <span className="font-mono text-xs ${margin > 0 ? 'text-success' : 'text-text-muted'}">
            {margin > 0 ? `+${margin.toFixed(0)}%` : '-'}
          </span>
        );
      },
    },
    {
      header: 'Stock Value',
      accessor: 'price',
      render: (_, row) => (
        <div className="text-right">
          <div className="font-mono text-text-primary text-sm">
            ৳{((row.price || 0) * row.current_qty).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-text-muted">
            cost: ৳{((row.cost || 0) * row.current_qty).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </div>
      ),
    },
    {
      header: 'Last Updated',
      accessor: 'last_updated',
      render: (val) => (
        <span className="text-text-muted">
          {val ? formatDistanceToNow(new Date(val as string)) + ' ago' : 'Never'}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      align: 'right',
      render: (_, row) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            setAdjustingProduct(row);
          }}
        >
          Update
        </Button>
      ),
    },
  ];

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
    <div className="inventory-container">
      <PageHeader
        title="Stock Inventory"
        subtitle="Monitor and adjust stock levels."
        actions={
          <div className="flex gap-3">
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
            >
              Export CSV
            </Button>
            <Link to="/inventory/history">
              <Button variant="secondary" icon={<History size={18} />}>
                View History
              </Button>
            </Link>
            <Button variant="secondary" onClick={() => refetch()} loading={isLoading}>
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </Button>
          </div>
        }
        className="mb-6"
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total SKUs"
          value={<AnimatedMetric value={stats.total} duration={800} />}
          icon={<Package size={20} />}
          color="primary"
        />
        <MetricCard
          title="Low Stock"
          value={<AnimatedMetric value={stats.lowStock} duration={800} />}
          icon={<AlertTriangle size={20} />}
          color="warning"
          badge={stats.lowStock > 0 ? 'Reorder' : undefined}
        />
        <MetricCard
          title="Out of Stock"
          value={<AnimatedMetric value={stats.outOfStock} duration={800} />}
          icon={<TrendingDown size={20} />}
          color="danger"
        />
        <MetricCard
          title="Inventory Value"
          value={<AnimatedMetric 
            value={stats.totalValue} 
            prefix="৳" 
            duration={800} 
            format
          />}
          icon={<DollarSign size={20} />}
          color="success"
        />
      </div>

      {/* Category Thumbnails */}
      <Card className="mb-6" padding="md">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Filter by Category
        </h3>
        <CategoryThumbnailGrid
          categories={categories?.map((c: unknown) => ({
            id: c.id,
            name: c.name || c.category,
            itemCount: inventory?.filter((p: unknown) => p.category_id === c.id).length ?? 0,
            imageUrl: c.image_url,
            color: c.color,
            icon: c.icon,
          })) ?? []}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
        />
      </Card>

      {/* Search + View Toggle */}
      <Card className="mb-6" padding="none">
        <div className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Filter by product name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-md border border-border-default bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
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

      {/* Content - Product Shelf Grid or List Table */}
      {isLoading && viewMode === 'grid' ? (
        <ProductCardSkeletonGrid count={10} />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 mb-6">
          {filteredItems.map((item: InventoryItem) => (
            <InventoryProductCard
              key={item.id}
              item={item}
              isHighlighted={highlightedProductId === item.id}
              onUpdateStock={setAdjustingProduct}
              tenantId={tenantId}
            />
          ))}
        </div>
      ) : viewMode === 'list' && !isLoading ? (
        <InventoryListTable
          items={filteredItems}
          onUpdateStock={setAdjustingProduct}
          onViewHistory={(item) => console.log('View history', item)}
          onEditProduct={(item) => console.log('Edit', item)}
          onDelete={(item) => console.log('Delete', item)}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredItems}
          emptyMessage="No inventory items found. Add products to start tracking stock levels."
        />
      )}

      <ProductUpdateDrawer
        product={adjustingProduct}
        storeId={storeId}
        onClose={() => {
          setAdjustingProduct(null);
          setHighlightedProductId(null);
        }}
        onSuccess={(productName) => {
          // Find product id by name and trigger highlight
          const updated = inventory?.find((p: InventoryItem) => p.name === productName);
          if (updated) {
            setHighlightedProductId(updated.id);
          }
        }}
      />
    </div>
  );
}