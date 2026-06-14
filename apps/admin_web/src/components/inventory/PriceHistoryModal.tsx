import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { X, TrendingUp, TrendingDown, History } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { formatCurrency } from '../../lib/format';

interface PriceHistoryModalProps {
  productId: string;
  storeId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface PriceChange {
  id: string;
  changed_at: string;
  old_price: number;
  new_price: number;
  old_mrp: number;
  new_mrp: number;
  changed_by: string;
}

export function PriceHistoryModal({ productId, storeId, productName, isOpen, onClose }: PriceHistoryModalProps) {
  const { data: history, isLoading } = useQuery<PriceChange[]>({
    queryKey: ['price-history', productId],
    queryFn: () => api.inventory.getPriceHistory(storeId, productId),
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const calculateChange = (oldVal: number, newVal: number) => {
    if (!oldVal || !newVal) return 0;
    return ((newVal - oldVal) / oldVal) * 100;
  };

  const formatPriceDisplay = (price: number) => {
    return formatCurrency(Math.round(price));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-surface-default rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History size={18} className="text-primary-default" />
            <div>
              <h3 className="font-semibold text-slate-900">Price History</h3>
              <p className="text-xs text-slate-500 truncate max-w-[200px]">{productName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary-default border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !history || history.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <History size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No price changes recorded yet</p>
              <p className="text-xs text-slate-400 mt-1">History will appear after price updates</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 text-[10px] uppercase text-slate-400 font-medium px-2">
                <div className="col-span-3">Date</div>
                <div className="col-span-3 text-right">Old </div>
                <div className="col-span-3 text-right">New</div>
                <div className="col-span-3 text-right">By</div>
              </div>

              {/* Price Changes */}
              <div className="space-y-1">
                {history.map((change, index) => {
                  const priceChange = calculateChange(change.old_price, change.new_price);
                  const hasChange = priceChange !== 0;

                  return (
                    <div
                      key={change.id + index}
                      className="grid grid-cols-12 gap-2 items-center py-2 px-2 rounded-md hover:bg-slate-50 transition-colors"
                    >
                      {/* Date */}
                      <div className="col-span-3 text-xs text-slate-600">
                        {format(new Date(change.changed_at), 'MMM d')}
                      </div>

                      {/* Old Price */}
                      <div className="col-span-3 text-xs text-slate-400 text-right tabular-nums">
                        {formatPriceDisplay(change.old_price)}
                      </div>

                      {/* New Price with Change Indicator */}
                      <div className="col-span-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-xs font-medium text-slate-900 tabular-nums">
                            {formatPriceDisplay(change.new_price)}
                          </span>
                          {hasChange && (
                            priceChange > 0 ? (
                              <TrendingUp size={12} className="text-success-default" />
                            ) : (
                              <TrendingDown size={12} className="text-danger-default" />
                            )
                          )}
                        </div>
                        {hasChange && (
                          <span className={clsx(
                            'text-[10px] tabular-nums',
                            priceChange > 0 ? 'text-success-default' : 'text-danger-default'
                          )}>
                            {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
                          </span>
                        )}
                      </div>

                      {/* Changed By */}
                      <div className="col-span-3 text-xs text-slate-500 text-right truncate">
                        {change.changed_by || 'System'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50 rounded-b-lg">
          <p className="text-xs text-slate-500">
            Last {history?.length || 0} changes shown
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
