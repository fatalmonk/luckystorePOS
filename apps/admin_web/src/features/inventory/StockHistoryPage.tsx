import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { ErrorState, EmptyState, SkeletonBlock } from '../../components/PageState';
import { History, ArrowLeft, ArrowUp, ArrowDown, User, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export function StockHistoryPage() {
  const { storeId } = useAuth();

  const { data: history, isLoading, error } = useQuery({
    queryKey: ['inventory-history', storeId],
    queryFn: () => api.inventory.history(storeId),
  });

  if (error) {
    return (
      <div className="history-container">
        <PageHeader 
          title="Stock Movement History" 
          subtitle="Audit log of all manual and automated stock changes." 
        />
        <Card className="mt-6">
          <ErrorState message="Error loading stock history." />
        </Card>
      </div>
    );
  }

  return (
    <div className="history-container">
      <header className="mb-4">
        <Link to="/inventory">
          <Button variant="secondary" size="sm" icon={<ArrowLeft size={18} />} className="mb-4">
            Back to Inventory
          </Button>
        </Link>
      </header>
      
      <PageHeader 
        title="Stock Movement History" 
        subtitle="Audit log of all manual and automated stock changes." 
        className="mb-8"
      />

      <Card padding="none" className="overflow-hidden">
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
          <div className="divide-y divide-border-default">
            {history?.map((log: any) => (
              <div
                key={log.id}
                className="flex items-center gap-6 p-4 sm:p-6 transition-colors hover:bg-background-subtle"
              >
                <div className={log.delta > 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger' + ' p-3 rounded-md flex items-center justify-center w-12 h-12 flex-shrink-0'}>
                  {log.delta > 0 ? <ArrowUp size={24} /> : <ArrowDown size={24} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-1">
                    <span className="font-bold text-text-primary truncate">{log.item_name}</span>
                    <span className={'font-mono text-lg font-bold ' + (log.delta > 0 ? 'text-success' : 'text-danger')}>
                      {log.delta > 0 ? '+' : ''}{log.delta}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
                    <span className="flex items-center gap-1 capitalize">
                      <span className="font-semibold">Reason:</span> {log.reason.replace('_', ' ')}
                    </span>
                    {log.notes && (
                      <span className="italic truncate">— "{log.notes}"</span>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0 hidden sm:block">
                  <div className="flex items-center justify-end gap-1.5 text-xs text-text-muted mb-1">
                    <User size={12} /> {log.performer_name || 'System'}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 text-xs text-text-muted">
                    <Calendar size={12} /> {format(new Date(log.created_at), 'MMM d, h:mm a')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
