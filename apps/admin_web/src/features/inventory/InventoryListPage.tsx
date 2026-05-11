import { useState, useMemo } from 'react';
import { useInventoryList } from '../../hooks/useInventory';
import { useAuth } from '../../lib/AuthContext';
import { PageContainer } from '../../layouts/PageContainer';
import { ErrorState } from '../../components/ui/ErrorState';
import { Search, RefreshCw, History } from 'lucide-react';
import { StockUpdateDrawer } from './StockUpdateDrawer';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { DataTable, DataTableToolbar } from '../../components/datatable';
import { getInventoryColumns } from './columns';
import { usePersistedTableState } from '../../hooks/usePersistedTableState';
import { processTableData } from '../../lib/table-query';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

import { InventoryListRow } from '../../types/rpc';
export function InventoryListPage() {
  const { storeId } = useAuth();
  const { state: tableState, setSearch, setSort } = usePersistedTableState({
    tableId: 'inventory',
    defaultState: {
      sort: { id: 'name', desc: false }
    }
  });
  const debouncedSearch = useDebounce(tableState.search, 300);
  const [adjustingProduct, setAdjustingProduct] = useState<InventoryListRow | null>(null);

  const { data: inventory, isLoading, error, refetch } = useInventoryList(
    storeId, 
    debouncedSearch || undefined
  );

  const filteredItems = useMemo(() => {
    return processTableData({
      data: inventory,
      search: debouncedSearch,
      searchFields: ['name', 'sku'],
      sort: tableState.sort,
      filters: tableState.filters,
    });
  }, [inventory, debouncedSearch, tableState.sort, tableState.filters]);

  const columns = useMemo(() => getInventoryColumns(setAdjustingProduct), []);

  if (error) {
    return (
      <PageContainer className="inventory-container">
        <PageHeader 
          title="Stock Inventory" 
          subtitle="Monitor and adjust stock levels." 
        />
        <Card className="mt-6">
          <ErrorState message="Failed to load inventory." onRetry={() => refetch()} />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="inventory-container">
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

      <DataTable
        columns={columns}
        data={filteredItems}
        isLoading={isLoading}
        sortBy={tableState.sort}
        onSortChange={setSort}
        toolbar={
          <DataTableToolbar 
            searchValue={tableState.search} 
            onSearchChange={setSearch} 
            searchPlaceholder="Filter by product name or SKU..." 
          />
        }
      />

      <StockUpdateDrawer
        product={adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
      />
    </PageContainer>
  );
}