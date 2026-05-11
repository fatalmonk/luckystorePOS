import React from 'react';
import { format } from 'date-fns';
import { ArrowUp, ArrowDown, User, Calendar, Tag, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { SkeletonBlock } from '../../components/PageState';
import { EmptyState } from '../../components/ui/EmptyState';
import { History } from 'lucide-react';

export type InventoryMovement = {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  movement_type: 'sale' | 'purchase' | 'adjustment' | 'return' | 'damage' | 'transfer' | 'manual' | 'sync_repair';
  quantity_delta: number;
  reference_type: string;
  reference_id: string | null;
  previous_quantity: number;
  new_quantity: number;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  performer_name: string;
};

type Props = {
  movements: InventoryMovement[] | undefined;
  isLoading: boolean;
};

export const InventoryMovementTimeline: React.FC<Props> = ({ movements, isLoading }) => {
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <SkeletonBlock className="w-12 h-12 rounded-md flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="w-1/3 h-5" />
              <SkeletonBlock className="w-1/4 h-4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!movements || movements.length === 0) {
    return (
      <EmptyState
        icon={<History size={48} />}
        title="No inventory movements yet"
        description="Audit logs of stock changes will appear here."
      />
    );
  }

  const formatMovementType = (type: string) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="divide-y divide-border-default">
      {movements.map((log) => {
        const isPositive = log.quantity_delta > 0;
        
        return (
          <div
            key={log.id}
            className="flex items-start gap-4 p-4 sm:p-6 transition-colors hover:bg-background-subtle"
          >
            {/* Icon Column */}
            <div className={clsx(
              'p-3 rounded-md flex items-center justify-center w-12 h-12 flex-shrink-0 mt-1',
              isPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
            )}>
              {isPositive ? <ArrowUp size={24} /> : <ArrowDown size={24} />}
            </div>

            {/* Content Column */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 gap-2">
                <div>
                  <h4 className="font-bold text-text-primary text-base flex items-center gap-2">
                    {log.product_name}
                    {log.product_sku && (
                      <span className="text-xs font-normal text-text-muted px-2 py-0.5 bg-background-main rounded">
                        {log.product_sku}
                      </span>
                    )}
                  </h4>
                  <div className="text-sm font-medium text-text-secondary mt-1 flex items-center gap-1.5">
                    <Tag size={14} className="text-text-muted" />
                    {formatMovementType(log.movement_type)}
                    {log.reference_id && (
                      <span className="text-text-muted text-xs bg-background-main px-1.5 rounded ml-1 font-mono">
                        #{log.reference_id.substring(0, 8)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-0 mt-1 sm:mt-0">
                  <span className={clsx(
                    'font-mono text-xl font-bold',
                    isPositive ? 'text-success' : 'text-danger'
                  )}>
                    {isPositive ? '+' : ''}{log.quantity_delta}
                  </span>
                  <div className="text-xs text-text-muted mt-1">
                    Result: <span className="font-bold text-text-main">{log.new_quantity}</span>
                  </div>
                </div>
              </div>

              {log.notes && (
                <div className="mt-3 text-sm text-text-muted flex items-start gap-1.5 bg-background-main/50 p-2 rounded border border-border-light">
                  <FileText size={14} className="mt-0.5 flex-shrink-0" />
                  <span className="italic">{log.notes}</span>
                </div>
              )}

              {/* Metadata Footer */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-muted mt-3">
                <div className="flex items-center gap-1.5">
                  <User size={12} /> 
                  <span className="font-medium">{log.performer_name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} /> 
                  <span>{format(new Date(log.created_at), 'MMM d, yyyy • h:mm a')}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
