import { Fragment, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/AuthContext';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '@/components';
import { MetricCard } from '@/components';
import { ErrorState, EmptyState, SkeletonBlock } from '@/components';
import { ShoppingCart, ChevronDown, ChevronUp, Package, DollarSign, FileText, ExternalLink, Search, SlidersHorizontal, X } from 'lucide-react';
import { clsx } from 'clsx';
import { formatCurrency } from '../../lib/format';
import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { toGoogleDriveDownloadUrl } from './receiptOcr';

type DateFilter = 'today' | 'week' | 'month' | 'all' | 'custom';

interface PurchaseReceipt {
  id: string;
  invoice_number: string | null;
  invoice_total: number | null;
  amount_paid: number | null;
  status: string;
  created_at: string;
  notes: string | null;
  supplier_id?: string | null;
  parties?: {
    name: string;
  };
  purchase_receipt_items?: {
    id: string;
    quantity: number;
    unit_cost: number;
    items?: {
      name: string;
      sku: string | null;
      category_id?: string | null;
    };
  }[];
}

function getReceiptMetadata(notes: string | null) {
  const invoiceDate = notes?.match(/(?:^|\n)Invoice Date:\s*(\d{4}-\d{2}-\d{2})/)?.[1] || null;
  const imageUrl = notes?.match(/(?:^|\n)Receipt Image:\s*(https:\/\/\S+)/)?.[1] || null;
  return { invoiceDate, imageUrl };
}

function formatReceiptDate(invoiceDate: string | null, createdAt: string) {
  if (invoiceDate) {
    const [year, month, day] = invoiceDate.split('-');
    return `${day}/${month}/${year}`;
  }
  return new Date(createdAt).toLocaleDateString();
}

export function PurchaseHistoryPage() {
  const { storeId, tenantId } = useAuth();
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [supplierId, setSupplierId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [expandedReceiptId, setExpandedReceiptId] = useState<string | null>(null);

  const { data: suppliers = [] } = useQuery({
    queryKey: ['purchase-history-suppliers', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parties')
        .select('id, name')
        .eq('type', 'supplier')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['purchase-history-categories', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: receipts, isLoading, error, refetch } = useQuery({
    queryKey: ['purchase-receipts', storeId, supplierId, status],
    queryFn: () => {
      if (!storeId) return [];
      return api.purchases.list(storeId, { supplierId: supplierId || undefined, status: status || undefined }) as Promise<PurchaseReceipt[]>;
    },
    enabled: !!storeId,
  });

  const filteredReceipts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const today = new Date();
    let rangeStart: Date | null = null;
    let rangeEnd: Date | null = null;

    if (dateFilter === 'today') {
      rangeStart = startOfDay(today);
      rangeEnd = endOfDay(today);
    } else if (dateFilter === 'week') {
      rangeStart = startOfWeek(today);
      rangeEnd = endOfWeek(today);
    } else if (dateFilter === 'month') {
      rangeStart = startOfMonth(today);
      rangeEnd = endOfMonth(today);
    } else if (dateFilter === 'custom' && selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      rangeStart = new Date(year, month - 1, 1);
      rangeEnd = endOfMonth(rangeStart);
    } else if (dateFilter === 'custom') {
      if (customStartDate) rangeStart = startOfDay(new Date(`${customStartDate}T00:00:00`));
      if (customEndDate) rangeEnd = endOfDay(new Date(`${customEndDate}T00:00:00`));
    }

    return (receipts || []).filter((receipt) => {
      const metadata = getReceiptMetadata(receipt.notes);
      const receiptDate = metadata.invoiceDate
        ? new Date(`${metadata.invoiceDate}T00:00:00`)
        : new Date(receipt.created_at);
      if (rangeStart && receiptDate < rangeStart) return false;
      if (rangeEnd && receiptDate > rangeEnd) return false;
      if (categoryId && !receipt.purchase_receipt_items?.some((item) => item.items?.category_id === categoryId)) return false;
      if (normalizedSearch && ![receipt.invoice_number, receipt.parties?.name].some((value) => value?.toLowerCase().includes(normalizedSearch))) return false;
      return true;
    });
  }, [categoryId, customEndDate, customStartDate, dateFilter, receipts, searchTerm, selectedMonth]);

  const stats = useMemo(() => ({
    totalPurchases: filteredReceipts.length,
    totalValue: filteredReceipts.reduce((sum, receipt) => sum + (receipt.invoice_total || 0), 0),
    pendingDrafts: filteredReceipts.filter((receipt) => receipt.status === 'draft').length,
  }), [filteredReceipts]);

  const clearFilters = () => {
    setDateFilter('month');
    setSupplierId('');
    setCategoryId('');
    setStatus('');
    setSearchTerm('');
    setSelectedMonth('');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const hasActiveFilters = Boolean(supplierId || categoryId || status || searchTerm || selectedMonth || customStartDate || customEndDate || dateFilter !== 'month');

  if (error) {
    return (
      <div className="p-6">
        <PageHeader title="Purchase History" subtitle="View all purchase receipts and orders." />
        <ErrorState message="Failed to load purchase history." onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="app-warm mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Purchase History"
        subtitle="View all purchase receipts and orders."
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          title="Total Purchases"
          value={stats?.totalPurchases?.toString() || '0'}
          icon={<ShoppingCart size={20} />}
          color="info"
          variant="solid"
        />
        <MetricCard
          title="Total Value"
          value={formatCurrency(stats?.totalValue || 0)}
          icon={<DollarSign size={20} />}
          color="success"
          variant="solid"
        />
        <MetricCard
          title="Pending Drafts"
          value={stats?.pendingDrafts?.toString() || '0'}
          icon={<FileText size={20} />}
          color="warning"
          variant="solid"
        />
      </div>

      {/* Date Filter */}
      <section className="card space-y-4 p-4" aria-labelledby="purchase-history-filters">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-main">
          <SlidersHorizontal size={16} strokeWidth={2} aria-hidden="true" />
          <h2 id="purchase-history-filters">Filters</h2>
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className="ml-auto inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.96]">
              <X size={14} /> Clear filters
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
        {(['today', 'week', 'month', 'all'] as DateFilter[]).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setDateFilter(filter)}
            aria-pressed={dateFilter === filter}
            className={clsx(
              'min-h-10 rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.96]',
              dateFilter === filter
                ? 'bg-primary text-black shadow-sm'
                : 'bg-[var(--bg-input)] text-text-muted hover:bg-[var(--color-surface-hover)] hover:text-text-main'
            )}
          >
            {filter === 'today' && 'Today'}
            {filter === 'week' && 'This Week'}
            {filter === 'month' && 'This Month'}
            {filter === 'all' && 'All Time'}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setDateFilter('custom')}
          aria-pressed={dateFilter === 'custom'}
          className={clsx('min-h-10 rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.96]', dateFilter === 'custom' ? 'bg-primary text-black shadow-sm' : 'bg-[var(--bg-input)] text-text-muted hover:bg-[var(--color-surface-hover)] hover:text-text-main')}
        >Custom</button>
        </div>
        {dateFilter === 'custom' && (
          <div className="grid grid-cols-1 items-end gap-3 rounded-lg bg-[var(--bg-input)] p-3 sm:grid-cols-[1fr_auto_1fr_1fr]">
            <label className="text-xs font-medium text-text-muted">Month
              <input type="month" value={selectedMonth} onChange={(event) => { setSelectedMonth(event.target.value); setCustomStartDate(''); setCustomEndDate(''); }} className="input mt-1 block w-full text-sm" />
            </label>
            <span className="pb-3 text-center text-xs text-text-muted">or</span>
            <label className="text-xs font-medium text-text-muted">From
              <input type="date" value={customStartDate} onChange={(event) => { setCustomStartDate(event.target.value); setSelectedMonth(''); }} className="input mt-1 block w-full text-sm" />
            </label>
            <label className="text-xs font-medium text-text-muted">To
              <input type="date" value={customEndDate} onChange={(event) => { setCustomEndDate(event.target.value); setSelectedMonth(''); }} className="input mt-1 block w-full text-sm" />
            </label>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-text-muted">Supplier
            <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="input mt-1 block w-full text-sm">
              <option value="">All suppliers</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-text-muted">Category
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="input mt-1 block w-full text-sm">
              <option value="">All categories</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-text-muted">Status
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="input mt-1 block w-full text-sm">
              <option value="">All statuses</option>
              <option value="posted">Posted</option>
              <option value="draft">Draft</option>
            </select>
          </label>
          <label className="text-xs font-medium text-text-muted">Search invoice or supplier
            <span className="relative mt-1 block">
              <Search size={15} strokeWidth={1.5} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search..." className="input w-full pl-9 text-sm" />
            </span>
          </label>
        </div>
      </section>

      {/* Receipts Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead className="border-b border-border-color bg-[var(--color-surface-hover)]">
            <tr className="text-left text-sm text-text-muted">
              <th className="px-4 py-3 font-medium">PO Number</th>
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 font-medium">Invoice #</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium text-right">Paid</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-color">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><SkeletonBlock className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><SkeletonBlock className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><SkeletonBlock className="h-4 w-20" /></td>
                  <td className="px-4 py-3"><SkeletonBlock className="h-4 w-16" /></td>
                  <td className="px-4 py-3"><SkeletonBlock className="h-4 w-16" /></td>
                  <td className="px-4 py-3"><SkeletonBlock className="h-4 w-16" /></td>
                  <td className="px-4 py-3"><SkeletonBlock className="h-4 w-20" /></td>
                </tr>
              ))
            ) : filteredReceipts.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12">
                  <EmptyState
                    icon={<Package size={48} />}
                    title="No purchase receipts"
                    description="No purchase receipts found for the selected date range."
                  />
                </td>
              </tr>
            ) : (
              filteredReceipts.map((receipt: PurchaseReceipt) => {
                const metadata = getReceiptMetadata(receipt.notes);
                const imageSrc = metadata.imageUrl ? toGoogleDriveDownloadUrl(metadata.imageUrl) : null;
                const displayDate = formatReceiptDate(metadata.invoiceDate, receipt.created_at);
                return (
                  <Fragment key={receipt.id}>
                  <tr
                    tabIndex={0}
                    aria-expanded={expandedReceiptId === receipt.id}
                    className="cursor-pointer transition-colors hover:bg-[var(--color-surface-hover)] focus-visible:bg-[var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                    onClick={() => setExpandedReceiptId(expandedReceiptId === receipt.id ? null : receipt.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setExpandedReceiptId(expandedReceiptId === receipt.id ? null : receipt.id);
                      }
                    }}
                  >
                    <td className="px-4 py-3 font-medium">{receipt.invoice_number || 'PO-' + receipt.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">{receipt.parties?.name || 'Unknown Supplier'}</td>
                    <td className="px-4 py-3 text-text-muted">{receipt.invoice_number || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{formatCurrency(receipt.invoice_total || 0)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(receipt.amount_paid || 0)}</td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        receipt.status === 'posted'
                          ? 'bg-green-100 text-green-800'
                          : receipt.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      )}>
                        {receipt.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted text-sm">
                      {displayDate}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        aria-label={expandedReceiptId === receipt.id ? `Collapse receipt ${receipt.invoice_number || receipt.id}` : `Expand receipt ${receipt.invoice_number || receipt.id}`}
                        className="inline-flex size-10 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-[var(--bg-input)] hover:text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.96]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedReceiptId(expandedReceiptId === receipt.id ? null : receipt.id);
                        }}
                      >
                        {expandedReceiptId === receipt.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </td>
                  </tr>
                  {expandedReceiptId === receipt.id && receipt.purchase_receipt_items && (
                    <tr>
                      <td colSpan={8} className="bg-[var(--color-surface-hover)] px-4 py-4">
                        <div className="ml-8">
                          {imageSrc && (
                            <div className="mb-4">
                              <a
                                href={getReceiptMetadata(receipt.notes).imageUrl!}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                              >
                                <ExternalLink size={14} /> View receipt image
                              </a>
                              <img
                                src={imageSrc}
                                alt={`Receipt ${receipt.invoice_number || receipt.id}`}
                                className="mt-2 max-h-80 max-w-full rounded-lg object-contain outline outline-1 outline-black/10"
                              />
                            </div>
                          )}
                          <h4 className="font-medium mb-2 text-sm text-text-muted">Receipt Items:</h4>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-text-muted">
                                <th className="pb-2 font-medium">Product</th>
                                <th className="pb-2 font-medium">SKU</th>
                                <th className="pb-2 font-medium text-right">Qty</th>
                                <th className="pb-2 font-medium text-right">Unit Cost</th>
                                <th className="pb-2 font-medium text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {receipt.purchase_receipt_items?.map((item) => (
                                <tr key={item.id} className="border-t border-border-color">
                                  <td className="py-2">{item.items?.name || 'Unknown Product'}</td>
                                  <td className="py-2 text-text-muted">{item.items?.sku || '-'}</td>
                                  <td className="py-2 text-right tabular-nums">{item.quantity}</td>
                                  <td className="py-2 text-right tabular-nums">৳{item.unit_cost}</td>
                                  <td className="py-2 text-right font-medium tabular-nums">{formatCurrency(item.quantity * item.unit_cost)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
