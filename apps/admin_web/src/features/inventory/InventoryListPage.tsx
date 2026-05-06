import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { ErrorState, EmptyState, SkeletonBlock } from '../../components/PageState';
import { Search, RefreshCw, History, Package } from 'lucide-react';
import { clsx } from 'clsx';
import { StockUpdateDrawer } from './StockUpdateDrawer';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useDebounce } from '../../hooks/useDebounce';

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

  if (error) {
    return (
      <div className="inventory-container">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-[var(--font-size-2xl)] font-bold">Stock Inventory</h1>
            <p className="text-[var(--text-muted)]">Monitor and adjust stock levels.</p>
          </div>
        </header>
        <div className="card">
          <ErrorState message="Failed to load inventory." onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '700' }}>Stock Inventory</h1>
          <p style={{ color: 'var(--text-muted)' }}>Monitor and adjust stock levels.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Link
            to="/inventory/history"
            className="button-secondary"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            <History size={18} /> View History
          </Link>
          <button
            onClick={() => refetch()}
            style={{ color: 'var(--text-muted)' }}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Filter by product name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: 'var(--space-3) var(--space-3) var(--space-3) 40px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--input-bg)'
            }}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.02)', color: 'var(--text-muted)' }}>
              <th style={{ padding: 'var(--space-4)' }}>Product</th>
              <th style={{ padding: 'var(--space-4)' }}>Current Stock</th>
              <th style={{ padding: 'var(--space-4)' }}>Status</th>
              <th style={{ padding: 'var(--space-4)' }}>Last Updated</th>
              <th style={{ padding: 'var(--space-4)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i} className="border-b border-[var(--border-color)]">
                  <td className="p-4"><SkeletonBlock className="w-[200px] h-5" /></td>
                  <td className="p-4"><SkeletonBlock className="w-[60px] h-5" /></td>
                  <td className="p-4"><SkeletonBlock className="w-[80px] h-5" /></td>
                  <td className="p-4"><SkeletonBlock className="w-[100px] h-5" /></td>
                  <td className="p-4 text-right"><SkeletonBlock className="w-[100px] h-[30px] ml-auto" /></td>
                </tr>
              ))
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    icon={<Package size={48} />}
                    title="No inventory items"
                    description="Add products to start tracking stock levels."
                  />
                </td>
              </tr>
            ) : (
              filteredItems.map((p: any) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: 'var(--space-4)' }}>
                    <div style={{ fontWeight: '600' }}>{p.name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>SKU: {p.sku || 'N/A'}</div>
                  </td>
                  <td style={{ padding: 'var(--space-4)' }}>
                    <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: '700' }}>{p.current_qty}</span>
                  </td>
                  <td style={{ padding: 'var(--space-4)' }}>
                    <span className={clsx(
                      'badge',
                      p.reorder_status === 'OK' && 'badge-success',
                      p.reorder_status === 'LOW' && 'badge-warning',
                      p.reorder_status === 'OUT' && 'badge-danger'
                    )} style={{
                      fontSize: 'var(--font-size-xs)',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontWeight: '700',
                      backgroundColor:
                        p.reorder_status === 'OK' ? 'rgba(16, 185, 129, 0.1)' :
                        p.reorder_status === 'LOW' ? 'rgba(245, 158, 11, 0.1)' :
                        'rgba(239, 68, 68, 0.1)',
                      color:
                        p.reorder_status === 'OK' ? 'var(--color-success)' :
                        p.reorder_status === 'LOW' ? 'var(--color-warning)' :
                        'var(--color-danger)'
                    }}>
                      {p.reorder_status}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--space-4)', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                    {p.last_updated ? formatDistanceToNow(new Date(p.last_updated)) + ' ago' : 'Never'}
                  </td>
                  <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
                    <button
                      onClick={() => setAdjustingProduct(p)}
                      style={{
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        padding: 'var(--space-2) var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: '600'
                      }}
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <StockUpdateDrawer
        product={adjustingProduct}
        storeId={storeId}
        onClose={() => setAdjustingProduct(null)}
      />
    </div>
  );
}