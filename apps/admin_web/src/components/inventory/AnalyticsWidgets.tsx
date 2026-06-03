import { TrendingDown, RefreshCw } from 'lucide-react';

interface TopSellingItem {
  name?: string;
  item_name?: string;
  product_name?: string;
  qty_sold?: number;
  quantity_sold?: number;
  total_sold?: number;
}

interface SlowMovingItem {
  name?: string;
  item_name?: string;
  product_name?: string;
  days_since_last_sale?: number;
  days?: number;
}

interface DailyTrend {
  date?: string;
  day?: string;
  total_qty?: number;
  qty?: number;
  movement?: number;
}

interface AnalyticsWidgetsProps {
  topSellingItems?: TopSellingItem[] | null;
  slowMovingItems?: SlowMovingItem[] | null;
  dailyTrend?: DailyTrend[] | null;
  topSellingLoading?: boolean;
  slowMovingLoading?: boolean;
  dailyTrendLoading?: boolean;
}

export function AnalyticsWidgets({
  topSellingItems,
  slowMovingItems,
  dailyTrend,
  topSellingLoading,
  slowMovingLoading,
  dailyTrendLoading,
}: AnalyticsWidgetsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {/* Top Selling Items */}
      <div className="rounded-lg border border-warm-border-warm bg-warm-surface p-3">
        <h4 className="text-xs font-semibold text-warm-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <TrendingDown size={12} className="text-warm-accent rotate-180" />
          Top Selling
        </h4>
        {topSellingLoading ? (
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-warm-dim" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-warm-dim" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-warm-dim" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-warm-dim" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-warm-dim" />
          </div>
        ) : topSellingItems && topSellingItems.length > 0 ? (
          <ul className="space-y-1">
            {topSellingItems.slice(0, 5).map((item: TopSellingItem, i: number) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="text-xs text-warm-fg truncate flex-1">
                  {item.name || item.item_name || item.product_name}
                </span>
                <span className="text-xs font-medium text-warm-accent whitespace-nowrap">
                  {item.qty_sold || item.quantity_sold || item.total_sold}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-warm-muted italic">No data yet</p>
        )}
      </div>

      {/* Slow Moving Items */}
      <div className="rounded-lg border border-warm-border-warm bg-warm-surface p-3">
        <h4 className="text-xs font-semibold text-warm-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <TrendingDown size={12} className="text-warm-accent" />
          Slow Moving
        </h4>
        {slowMovingLoading ? (
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-warm-dim" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-warm-dim" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-warm-dim" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-warm-dim" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-warm-dim" />
          </div>
        ) : slowMovingItems && slowMovingItems.length > 0 ? (
          <ul className="space-y-1">
            {slowMovingItems.slice(0, 5).map((item: SlowMovingItem, i: number) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="text-xs text-warm-fg truncate flex-1">
                  {item.name || item.item_name || item.product_name}
                </span>
                <span className="text-xs text-warm-muted whitespace-nowrap">
                  {item.days_since_last_sale ?? item.days ?? 0}d
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-warm-muted italic">No data yet</p>
        )}
      </div>

      {/* Daily Movement Trend */}
      <div className="rounded-lg border border-warm-border-warm bg-warm-surface p-3">
        <h4 className="text-xs font-semibold text-warm-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <RefreshCw size={12} className="text-warm-accent" />
          14-Day Movement
        </h4>
        {dailyTrendLoading ? (
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-warm-dim" />
            <div className="h-3 w-full animate-pulse rounded bg-warm-dim" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-warm-dim" />
          </div>
        ) : dailyTrend && dailyTrend.length > 0 ? (
          <div className="flex items-end gap-[3px] h-8">
            {dailyTrend.slice(-14).map((day: DailyTrend, i: number) => {
              const qty = day.total_qty ?? day.qty ?? day.movement ?? 0;
              const maxQty = Math.max(...dailyTrend.slice(-14).map((d: DailyTrend) => d.total_qty ?? d.qty ?? d.movement ?? 0), 1);
              const height = Math.max((qty / maxQty) * 100, 4);
              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-warm-accent/60 hover:bg-warm-accent transition-colors cursor-default"
                  style={{ height: `${height}%`, minHeight: '4px' }}
                  title={`${day.date || day.day || ''}: ${qty} units`}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-warm-muted italic">No data yet</p>
        )}
      </div>
    </div>
  );
}
