import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { ErrorState, EmptyState, SkeletonBlock } from '../../components/PageState';
import { PageHeader } from '../../components/layout/PageHeader';
import { Search, XCircle, ChevronRight, Receipt, CreditCard, X, Download, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, subDays } from 'date-fns';
import { useNotify } from '../../components/Notification';
import { useDebounce } from '../../hooks/useDebounce';

const ROW_HEIGHT = 56;
const VISIBLE_ROWS = 15;

type DateRange = 'today' | 'week' | 'month' | 'custom';

function getDateRange(range: DateRange, customStart?: string, customEnd?: string): { startDate: string; endDate: string } {
  const now = new Date();
  switch (range) {
    case 'today':
      return { startDate: startOfDay(now).toISOString(), endDate: endOfDay(now).toISOString() };
    case 'week':
      return { startDate: startOfWeek(now, { weekStartsOn: 6 }).toISOString(), endDate: endOfWeek(now, { weekStartsOn: 6 }).toISOString() };
    case 'month':
      return { startDate: startOfMonth(now).toISOString(), endDate: endOfMonth(now).toISOString() };
    case 'custom':
      return {
        startDate: customStart ? startOfDay(new Date(customStart)).toISOString() : startOfDay(now).toISOString(),
        endDate: customEnd ? endOfDay(new Date(customEnd)).toISOString() : endOfDay(now).toISOString(),
      };
  }
}

