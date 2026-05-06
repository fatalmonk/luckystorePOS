import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { ErrorState, EmptyState, SkeletonBlock } from '../../components/PageState';
import { History, ArrowLeft, ArrowUp, ArrowDown, User, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export function StockHistoryPage() {
  const { storeId } = useAuth();

  const { data: history, isLoading, error } = useQuery({
    queryKey: ['inventory-history', storeId],
    queryFn: () => api.inventory.history(storeId),
  });

  if (error) return <div className="card"><ErrorState message="Error loading stock history." /></div>;

  return (
    <div className="history-container">
      <header style={{ marginBottom: 'var(--space-8)' }}>
        <Link to="/inventory" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--color-primary)', textDecoration: 'none', marginBottom: 'var(--space-4)', fontWeight: '600' }}>
          <ArrowLeft size={18} /> Back to Inventory
        </Link>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '700' }}>Stock Movement History</h1>
        <p style={{ color: 'var(--text-muted)' }}>Audit log of all manual and automated stock changes.</p>
      </header>

      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div className="p-6">
            <SkeletonBlock className="w-full h-[400px]" />
          </div>
        ) : history?.length === 0 ? (
          <EmptyState
            icon={<History size={48} />}
            title="No stock movements yet"
            description="Stock movements will appear here once you make adjustments."
          />
        ) : (
          <div className="history-list">
            {history?.map((log: any) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-6)',
                  padding: 'var(--space-4) var(--space-6)',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <div style={{
                  backgroundColor: log.delta > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: log.delta > 0 ? 'var(--color-success)' : 'var(--color-danger)',
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px'
                }}>
                  {log.delta > 0 ? <ArrowUp size={24} /> : <ArrowDown size={24} />}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '700', fontSize: 'var(--font-size-base)' }}>{log.item_name}</span>
                    <span style={{
                      fontWeight: '800',
                      fontSize: 'var(--font-size-lg)',
                      color: log.delta > 0 ? 'var(--color-success)' : 'var(--color-danger)'
                    }}>
                      {log.delta > 0 ? '+' : ''}{log.delta}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'capitalize' }}>
                      <strong>Reason:</strong> {log.reason.replace('_', ' ')}
                    </span>
                    {log.notes && (
                      <span style={{ fontStyle: 'italic' }}>— "{log.notes}"</span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right', minWidth: '150px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <User size={12} /> {log.performer_name || 'System'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                    <Calendar size={12} /> {format(new Date(log.created_at), 'MMM d, h:mm a')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
