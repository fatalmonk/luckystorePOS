import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../lib/AuthContext';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/layout/PageHeader';
import { MetricCard } from '../../components/data-display/MetricCard';
import { ErrorState, EmptyState, SkeletonBlock } from '../../components/PageState';
import { ShoppingCart, Calendar, ChevronDown, ChevronUp, Package, DollarSign, FileText } from 'lucide-react';
import { clsx } from 'clsx';

type DateFilter = 'today' | 'week' | 'month' | 'all';

export function PurchaseHistoryPage() {
  const { storeId } = useAuth();
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [expandedReceiptId, setExpandedReceiptId] = useState<string | null>(null);

  const { data: receipts, isLoading, error, refetch } = useQuery({
    queryKey: ['purchase-receipts', storeId, dateFilter],
    queryFn: () => {
      if (!storeId) return [];
      const filters: any = {};
      const today = new Date();

      if (dateFilter === 'today') {
        filters.startDate = today.toISOString().split('T')[0];
        filters.endDate = today.toISOString().split('T')[0];
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        filters.startDate = weekAgo.toISOString().split('T')[0];
        filters.endDate = today.toISOString().split('T')[0];
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        filters.startDate = monthAgo.toISOString().split('T')[0];
        filters.endDate = today.toISOString().split('T')[0];
      }

      return api.purchases.list(storeId, filters);
    },
    enabled: !!storeId,
  });

  const { data: stats } = useQuery({
    queryKey: ['purchase-stats', storeId],
    queryFn: () => {
      if (!storeId) return { totalPurchases: 0, totalValue: 0, pendingDrafts: 0 };
      return api.purchases.getStats(storeId);
    },
    enabled: !!storeId,
  });

  const filteredReceipts = useMemo(() => {
    if (!receipts) return [];
    return receipts;
  }, [receipts]);

  if (error) {
    return (
      <div className="p-6">
        <PageHeader title="Purchase History" subtitle="View all purchase receipts and orders." />
        <ErrorState message="Failed to load purchase history." onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Purchase History"
        subtitle="View all purchase receipts and orders."
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Purchases"
          value={stats?.totalPurchases?.toString() || '0'}
          icon={<ShoppingCart size={20} />}
          color="info"
          variant="solid"
        />
        <MetricCard
          title="Total Value"
          value={`৳${(stats?.totalValue || 0).toLocaleString()}`}
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
      <div className="flex gap-2">
        {(['today', 'week', 'month', 'all'] as DateFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => setDateFilter(filter)}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              dateFilter === filter
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {filter === 'today' && 'Today'}
            {filter === 'week' && 'This Week'}
            {filter === 'month' && 'This Month'}
            {filter === 'all' && 'All Time'}
          </button>
        ))}
      </div>

      {/* Receipts Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-border-color">
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
              filteredReceipts.map((receipt: any) => (
                <>
                  <tr
                    key={receipt.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedReceiptId(expandedReceiptId === receipt.id ? null : receipt.id)}
                  >
                    <td className="px-4 py-3 font-medium">{receipt.invoice_number || 'PO-' + receipt.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">{receipt.parties?.name || 'Unknown Supplier'}</td>
                    <td className="px-4 py-3 text-text-muted">{receipt.invoice_number || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">৳{(receipt.invoice_total || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">৳{(receipt.amount_paid || 0).toLocaleString()}</td>
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
                      {new Date(receipt.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="p-1 hover:bg-gray-100 rounded"
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
                      <td colSpan={8} className="px-4 py-4 bg-gray-50">
                        <div className="ml-8">
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
                              {receipt.purchase_receipt_items.map((item: any) => (
                                <tr key={item.id} className="border-t border-gray-200">
                                  <td className="py-2">{item.items?.name || 'Unknown Product'}</td>
                                  <td className="py-2 text-text-muted">{item.items?.sku || '-'}</td>
                                  <td className="py-2 text-right">{item.quantity}</td>
                                  <td className="py-2 text-right">৳{item.unit_cost}</td>
                                  <td className="py-2 text-right font-medium">
                                    ৳{(item.quantity * item.unit_cost).toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
