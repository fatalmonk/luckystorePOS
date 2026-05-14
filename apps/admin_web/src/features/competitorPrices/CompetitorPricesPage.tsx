import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, Plus, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useNotify } from '../../components/NotificationContext';
import { DataTable, Column } from '../../components/data-display/DataTable';
import {
  fetchCompetitorPrices,
  fetchPriceAlerts,
  deleteCompetitorPrice,
} from '../../lib/api/domains/competitorPrices';
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

export function CompetitorPricesPage() {
  const { storeId } = useAuth();
  const { notify } = useNotify();
  const queryClient = useQueryClient();
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);

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

  const alertProductIds = new Set(alerts?.map((a: PriceAlert) => a.product_id) || []);

  const filteredPrices = showAlertsOnly
    ? prices?.filter((p: CompetitorPrice) => alertProductIds.has(p.item_id))
    : prices;

  const columns: Column<CompetitorPrice>[] = [
    {
      header: 'Product',
      accessor: (row: CompetitorPrice) => (
        <div className="competitor-product-cell">
          <span className="font-medium">{row.item_name || 'Unknown'}</span>
          {row.sku && <span className="text-muted text-xs">{row.sku}</span>}
          {alertProductIds.has(row.item_id) && (
            <span className="alert-badge">
              <AlertTriangle size={12} />
              Price Alert
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Competitor',
      accessor: (row: CompetitorPrice) => (
        <span className="font-medium">{row.competitor_name}</span>
      ),
    },
    {
      header: 'Their Price',
      accessor: (row: CompetitorPrice) => (
        <span className="font-mono font-medium">
          {formatCurrency(row.competitor_price)}
        </span>
      ),
    },
    {
      header: 'Last Updated',
      accessor: (row: CompetitorPrice) => formatDateTime(row.scraped_at),
    },
    {
      header: '',
      accessor: (row: CompetitorPrice) => (
        <div className="flex gap-2 justify-end">
          {row.competitor_url && (
            <a
              href={row.competitor_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-icon"
              title="View competitor page"
            >
              <ExternalLink size={16} />
            </a>
          )}
          <button
            onClick={() => deleteMutation.mutate(row.id)}
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
              <div key={alert.product_id} className="alert-item">
                <div className="alert-product">
                  <TrendingUp className="text-danger" size={16} />
                  <span className="font-medium">{alert.product_name}</span>
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
        <button className="btn btn-primary">
          <Plus size={16} />
          Add Price
        </button>
      </div>

      {/* Prices Table */}
      <DataTable
        data={filteredPrices || []}
        columns={columns}
        emptyMessage="No competitor prices recorded yet"
      />
    </div>
  );
}