function formatCurrency(amount: number): string {
  return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function exportSalesToCSV(sales: any[]) {
  if (!sales.length) return;
  const headers = ['Receipt #', 'Date & Time', 'Cashier', 'Subtotal', 'Discount', 'Total', 'Status'];
  const rows = sales.map((s: any) => [
    s.sale_number,
    format(new Date(s.created_at), 'dd/MM/yyyy HH:mm'),
    s.cashier_name,
    s.subtotal ?? '',
    s.discount_amount ?? '',
    s.total_amount,
    s.status,
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sales-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function SalesHistoryPage() {
  const { notify } = useNotify();
  const { storeId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Reset page when search changes
  useMemo(() => { setCurrentPage(1); }, [debouncedSearch]);

  const { startDate, endDate } = getDateRange(dateRange, customStart, customEnd);

  const { data: sales, isLoading, error, refetch } = useQuery({
    queryKey: ['sales-history', storeId, debouncedSearch, startDate, endDate],
    queryFn: () => api.sales.history(storeId, searchTerm || undefined, startDate, endDate),
  });

  if (error) {
    return (
      <div className="sales-history-container">
        <PageHeader 
          title="Sales History" 
          description="Search and review store transactions." 
        />
        <div className="card">
          <ErrorState message="Failed to load sales history." onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  const completedSales = (sales ?? []).filter((s: any) => s.status === 'completed');
  const voidedSales = (sales ?? []).filter((s: any) => s.status === 'voided');

  const totalRevenue = completedSales.reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0);
  const avgTicket = completedSales.length ? totalRevenue / completedSales.length : 0;
  const voidCount = voidedSales.length;

  const totalPages = Math.ceil((sales?.length ?? 0) / pageSize);
  const paginatedSales = sales?.slice((currentPage - 1) * pageSize, currentPage * pageSize) ?? [];

  const salesScrollRef = useRef<HTMLDivElement>(null);

  const salesVirtualizer = useVirtualizer({
    count: paginatedSales.length,
    getScrollElement: () => salesScrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setCurrentPage(1);
  };

  return (
    <div className="sales-history-container">
      <PageHeader 
        title="Sales History" 
        description="Search and review store transactions." 
      />

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500', color: 'var(--text-muted)' }}>Total Revenue</span>
            <DollarSign size={18} style={{ color: 'var(--color-success)' }} />
          </div>
          <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '700' }}>{formatCurrency(totalRevenue)}</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500', color: 'var(--text-muted)' }}>Average Ticket</span>
            <TrendingUp size={18} style={{ color: 'var(--color-primary)' }} />
          </div>
          <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '700' }}>{formatCurrency(avgTicket)}</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500', color: 'var(--text-muted)' }}>Voided</span>
            <AlertTriangle size={18} style={{ color: voidCount > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }} />
          </div>
          <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '700' }}>{voidCount}</span>
        </div>
      </div>

      {/* Filters Row */}
      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'center' }}>
          {/* Date Range Picker */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 'var(--radius-md)', padding: '2px' }}>
            {(['today', 'week', 'month', 'custom'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => handleDateRangeChange(range)}
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: dateRange === range ? '700' : '500',
                  backgroundColor: dateRange === range ? 'var(--color-primary)' : 'transparent',
                  color: dateRange === range ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                }}
              >
                {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : 'Custom'}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          {dateRange === 'custom' && (
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <input
                type="date"
                value={customStart}
                onChange={(e) => { setCustomStart(e.target.value); setCurrentPage(1); }}
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg)',
                  fontSize: 'var(--font-size-sm)',
                }}
              />
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => { setCustomEnd(e.target.value); setCurrentPage(1); }}
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg)',
                  fontSize: 'var(--font-size-sm)',
                }}
              />
            </div>
          )}

          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by Receipt #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-3) var(--space-3) var(--space-3) 40px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--input-bg)',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Export Button */}
          <button
            onClick={() => exportSalesToCSV(sales ?? [])}
            disabled={!sales?.length}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card)',
              cursor: sales?.length ? 'pointer' : 'not-allowed',
              opacity: sales?.length ? 1 : 0.5,
              fontSize: 'var(--font-size-sm)',
              fontWeight: '600',
            }}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Results count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
          {sales?.length ?? 0} transaction{sales?.length === 1 ? '' : 's'} found
        </span>
      </div>

      {/* Sales Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.02)', color: 'var(--text-muted)' }}>
              <th style={{ padding: 'var(--space-4)', width: '18%' }}>Receipt #</th>
              <th style={{ padding: 'var(--space-4)', width: '24%' }}>Date & Time</th>
              <th style={{ padding: 'var(--space-4)', width: '18%' }}>Cashier</th>
              <th style={{ padding: 'var(--space-4)', width: '16%' }}>Amount</th>
              <th style={{ padding: 'var(--space-4)', width: '14%' }}>Status</th>
              <th style={{ padding: 'var(--space-4)', textAlign: 'right', width: '10%' }}>Actions</th>
            </tr>
          </thead>
        </table>

        {isLoading ? (
          <div className="p-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex gap-4 py-3">
                <SkeletonBlock className="w-[120px] h-5" />
                <SkeletonBlock className="w-[150px] h-5" />
                <SkeletonBlock className="w-[100px] h-5" />
                <SkeletonBlock className="w-[80px] h-5" />
                <SkeletonBlock className="w-[60px] h-5" />
              </div>
            ))}
          </div>
        ) : paginatedSales.length === 0 ? (
          <EmptyState
            icon={<Receipt size={48} />}
            title="No sales yet"
            description="Transactions will appear here once sales are recorded."
          />
        ) : (
          <div
            ref={salesScrollRef}
            style={{ height: `${Math.min(paginatedSales.length, VISIBLE_ROWS) * ROW_HEIGHT + 4}px`, overflow: 'auto' }}
          >
            <div style={{ height: `${salesVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
              {salesVirtualizer.getVirtualItems().map((virtualRow) => {
                const s = paginatedSales[virtualRow.index];
                return (
                  <div
                    key={s.id}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      position: 'absolute',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--border-color)',
                    }}
                    onClick={() => setSelectedSaleId(s.id)}
                  >
                    <div style={{ padding: 'var(--space-4)', width: '18%', fontWeight: '700' }}>{s.sale_number}</div>
                    <div style={{ padding: 'var(--space-4)', width: '24%', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                      {format(new Date(s.created_at), 'MMM d, yyyy HH:mm')}
                    </div>
                    <div style={{ padding: 'var(--space-4)', width: '18%' }}>{s.cashier_name}</div>
                    <div style={{ padding: 'var(--space-4)', width: '16%', fontWeight: '700' }}>৳{s.total_amount}</div>
                    <div style={{ padding: 'var(--space-4)', width: '14%' }}>
                      <span className={clsx(
                        'badge',
                        s.status === 'completed' ? 'badge-success' : 'badge-danger'
                      )} style={{
                        fontSize: 'var(--font-size-xs)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: '700',
                        backgroundColor: s.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: s.status === 'completed' ? 'var(--color-success)' : 'var(--color-danger)',
                        textTransform: 'uppercase'
                      }}>
                        {s.status}
                      </span>
                    </div>
                    <div style={{ padding: 'var(--space-4)', textAlign: 'right', width: '10%' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedSaleId(s.id); }}
                        style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto', fontWeight: '600' }}
                      >
                        Details <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                ← Prev
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  fontSize: 'var(--font-size-sm)',
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <SaleDetailsDrawer
        saleId={selectedSaleId}
        onClose={() => setSelectedSaleId(null)}
      />
    </div>
  );
}

function SaleDetailsDrawer({ saleId, onClose }: { saleId: string | null, onClose: () => void }) {
  const { notify } = useNotify();
  const queryClient = useQueryClient();
  const [voidReason, setVoidReason] = useState('');
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const { data, isLoading } = useQuery({
    queryKey: ['sale-details', saleId],
    queryFn: () => api.sales.getDetails(saleId!),
    enabled: !!saleId,
  });

  const voidMutation = useMutation({
    mutationFn: (reason: string) => api.sales.void(saleId!, reason, idempotencyKey),
    onSuccess: (res) => {
      if (res.is_duplicate) {
        notify('This sale was already voided.', 'info');
      } else {
        notify('Sale voided successfully. Stock has been restored.', 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      onClose();
    },
    onError: (err: any) => {
      notify(err.message || 'Failed to void sale. Please try again.', 'error');
    }
  });

  if (!saleId) return null;

  const { sale, items, payments } = data || {};

  return (
    <div
      className="drawer-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 1000,
        backdropFilter: 'blur(2px)'
      }}
    >
      <div
        className="drawer-content"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '500px',
          backgroundColor: 'var(--bg-card)',
          height: '100%',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          padding: 'var(--space-6)',
          overflowY: 'auto'
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700' }}>Sale Details</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={24} /></button>
        </header>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <SkeletonBlock className="w-full h-8" />
            <SkeletonBlock className="w-full h-8" />
            <SkeletonBlock className="w-full h-8" />
            <SkeletonBlock className="w-3/4 h-8" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
            {/* Header Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', backgroundColor: 'rgba(0,0,0,0.02)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'block' }}>Receipt #</label>
                <span style={{ fontWeight: '700' }}>{sale.sale_number}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'block' }}>Status</label>
                <span style={{
                  color: sale.status === 'completed' ? 'var(--color-success)' : 'var(--color-danger)',
                  fontWeight: '700',
                  textTransform: 'uppercase'
                }}>{sale.status}</span>
              </div>
              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'block' }}>Date</label>
                <span>{format(new Date(sale.created_at), 'MMM d, yyyy HH:mm')}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'block' }}>Cashier</label>
                <span>{sale.cashier_name}</span>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: '700', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={16} /> Items
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ borderBottom: '1px solid var(--border-color)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 'var(--space-2) 0' }}>Item</th>
                    <th style={{ textAlign: 'center', padding: 'var(--space-2) 0' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: 'var(--space-2) 0' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: 'var(--font-size-sm)' }}>
                      <td style={{ padding: 'var(--space-2) 0' }}>
                        <div>{item.item_name}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{item.sku}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{item.qty}</td>
                      <td style={{ textAlign: 'right', fontWeight: '600' }}>৳{item.line_total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', borderTop: '2px solid var(--border-color)', paddingTop: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <span>৳{sale.subtotal}</span>
              </div>
              {sale.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-danger)' }}>
                  <span>Discount</span>
                  <span>-৳{sale.discount_amount}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xl)', fontWeight: '800' }}>
                <span>Total</span>
                <span>৳{sale.total_amount}</span>
              </div>
            </div>

            {/* Payments */}
            <div>
              <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: '700', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={16} /> Payments
              </h3>
              {payments.map((p: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', padding: 'var(--space-1) 0' }}>
                  <span>{p.method_name} {p.reference && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>({p.reference})</span>}</span>
                  <span style={{ fontWeight: '600' }}>৳{p.amount}</span>
                </div>
              ))}
            </div>

            {/* Void Section (Manager only) */}
            {sale.status === 'completed' && (
              <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-6)' }}>
                {!showVoidConfirm ? (
                  <button
                    onClick={() => setShowVoidConfirm(true)}
                    style={{ width: '100%', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <XCircle size={18} /> Void Sale
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ color: 'var(--color-danger)', fontWeight: '700' }}>Confirm Void</h4>
                    <p style={{ fontSize: 'var(--font-size-xs)' }}>This will restore stock and reverse session totals. This action cannot be undone.</p>
                    <input
                      type="text"
                      placeholder="Reason for voiding (required)..."
                      value={voidReason}
                      onChange={e => setVoidReason(e.target.value)}
                      style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-danger)' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                      <button onClick={() => setShowVoidConfirm(false)} style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>Cancel</button>
                      <button
                        disabled={!voidReason || voidMutation.isPending}
                        onClick={() => voidMutation.mutate(voidReason)}
                        style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-danger)', color: 'white', fontWeight: '600', opacity: (!voidReason || voidMutation.isPending) ? 0.5 : 1 }}
                      >
                        {voidMutation.isPending ? 'Voiding...' : 'Confirm Void'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Void Info */}
            {sale.status === 'voided' && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-danger)' }}>
                <h4 style={{ color: 'var(--color-danger)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <XCircle size={16} /> Voided Transaction
                </h4>
                <div style={{ fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>
                  <strong>Reason:</strong> {sale.void_reason}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
                  By {sale.voided_by_name} on {format(new Date(sale.voided_at), 'MMM d, HH:mm')}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}