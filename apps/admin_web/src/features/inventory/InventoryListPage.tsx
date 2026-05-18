import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { ErrorState } from '../../components/PageState';
import { Search, RefreshCw, History, Package, AlertTriangle, TrendingDown, DollarSign, LayoutGrid, List as ListIcon, Download } from 'lucide-react';
import { downloadCSV } from '../../lib/format';
import { StockUpdateDrawer } from './StockUpdateDrawer';
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

interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  current_qty: number;
  reorder_status: 'OK' | 'LOW' | 'OUT';
  last_updated?: string;
  price?: number;
  mrp?: number;
  category_id?: string;
  image_url?: string;
}

export function InventoryListPage() {
  const { storeId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [adjustingProduct, setAdjustingProduct] = useState<InventoryItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const { data: inventory, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory', storeId],
    queryFn: () => api.inventory.list(storeId),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories.list(),
  });

  const filteredItems = useMemo(() => {
    let filtered = inventory?.filter((p: InventoryItem) => {
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
      header: 'Value',
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
          value={stats.total}
          icon={<Package size={20} />}
          color="primary"
        />
        <MetricCard
          title="Low Stock"
          value={stats.lowStock}
          icon={<AlertTriangle size={20} />}
          color="warning"
          badge={stats.lowStock > 0 ? 'Reorder' : undefined}
        />
        <MetricCard
          title="Out of Stock"
          value={stats.outOfStock}
          icon={<TrendingDown size={20} />}
          color="danger"
        />
        <MetricCard
          title="Inventory Value"
          value={`৳${stats.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
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
          categories={categories?.map((c: any) => ({
            id: c.id,
            name: c.name || c.category,
            itemCount: inventory?.filter((p: any) => p.category_id === c.id).length ?? 0,
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

      {/* Content */}
      {viewMode === 'grid' && !isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
          {filteredItems.map((item: InventoryItem) => (
            <Card key={item.id} padding="none" className="overflow-hidden group cursor-pointer hover:shadow-level-2 transition-shadow">
              {/* Image / Status color bar */}
              <div className="relative w-full aspect-square bg-background-subtle flex items-center justify-center overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-text-muted">
                    <Package size={40} className="mb-2 opacity-40" />
                    <span className="text-xs">No image</span>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge
                    variant={
                      item.reorder_status === 'OUT' ? 'danger' :
                      item.reorder_status === 'LOW' ? 'warning' : 'success'
                    }
                    className="text-[10px] px-2 py-0.5 font-bold"
                  >
                    {item.reorder_status}
                  </Badge>
                </div>
              </div>
              <div className="p-3 flex flex-col gap-1.5">
                <h4 className="text-sm font-semibold text-text-primary line-clamp-2 leading-tight min-h-[2.5em]">
                  {item.name}
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold font-mono text-text-primary">
                    {item.current_qty}
                  </span>
                  <div className="text-right">
                    <span className="text-xs text-text-muted font-mono">
                      ৳{((item.price || 0) * item.current_qty).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    {item.mrp && item.mrp > 0 && (
                      <span className="block text-xs text-text-secondary">
                        MRP: ৳{item.mrp}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full mt-1"
                  onClick={() => setAdjustingProduct(item)}
                >
                  Update Stock
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredItems}
          emptyMessage="No inventory items found. Add products to start tracking stock levels."
        />
      )}

      <StockUpdateDrawer
        product={adjustingProduct}
        storeId={storeId}
        onClose={() => setAdjustingProduct(null)}
      />
    </div>
  );
}
