import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { ErrorState } from '../../components/PageState';
import { Search, RefreshCw, History } from 'lucide-react';
import { StockUpdateDrawer } from './StockUpdateDrawer';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  current_qty: number;
  reorder_status: 'OK' | 'LOW' | 'OUT';
  last_updated?: string;
}

export function InventoryListPage() {
  const { storeId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [adjustingProduct, setAdjustingProduct] = useState<InventoryItem | null>(null);

  const { data: inventory, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory', storeId],
    queryFn: () => api.inventory.list(storeId),
  });

  const filteredItems = useMemo(() =>
    inventory?.filter((p: InventoryItem) =>
      p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(debouncedSearch.toLowerCase())
    ) ?? [],
    [inventory, debouncedSearch]
  );

  const columns: Column<InventoryItem>[] = [
    {
      header: 'Product',
      accessor: 'name',
      render: (_, row) => (
        <div>
          <div className="font-semibold text-text-primary">{row.name}</div>
          <div className="text-xs text-text-muted">SKU: {row.sku || 'N/A'}</div>
        </div>
      ),
    },
    {
      header: 'Current Stock',
      accessor: 'current_qty',
      render: (val) => (
        <span className="text-lg font-bold font-mono">{val as number}</span>
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
        className="mb-8"
      />

      <Card className="mb-6" padding="none">
        <div className="p-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Filter by product name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-md border border-border-default bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={filteredItems}
        emptyMessage="No inventory items found. Add products to start tracking stock levels."
      />

      <StockUpdateDrawer
        product={adjustingProduct}
        storeId={storeId}
        onClose={() => setAdjustingProduct(null)}
      />
    </div>
  );
}