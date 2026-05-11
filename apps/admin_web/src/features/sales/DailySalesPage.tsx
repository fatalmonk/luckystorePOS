import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { ErrorState, EmptyState, SkeletonBlock } from '../../components/PageState';
import { useNotify } from '../../components/NotificationContext';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../components/layout/PageHeader';
import { Drawer } from '../../components/ui/Drawer';
import { MetricCard } from '../../components/data-display/MetricCard';
import { TableFilters } from '../../components/data-display/TableFilters';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  CalendarDays,
  Wallet,
  Plus,
  ArrowUp,
  ArrowDown,
  CreditCard,
  Banknote,
} from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, isToday, isThisWeek, isThisMonth, subMonths, parseISO, subDays } from 'date-fns';
import type { DailySale, DailySaleFormData } from '../../lib/api/types';

const CHART_COLORS = [
  'var(--color-success-default)',
  'var(--color-info-default)',
  'var(--color-warning-default)',
  'var(--color-danger-default)',
  'var(--color-primary-default)',
];

export function DailySalesPage() {
  const { notify } = useNotify();
  const { storeId } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState<DailySale | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: sales, isLoading, error, refetch } = useQuery({
    queryKey: ['dailySales', storeId],
    queryFn: () => api.dailySales.list(storeId),
  });

  const createMutation = useMutation({
    mutationFn: (form: DailySaleFormData) => api.dailySales.create(storeId, form),
    onSuccess: () => {
      notify('Daily sale recorded successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['dailySales', storeId] });
      setShowForm(false);
    },
    onError: (err: any) => {
      notify(err.message || 'Failed to record daily sale.', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<DailySaleFormData> }) => 
      api.dailySales.update(id, updates),
    onSuccess: () => {
      notify('Daily sale updated successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['dailySales', storeId] });
      setEditingSale(null);
    },
    onError: (err: any) => {
      notify(err.message || 'Failed to update daily sale.', 'error');
    },
  });

  const filtered = useMemo(() => {
    if (!sales) return [];
    return sales.filter((s) => {
      if (startDate && s.saleDate < startDate) return false;
      if (endDate && s.saleDate > endDate) return false;
      return true;
    });
  }, [sales, startDate, endDate]);

  // Time-based totals
  const todayTotal = useMemo(
    () => filtered.filter((s) => isToday(new Date(s.saleDate))).reduce((sum, s) => sum + s.totalSales, 0),
    [filtered],
  );
  const weekTotal = useMemo(
    () => filtered.filter((s) => isThisWeek(new Date(s.saleDate), { weekStartsOn: 6 })).reduce((sum, s) => sum + s.totalSales, 0),
    [filtered],
  );
  const monthTotal = useMemo(
    () => filtered.filter((s) => isThisMonth(new Date(s.saleDate))).reduce((sum, s) => sum + s.totalSales, 0),
    [filtered],
  );

  const allSales = sales || [];

  // Overall statistics
  const totalStats = useMemo(() => {
    if (allSales.length === 0) return { total: 0, avg: 0, min: 0, max: 0, count: 0 };
    const amounts = allSales.map(s => s.totalSales);
    const total = amounts.reduce((a, b) => a + b, 0);
    return {
      total,
      avg: total / amounts.length,
      min: Math.min(...amounts),
      max: Math.max(...amounts),
      count: amounts.length,
    };
  }, [allSales]);

  // Monthly comparison
  const monthlyComparison = useMemo(() => {
    const now = new Date();
    const thisMonth = allSales.filter(s => isThisMonth(new Date(s.saleDate))).reduce((sum, s) => sum + s.totalSales, 0);
    const lastMonthStart = subMonths(startOfMonth(now), 1);
    const lastMonthEnd = startOfMonth(now);
    const lastMonth = allSales
      .filter(s => {
        const d = new Date(s.saleDate);
        return d >= lastMonthStart && d < lastMonthEnd;
      })
      .reduce((sum, s) => sum + s.totalSales, 0);
    const change = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
    return { thisMonth, lastMonth, change };
  }, [allSales]);

  // Payment breakdown for pie chart
  const paymentBreakdown = useMemo(() => {
    const totals = { cash: 0, bkash: 0, credit: 0 };
    allSales.forEach(s => {
      totals.cash += s.cashAmount;
      totals.bkash += s.bkashAmount;
      totals.credit += s.creditAmount;
    });
    const total = totals.cash + totals.bkash + totals.credit;
    return [
      { name: 'Cash', value: totals.cash, percentage: total > 0 ? (totals.cash / total) * 100 : 0 },
      { name: 'Bkash', value: totals.bkash, percentage: total > 0 ? (totals.bkash / total) * 100 : 0 },
      { name: 'Credit', value: totals.credit, percentage: total > 0 ? (totals.credit / total) * 100 : 0 },
    ];
  }, [allSales]);

  // Daily trend for line chart (last 30 days)
  const dailyTrend = useMemo(() => {
    const grouped: Record<string, { sales: number; expense: number; purchase: number }> = {};
    allSales.forEach(s => {
      grouped[s.saleDate] = {
        sales: s.totalSales,
        expense: s.dailyExpense,
        purchase: s.stockPurchase,
      };
    });
    return Object.entries(grouped)
      .map(([date, data]) => ({
        date,
        label: format(parseISO(date), 'dd MMM'),
        sales: data.sales,
        expense: data.expense,
        purchase: data.purchase,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }, [allSales]);

  // Monthly trend
  const monthlyTrend = useMemo(() => {
    const grouped: Record<string, { total: number; count: number }> = {};
    allSales.forEach(s => {
      const monthKey = s.saleDate.substring(0, 7);
      if (!grouped[monthKey]) grouped[monthKey] = { total: 0, count: 0 };
      grouped[monthKey].total += s.totalSales;
      grouped[monthKey].count++;
    });
    return Object.entries(grouped)
      .map(([month, data]) => ({
        month: format(parseISO(`${month}-01`), 'MMM yyyy'),
        total: data.total,
        count: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [allSales]);

  // Top 10 highest sales days
  const topSalesDays = useMemo(() => {
    return [...allSales]
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 5)
      .map(s => ({
        ...s,
        date: format(new Date(s.saleDate), 'dd MMM yyyy'),
      }));
  }, [allSales]);

  if (isLoading) {
    return (
      <div className="sales-container">
        <PageHeader title="Daily Sales" subtitle="Track and analyze daily sales data." />
        <div className="dashboard-grid mt-6">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sales-container">
        <PageHeader title="Daily Sales" subtitle="Track and analyze daily sales data." />
        <div className="card">
          <ErrorState message="Failed to load daily sales." onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  return (
    <div className="sales-container">
      <PageHeader
        title="Daily Sales"
        subtitle="Track and analyze daily sales data."
        actions={
          <button className="button-primary" onClick={() => setShowForm(true)}>
            <Plus size={18} /> Add Daily Sale
          </button>
        }
      />

      <div className="dashboard-grid mt-6 mb-6">
        <MetricCard title="Today's Sales" value={`৳${todayTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`} icon={<CalendarDays size={20} className="text-emerald-600" />} color="success" variant="light" />
        <MetricCard title="This Week" value={`৳${weekTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`} icon={<TrendingUp size={20} className="text-emerald-600" />} color="success" variant="light" />
        <MetricCard title="This Month" value={`৳${monthTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`} icon={<Wallet size={20} className="text-emerald-600" />} color="success" variant="light" />
        <MetricCard title="Total Records" value={totalStats.count.toString()} icon={<DollarSign size={20} className="text-info" />} color="info" variant="light" />
      </div>

      {/* Sales Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Overview Stats */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Sales Overview</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-surface-secondary rounded-lg">
              <div className="text-sm text-text-muted">Total Sales</div>
              <div className="text-2xl font-bold text-success">৳{totalStats.total.toLocaleString('en-BD', { maximumFractionDigits: 0 })}</div>
              <div className="text-xs text-text-muted">{totalStats.count} days recorded</div>
            </div>
            <div className="p-4 bg-surface-secondary rounded-lg">
              <div className="text-sm text-text-muted">Average Daily</div>
              <div className="text-2xl font-bold text-text-primary">৳{totalStats.avg.toLocaleString('en-BD', { maximumFractionDigits: 0 })}</div>
              <div className="text-xs text-text-muted">per day</div>
            </div>
            <div className="p-4 bg-surface-secondary rounded-lg">
              <div className="text-sm text-text-muted">Highest Day</div>
              <div className="text-2xl font-bold text-success">৳{totalStats.max.toLocaleString('en-BD', { maximumFractionDigits: 0 })}</div>
              <div className="text-xs text-text-muted">best day</div>
            </div>
            <div className="p-4 bg-surface-secondary rounded-lg">
              <div className="text-sm text-text-muted">Lowest Day</div>
              <div className="text-2xl font-bold text-danger">৳{totalStats.min.toLocaleString('en-BD', { maximumFractionDigits: 0 })}</div>
              <div className="text-xs text-text-muted">slowest day</div>
            </div>
          </div>
        </div>

        {/* Payment Type Breakdown */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Payment Breakdown</h2>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {paymentBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => value !== undefined && value !== null ? [`৳${Number(value).toLocaleString()}`, 'Amount'] : ['N/A', 'Amount']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {paymentBreakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS[idx] }} />
                  <span className="text-sm text-text-primary">{item.name}</span>
                </div>
                <div className="text-sm">
                  <span className="font-semibold">৳{item.value.toLocaleString()}</span>
                  <span className="text-text-muted ml-2">({item.percentage.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Monthly Sales Trend</h2>
        {monthlyTrend.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `৳${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: any) => value !== undefined && value !== null ? [`৳${Number(value).toLocaleString()}`, 'Total Sales'] : ['N/A', 'Total Sales']}
                  contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-default)' }}
                />
                <Bar dataKey="total" fill="var(--color-success-default)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            icon={<TrendingUp size={48} />}
            title="No data available"
            description="Add daily sales to see trends."
          />
        )}
      </div>

      {/* Daily Trend Line Chart */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Daily Trend (Last 30 Days)</h2>
        {dailyTrend.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={10} interval="preserveStartEnd" />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `৳${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-default)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="var(--color-success-default)" strokeWidth={2} name="Sales" dot={false} />
                <Line type="monotone" dataKey="expense" stroke="var(--color-danger-default)" strokeWidth={2} name="Expense" dot={false} />
                <Line type="monotone" dataKey="purchase" stroke="var(--color-info-default)" strokeWidth={2} name="Stock Purchase" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            icon={<TrendingUp size={48} />}
            title="No data available"
            description="Add daily sales to see trends."
          />
        )}
      </div>

      {/* Top Sales Days */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Top 5 Highest Sales Days</h2>
        {topSalesDays.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">Date</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Total Sales</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Cash</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Bkash</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Credit</th>
                </tr>
              </thead>
              <tbody>
                {topSalesDays.map((s) => (
                  <tr key={s.id} className="border-b border-border-default hover:bg-surface-secondary">
                    <td className="py-3 px-4 text-sm text-text-primary">{s.date}</td>
                    <td className="py-3 px-4 text-sm font-semibold text-success text-right">৳{s.totalSales.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-text-primary text-right">৳{s.cashAmount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-text-primary text-right">৳{s.bkashAmount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-text-primary text-right">৳{s.creditAmount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<DollarSign size={48} />}
            title="No sales data"
            description="Add daily sales to see top performing days."
          />
        )}
      </div>

      {/* Add/Edit Form Drawer */}
      <Drawer
        isOpen={showForm || editingSale !== null}
        onClose={() => {
          setShowForm(false);
          setEditingSale(null);
        }}
        title={editingSale ? 'Edit Daily Sale' : 'Add Daily Sale'}
      >
        <DailySaleForm
          initialData={editingSale}
          onSubmit={(data) => {
            if (editingSale) {
              updateMutation.mutate({ id: editingSale.id, updates: data });
            } else {
              createMutation.mutate(data);
            }
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingSale(null);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </Drawer>
    </div>
  );
}

// Form component for adding/editing daily sales
function DailySaleForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initialData: DailySale | null;
  onSubmit: (data: DailySaleFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState<DailySaleFormData>(() => ({
    saleDate: initialData?.saleDate || format(new Date(), 'yyyy-MM-dd'),
    cashAmount: initialData?.cashAmount || 0,
    bkashAmount: initialData?.bkashAmount || 0,
    creditAmount: initialData?.creditAmount || 0,
    totalSales: initialData?.totalSales || 0,
    stockPurchase: initialData?.stockPurchase || 0,
    dailyExpense: initialData?.dailyExpense || 0,
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const handleAmountChange = (field: keyof DailySaleFormData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setForm(prev => {
      const updated = { ...prev, [field]: numValue };
      // Auto-calculate total if cash, bkash, or credit changes
      if (field === 'cashAmount' || field === 'bkashAmount' || field === 'creditAmount') {
        updated.totalSales = updated.cashAmount + updated.bkashAmount + updated.creditAmount;
      }
      return updated;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Date</label>
        <input
          type="date"
          value={form.saleDate}
          onChange={(e) => setForm(prev => ({ ...prev, saleDate: e.target.value }))}
          className="input w-full"
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Cash</label>
          <input
            type="number"
            step="0.01"
            value={form.cashAmount}
            onChange={(e) => handleAmountChange('cashAmount', e.target.value)}
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Bkash</label>
          <input
            type="number"
            step="0.01"
            value={form.bkashAmount}
            onChange={(e) => handleAmountChange('bkashAmount', e.target.value)}
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Credit</label>
          <input
            type="number"
            step="0.01"
            value={form.creditAmount}
            onChange={(e) => handleAmountChange('creditAmount', e.target.value)}
            className="input w-full"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Total Sales (Auto)</label>
        <input
          type="number"
          step="0.01"
          value={form.totalSales}
          onChange={(e) => handleAmountChange('totalSales', e.target.value)}
          className="input w-full bg-surface-secondary"
        />
        <p className="text-xs text-text-muted mt-1">Auto-calculated from Cash + Bkash + Credit</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Stock Purchase</label>
          <input
            type="number"
            step="0.01"
            value={form.stockPurchase}
            onChange={(e) => handleAmountChange('stockPurchase', e.target.value)}
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Daily Expense</label>
          <input
            type="number"
            step="0.01"
            value={form.dailyExpense}
            onChange={(e) => handleAmountChange('dailyExpense', e.target.value)}
            className="input w-full"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={onCancel} className="button-secondary" disabled={isLoading}>
          Cancel
        </button>
        <button type="submit" className="button-primary" disabled={isLoading}>
          {isLoading ? 'Saving...' : initialData ? 'Update' : 'Add'}
        </button>
      </div>
    </form>
  );
}