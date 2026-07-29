import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, Plus, ExternalLink, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown, Search, CheckCircle2, HelpCircle, Building2, Store } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useNotify } from '@/components';
import { DataTable, Column } from '@/components';
import {
  fetchCompetitorPrices,
  fetchPriceAlerts,
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

type ViewTab = 'all' | 'matched' | 'unmatched' | 'alerts' | 'overrides';

export function CompetitorPricesPage() {
  const { storeId } = useAuth();
  const { notify } = useNotify();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ViewTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: prices, isLoading: pricesLoading } = useQuery({
    queryKey: ['competitorPrices', storeId, activeTab],
    queryFn: () =>
      fetchCompetitorPrices(storeId!, {
        matchedOnly: activeTab === 'matched',
        unmatchedOnly: activeTab === 'unmatched',
      }),
    enabled: !!storeId,
  });


  const { data: alerts } = useQuery({
    queryKey: ['priceAlerts', storeId],
    queryFn: () => fetchPriceAlerts(storeId!),
    enabled: !!storeId,
  });

  const clearOverrideMutation = useMutation({
    mutationFn: ({ itemId, competitorKey }: { itemId: string; competitorKey: string }) =>
      clearManualCompetitorPrice(storeId!, itemId, competitorKey),
    onSuccess: (_cleared, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['competitorPrices', 'effective', storeId, variables.itemId],
      });
      queryClient.invalidateQueries({ queryKey: ['competitorPrices'] });
      notify('Manual override cleared', 'success');
    },
    onError: () => notify('Failed to clear override', 'error'),
  });

  const alertItemIds = useMemo(() => new Set(alerts?.map((a: PriceAlert) => a.item_id) || []), [alerts]);

  // Unique list of competitors for dropdown filter
  const competitorOptions = useMemo(() => {
    if (!prices) return [];
    const set = new Set<string>();
    prices.forEach((p) => {
      if (p.competitor_name) set.add(p.competitor_name);
    });
    return Array.from(set).sort();
  }, [prices]);

  // Key metrics
  const metrics = useMemo(() => {
    if (!prices) return { total: 0, matched: 0, unmatched: 0, overrides: 0 };
    let matched = 0;
    let unmatched = 0;
    let overrides = 0;
    prices.forEach((p) => {
      if (p.our_price != null || p.item_id != null) matched++;
      else unmatched++;
      if (p.is_override_active || p.source === 'manual') overrides++;
    });
    return { total: prices.length, matched, unmatched, overrides };
  }, [prices]);

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

  // Filter & Search
  const filteredPrices = useMemo(() => {
    if (!prices) return [];
    return prices.filter((p: CompetitorPrice) => {
      // Tab filter
      if (activeTab === 'matched' && p.our_price == null && p.item_id == null) return false;
      if (activeTab === 'unmatched' && (p.our_price != null || p.item_id != null)) return false;
      if (activeTab === 'alerts' && !alertItemIds.has(p.item_id)) return false;
      if (activeTab === 'overrides' && !p.is_override_active && p.source !== 'manual') return false;

      // Competitor dropdown filter
      if (selectedCompetitor !== 'all' && p.competitor_name !== selectedCompetitor) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (p.item_name || '').toLowerCase().includes(q);
        const prodMatch = (p.product_name || '').toLowerCase().includes(q);
        const skuMatch = (p.sku || '').toLowerCase().includes(q);
        const compMatch = (p.competitor_name || '').toLowerCase().includes(q);
        if (!nameMatch && !prodMatch && !skuMatch && !compMatch) return false;
      }

      return true;
    });
  }, [prices, activeTab, searchQuery, selectedCompetitor, alertItemIds]);

  // Sort the filtered data
  const sortedPrices = useMemo(() => {
    return [...filteredPrices].sort((a, b) => {
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
      className="inline-flex items-center hover:text-warm-foreground transition-colors font-semibold"
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
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium">{row.item_name || 'Unknown'}</span>
            {row.item_id ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Matched
              </span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                Unmatched
              </span>
            )}
          </div>
          {row.sku && <span className="text-muted text-xs block">{row.sku}</span>}
          {alertItemIds.has(row.item_id) && (
            <span className="alert-badge inline-flex items-center gap-1 text-xs text-amber-500 mt-1">
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
          {row.is_override_active && (
            <span className="text-[10px] text-warm-accent">Override</span>
          )}
        </div>
      ),
    },
    {
      header: sortableHeader('Our Price', 'our_price'),
      accessor: (row: CompetitorPrice) => (
        <span className="font-mono font-semibold">
          {row.our_price != null ? formatCurrency(row.our_price) : <span className="text-warm-muted font-normal text-xs">—</span>}
        </span>
      ),
    },
    {
      header: sortableHeader('Their Price', 'competitor_price'),
      accessor: (row: CompetitorPrice) => (
        <span className="font-mono font-semibold">
          {formatCurrency(row.competitor_price)}
        </span>
      ),
    },
    {
      header: sortableHeader('Gap', 'price_gap_percent'),
      accessor: (row: CompetitorPrice) => {
        if (row.price_gap_percent == null) return <span className="text-warm-muted text-xs">—</span>;
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
        <div className="flex flex-col text-xs">
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
          {row.is_override_active && row.item_id && (
            <button
              onClick={() => clearOverrideMutation.mutate({ itemId: row.item_id, competitorKey: row.competitor_key })}
              disabled={clearOverrideMutation.isPending}
              className="btn-icon text-warm-accent"
              title="Clear manual override"
            >
              <TrendingUp size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (pricesLoading) {
    return (
      <div className="competitor-prices-page p-6">
        <div className="loading-state">Loading competitor prices...</div>
      </div>
    );
  }

  return (
    <div className="competitor-prices-page p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Competitor Price Monitoring</h1>
          <p className="text-sm text-warm-muted">Track market pricing, analyze price gaps, and manage overrides</p>
        </div>
        <button className="btn btn-primary inline-flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          Add Price Override
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-warm-border bg-warm-surface/40 flex flex-col">
          <span className="text-xs text-warm-muted font-medium">Scraped Observations</span>
          <span className="text-2xl font-bold font-mono mt-1">{metrics.total.toLocaleString()}</span>
        </div>
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Matched Items (With Our Price)</span>
          <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{metrics.matched.toLocaleString()}</span>
        </div>
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col">
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Unmatched Scrapes</span>
          <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">{metrics.unmatched.toLocaleString()}</span>
        </div>
        <div className="p-4 rounded-xl border border-warm-border bg-warm-surface/40 flex flex-col">
          <span className="text-xs text-warm-muted font-medium">Price Alerts</span>
          <span className="text-2xl font-bold font-mono text-warm-warning mt-1">{alerts?.length || 0}</span>
        </div>
      </div>

      {/* Alerts Summary Banner */}
      {alerts && alerts.length > 0 && (
        <div className="alerts-summary p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-3">
          <div className="alert-header flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400">
            <AlertTriangle size={18} />
            <h3>{alerts.length} Price Alert{alerts.length !== 1 ? 's' : ''} Triggered</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {alerts.slice(0, 3).map((alert: PriceAlert) => (
              <div key={alert.item_id} className="alert-item p-3 rounded-lg border border-amber-500/20 bg-warm-paper flex flex-col justify-between">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <TrendingUp className="text-rose-500 shrink-0" size={16} />
                  <span className="truncate">{alert.item_name}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-warm-border">
                  <div>
                    <span className="text-warm-muted">Our: </span>
                    <span className="font-mono font-semibold">{formatCurrency(alert.our_price)}</span>
                  </div>
                  <div>
                    <span className="text-warm-muted">Market: </span>
                    <span className="font-mono font-semibold">{formatCurrency(alert.market_avg_price)}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">
                    +{Math.round(alert.price_gap_percent * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Controls: Tabs, Search & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-warm-border">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-warm-foreground text-warm-paper font-semibold'
                : 'hover:bg-warm-surface text-warm-muted'
            }`}
          >
            All Observations ({metrics.total})
          </button>
          <button
            onClick={() => setActiveTab('matched')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'matched'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'hover:bg-warm-surface text-emerald-600 dark:text-emerald-400'
            }`}
          >
            <CheckCircle2 size={13} />
            Matched Only ({metrics.matched})
          </button>
          <button
            onClick={() => setActiveTab('unmatched')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'unmatched'
                ? 'bg-amber-600 text-white font-semibold'
                : 'hover:bg-warm-surface text-amber-600 dark:text-amber-400'
            }`}
          >
            <HelpCircle size={13} />
            Unmatched Scrapes ({metrics.unmatched})
          </button>
          {alerts && alerts.length > 0 && (
            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'alerts'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'hover:bg-warm-surface text-rose-600 dark:text-rose-400'
              }`}
            >
              <AlertTriangle size={13} />
              Alerts ({alerts.length})
            </button>
          )}
        </div>

        {/* Search & Competitor Filter */}
        <div className="flex items-center gap-3">
          {competitorOptions.length > 0 && (
            <select
              value={selectedCompetitor}
              onChange={(e) => setSelectedCompetitor(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-warm-border bg-warm-paper text-warm-foreground focus:outline-none"
            >
              <option value="all">All Competitors</option>
              {competitorOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-warm-muted" />
            <input
              type="text"
              placeholder="Search product, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-warm-border bg-warm-paper text-warm-foreground focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Prices Table */}
      <DataTable
        data={sortedPrices}
        columns={columns}
        emptyMessage={
          activeTab === 'matched'
            ? 'No matched competitor prices found. Run the matching pipeline to link scraped items.'
            : 'No competitor prices found.'
        }
      />

      {/* Add Price Modal */}
      <AddPriceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

