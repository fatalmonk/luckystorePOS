import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, Plus, Trash2, ExternalLink, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useNotify } from '@/components';
import { DataTable, Column } from '@/components';
import {
  fetchCompetitorPrices,
  fetchPriceAlerts,
  deleteCompetitorPrice,
  clearManualCompetitorPrice,
} from '../../lib/api/domains/competitorPrices';
import { AddPriceModal } from './AddPriceModal';
import type { CompetitorPrice, PriceAlert } from '../../lib/api/types';
import { formatCurrency } from '../../lib/format';
import './competitorPrices.css';

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-BD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  success: { label: 'OK', color: 'text-warm-success' },
  error: { label: 'Error', color: 'text-warm-danger' },
  not_found: { label: '404', color: 'text-warm-warning' },
};

export function CompetitorPricesPage() {
  const { storeId } = useAuth();
  const { notify } = useNotify();
  const queryClient = useQueryClient();
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: prices, isLoading: pricesLoading } = useQuery({
    queryKey: ['competitorPrices', storeId],
    queryFn: () => fetchCompetitorPrices(storeId!),
    enabled: !!storeId,
  });

  const { data: alerts } = useQuery({
    queryKey: ['priceAlerts', storeId],
    queryFn: () => fetchPriceAlerts(storeId!),
    enabled: !!storeId,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCompetitorPrice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitorPrices'] });
      notify('Competitor price deleted', 'success');
    },
    onError: () => notify('Failed to delete', 'error'),
  });

  const clearOverrideMutation = useMutation({
    mutationFn: ({ itemId, competitorKey }: { itemId: string; competitorKey: string }) =>
      clearManualCompetitorPrice(storeId!, itemId, competitorKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitorPrices'] });
      notify('Manual override cleared', 'success');
    },
    onError: () => notify('Failed to clear override', 'error'),
  });

  const alertItemIds = new Set(alerts?.map((a: PriceAlert) => a.item_id) || []);

  // Sorting state
  type SortKey = 'item_name' | 'competitor_name' | 'our_price' | 'competitor_price' | 'price_gap_percent' | 'scraped_at' | 'source';
  type SortDir = 'asc' | 'desc';
  const [sortKey, setSortKey] = useState<SortKey>('scraped_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filteredPrices = showAlertsOnly
    ? prices?.filter((p: CompetitorPrice) => alertItemIds.has(p.item_id))
    : prices;

  // Sort the filtered data
  const sortedPrices = useMemo(() => {
    if (!filteredPrices) return [];
    const sorted = [...filteredPrices].sort((a, b) => {
      let aVal: string | number | null;
      let bVal: string | number | null;
      switch (sortKey) {
        case 'item_name':
          aVal = a.item_name ?? '';
          bVal = b.item_name ?? '';
          break;
        case 'competitor_name':
          aVal = a.competitor_name;
          bVal = b.competitor_name;
          break;
        case 'our_price':
          aVal = a.our_price ?? -1;
          bVal = b.our_price ?? -1;
          break;
        case 'competitor_price':
          aVal = a.competitor_price;
          bVal = b.competitor_price;
          break;
        case 'price_gap_percent':
          aVal = a.price_gap_percent ?? -Infinity;
          bVal = b.price_gap_percent ?? -Infinity;
          break;
        case 'scraped_at':
          aVal = new Date(a.scraped_at).getTime();
          bVal = new Date(b.scraped_at).getTime();
          break;
        case 'source':
          aVal = a.source ?? '';
          bVal = b.source ?? '';
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredPrices, sortKey, sortDir]);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown size={12} className="opacity-30 inline ml-1" />;
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="inline ml-1" />
      : <ArrowDown size={12} className="inline ml-1" />;
  };

  const sortableHeader = (label: string, key: SortKey) => (
    <button
      onClick={() => toggleSort(key)}
      className="inline-flex items-center hover:text-warm-foreground transition-colors"
    >
      {label}
      <SortIcon column={key} />
    </button>
  );

  const columns: Column<CompetitorPrice>[] = [
    {
      header: sortableHeader('Product', 'item_name'),
      accessor: (row: CompetitorPrice) => (
        <div className="competitor-product-cell">
          <span className="font-medium">{row.item_name || 'Unknown'}</span>
          {row.sku && <span className="text-muted text-xs">{row.sku}</span>}
          {alertItemIds.has(row.item_id) && (
            <span className="alert-badge">
              <AlertTriangle size={12} />
              Price Alert
            </span>
          )}
        </div>
      ),
    },
    {
      header: sortableHeader('Competitor', 'competitor_name'),
      accessor: (row: CompetitorPrice) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.competitor_name}</span>
          <span className="text-[10px] text-warm-muted">{row.competitor_key}</span>
        </div>
      ),
    },
    {
      header: 'Source',
      accessor: (row: CompetitorPrice) => (
        <div className="flex flex-col items-start">
          <span className={`text-xs font-medium ${row.source === 'manual' ? 'text-warm-accent' : 'text-warm-muted'}`}>
            {row.source}
          </span>
          {row.is_manual_override && (
            <span className="text-[10px] text-warm-accent">Override</span>
          )}
        </div>
      ),
    },
    {
      header: sortableHeader('Our Price', 'our_price'),
      accessor: (row: CompetitorPrice) => (
        <span className="font-mono font-medium">
          {row.our_price ? formatCurrency(row.our_price) : '—'}
        </span>
      ),
    },
    {
      header: sortableHeader('Their Price', 'competitor_price'),
      accessor: (row: CompetitorPrice) => (
        <span className="font-mono font-medium">
          {formatCurrency(row.competitor_price)}
        </span>
      ),
    },
    {
      header: sortableHeader('Gap', 'price_gap_percent'),
      accessor: (row: CompetitorPrice) => {
        if (row.price_gap_percent == null) return <span className="text-muted">—</span>;
        const pct = Math.round(row.price_gap_percent * 100);
        const isHigher = pct > 0;
        const isLower = pct < 0;
        return (
          <span className={`font-mono font-medium ${isHigher ? 'text-danger' : isLower ? 'text-success' : 'text-muted'}`}>
            {isHigher ? '+' : ''}{pct}%
          </span>
        );
      },
    },
    {
      header: sortableHeader('Last Updated', 'scraped_at'),
      accessor: (row: CompetitorPrice) => (
        <div className="flex flex-col">
          <span>{formatDateTime(row.scraped_at)}</span>
          {row.scrape_status && row.scrape_status !== 'success' && (
            <span className={`text-[10px] ${STATUS_BADGE[row.scrape_status]?.color ?? 'text-warm-muted'}`}>
              {STATUS_BADGE[row.scrape_status]?.label ?? row.scrape_status}
            </span>
          )}
        </div>
      ),
    },
    {
      header: '',
      accessor: (row: CompetitorPrice) => (
        <div className="flex gap-2 justify-end">
          {row.competitor_product_url && (
            <a
              href={row.competitor_product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-icon"
              title="View competitor page"
            >
              <ExternalLink size={16} />
            </a>
          )}
          {row.is_manual_override && (
            <button
              onClick={() => clearOverrideMutation.mutate({ itemId: row.item_id, competitorKey: row.competitor_key })}
              disabled={clearOverrideMutation.isPending}
              className="btn-icon text-warm-accent"
              title="Clear manual override"
            >
              <TrendingUp size={16} />
            </button>
          )}
          <button
            onClick={() => deleteMutation.mutate(row.id)}
            disabled={deleteMutation.isPending}
            className="btn-icon btn-danger"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  if (pricesLoading) {
    return (
      <div className="competitor-prices-page">
        <div className="loading-state">Loading competitor prices...</div>
      </div>
    );
  }

  return (
    <div className="competitor-prices-page">
      <div className="page-header">
        <h1>Competitor Price Monitoring</h1>
        <p className="text-muted">Track competitor pricing and receive alerts when market shifts</p>
      </div>

      {/* Alerts Summary */}
      {alerts && alerts.length > 0 && (
        <div className="alerts-summary">
          <div className="alert-header">
            <AlertTriangle className="text-warning" size={20} />
            <h3>{alerts.length} Price Alert{alerts.length !== 1 ? 's' : ''}</h3>
          </div>
          <div className="alerts-list">
            {alerts.slice(0, 3).map((alert: PriceAlert) => (
              <div key={alert.item_id} className="alert-item">
                <div className="alert-product">
                  <TrendingUp className="text-danger" size={16} />
                  <span className="font-medium">{alert.item_name}</span>
                </div>
                <div className="alert-details">
                  <span className="text-muted">Our price:</span>
                  <span className="font-mono">{formatCurrency(alert.our_price)}</span>
                  <span className="text-muted">Market avg:</span>
                  <span className="font-mono">{formatCurrency(alert.market_avg_price)}</span>
                  <span className="gap-badge gap-high">
                    +{Math.round(alert.price_gap_percent * 100)}%
                  </span>
                </div>
              </div>
            ))}
            {alerts.length > 3 && (
              <div className="alert-more">
                +{alerts.length - 3} more alerts
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={showAlertsOnly}
            onChange={(e) => setShowAlertsOnly(e.target.checked)}
          />
          <span>Show alerts only</span>
        </label>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          Add Price
        </button>
      </div>

      {/* Prices Table */}
      <DataTable
        data={sortedPrices}
        columns={columns}
        emptyMessage="No competitor prices recorded yet"
      />

      {/* Add Price Modal */}
      <AddPriceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}