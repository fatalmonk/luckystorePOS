import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';

interface PriceHistoryMiniProps {
  productId: string;
  storeId: string;
}

export function PriceHistoryMini({ productId, storeId }: PriceHistoryMiniProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['price-history', productId],
    queryFn: () => api.inventory.getPriceHistory(storeId, productId),
    enabled: !!productId && !!storeId,
  });

  if (isLoading) return <p className="text-sm text-warm-muted animate-pulse">Loading...</p>;
  if (!history || history.length === 0) return <p className="text-sm text-warm-dim">No price changes recorded yet.</p>;

  const formatChange = (oldVal: number, newVal: number) => {
    if (!oldVal || !newVal) return { icon: Minus, color: 'text-warm-muted', label: '—' };
    const pct = ((newVal - oldVal) / oldVal) * 100;
    if (pct > 0) return { icon: TrendingUp, color: 'text-success-default', label: `+${pct.toFixed(1)}%` };
    if (pct < 0) return { icon: TrendingDown, color: 'text-danger-default', label: `${pct.toFixed(1)}%` };
    return { icon: Minus, color: 'text-warm-muted', label: '0%' };
  };

  return (
    <div className="space-y-2">
      {history.slice(0, 5).map((entry: any) => {
        const change = formatChange(entry.old_price, entry.new_price);
        const ChangeIcon = change.icon;
        return (
          <div key={entry.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <ChangeIcon size={14} className={`flex-shrink-0 ${change.color}`} />
              <span className="text-warm-fg font-medium tabular-nums">
                ৳{entry.old_price ?? '—'} → ৳{entry.new_price ?? '—'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-xs font-semibold ${change.color}`}>{change.label}</span>
              <span className="text-[10px] text-warm-dim">
                {entry.changed_at ? format(new Date(entry.changed_at), 'dd MMM') : ''}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
