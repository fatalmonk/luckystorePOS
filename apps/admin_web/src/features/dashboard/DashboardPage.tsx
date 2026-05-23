import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { AlertTriangle, Package, TrendingUp, Bell, ArrowUpRight, ArrowDownRight, Scale, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SkeletonCard, SkeletonBlock, ErrorState } from '../../components/PageState';
import { useRealtimeSubscription } from '../../hooks/useRealtime';
import { useNotify } from '../../components/NotificationContext';
import { HeaderStats } from './HeaderStats';
import { RecentActivity } from './RecentActivity';
import { format, subDays, parseISO } from 'date-fns';
import clsx from 'clsx';

export function DashboardPage() {
  const { t } = useTranslation();
  const { storeId, user } = useAuth();
  const { notify } = useNotify();

  const remindersQuery = useQuery({
    queryKey: ['dashboard-reminders', storeId],
    queryFn: () => api.reminders.list(storeId!),
    enabled: !!storeId,
  });

  const reminders = remindersQuery.data;

  // Realtime: show toast when a new sale is inserted on another device
  useRealtimeSubscription({
    table: 'sales',
    event: 'INSERT',
    filter: storeId ? `store_id=eq.${storeId}` : undefined,
    invalidateKeys: [['dashboard-stats', storeId], ['low-stock', storeId]],
    onEvent: () => {
      notify('New sale recorded on another device', 'success');
    },
  });

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats', storeId],
    queryFn: () => api.dashboard.getStats(storeId!),
    enabled: !!storeId,
  });
  const lowStockQuery = useQuery({
    queryKey: ['low-stock', storeId],
    queryFn: () => api.dashboard.getLowStock(storeId!),
    enabled: !!storeId,
  });

  // Fetch daily sales data for comparison (ALL days, not just 30)
  const dailySalesQuery = useQuery({
    queryKey: ['daily-sales-comparison', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from('daily_sales')
        .select('*')
        .eq('store_id', storeId)
        .order('sale_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!storeId,
  });

  // Fetch expenses data including stock purchase category
  const expensesQuery = useQuery({
    queryKey: ['expenses-dashboard', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('store_id', storeId)
        .order('expense_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!storeId,
  });

  const stats = statsQuery.data;
  const lowStock = lowStockQuery.data;
  const dailySales = dailySalesQuery.data || [];
  const expenses = expensesQuery.data || [];
  const isLoading = statsQuery.isLoading || dailySalesQuery.isLoading || expensesQuery.isLoading;
  const isError = statsQuery.isError || dailySalesQuery.isError || expensesQuery.isError;

  // Calculate totals from daily_sales (all-time)
  const totalRevenue = dailySales.reduce((sum: number, s: any) => sum + Number(s.cash_amount || 0) + Number(s.bkash_amount || 0), 0);
  const totalCredit = dailySales.reduce((sum: number, s: any) => sum + Number(s.credit_amount || 0), 0);
  const totalCash = dailySales.reduce((sum: number, s: any) => sum + Number(s.cash_amount || 0), 0);
  const totalBkash = dailySales.reduce((sum: number, s: any) => sum + Number(s.bkash_amount || 0), 0);
  const totalExpensesAllTime = dailySales.reduce((sum: number, s: any) => sum + Number(s.daily_expense || 0), 0);
  const totalStockAllTime = dailySales.reduce((sum: number, s: any) => sum + Number(s.stock_purchase || 0), 0);
  const netPosition = totalRevenue - totalExpensesAllTime;

  // Partner capital investment (fixed)
  const mohammedCapital = 553000;
  const sayeedCapital = 965490;
  const partnerCapital = mohammedCapital + sayeedCapital;
  const availableBalance = partnerCapital + totalRevenue - totalExpensesAllTime;

  // Expense breakdown by category from expenses table
  const expenseCategories: Record<string, number> = expenses.reduce((acc: Record<string, number>, e: any) => {
    const cat = e.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);
  const expenseTotalFromItems: number = Object.values(expenseCategories)
    .reduce((sum: number, v) => sum + (v as number), 0);

  // Map category names to display labels and colors - Warm palette
  const categoryConfig: Record<string, { label: string; color: string; barColor: string }> = {
    'Stock Purchase': { label: 'Stock Purchase', color: 'text-warm-accent', barColor: 'bg-warm-accent' },
    'Capital Expenditure': { label: t('dashboard.capital'), color: 'text-warm-warning', barColor: 'bg-warm-warning' },
    'Staff salary': { label: 'Staff Salary', color: 'text-primary-default', barColor: 'bg-primary-subtle0' },
    'Utility Expenses': { label: 'Utilities', color: 'text-warm-success', barColor: 'bg-warm-success' },
    'All Other Expenses': { label: 'Other', color: 'text-warm-dim', barColor: 'bg-warm-silver' },
    'Partners Take': { label: 'Partners Take', color: 'text-warm-danger', barColor: 'bg-warm-danger' },
    'Transport & Conveyance': { label: 'Transport', color: 'text-warm-charcoal', barColor: 'bg-warm-charcoal' },
  };

  // Last 7 days vs previous 7 days for trend
  const last7 = dailySales.filter((s: any) => s.sale_date >= format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const prev7 = dailySales.filter((s: any) => {
    const d = s.sale_date;
    return d >= format(subDays(new Date(), 14), 'yyyy-MM-dd') && d < format(subDays(new Date(), 7), 'yyyy-MM-dd');
  });
  const last7Sales = last7.reduce((sum: number, s: any) => sum + Number(s.total_sales || 0), 0);
  const prev7Sales = prev7.reduce((sum: number, s: any) => sum + Number(s.total_sales || 0), 0);
  const salesTrend: 'up' | 'down' | null = last7Sales > prev7Sales ? 'up' : last7Sales < prev7Sales ? 'down' : null;

  const fmt = (n: number) => n.toLocaleString('en-BD', { maximumFractionDigits: 0 });

  // Sales vs Expenses comparison from daily_sales
  const salesVsExpenses = dailySales
    .slice(0, 14)
    .reverse()
    .map((s: any) => ({
      date: s.sale_date,
      label: format(parseISO(s.sale_date), 'dd MMM'),
      sales: Number(s.cash_amount || 0) + Number(s.bkash_amount || 0),
      expenses: Number(s.daily_expense || 0),
      stockPurchases: Number(s.stock_purchase || 0),
    }));

  // Payment breakdown from daily_sales
  const paymentBreakdown = dailySales.reduce(
    (acc: { cash: number; bkash: number; credit: number }, s: any) => ({
      cash: acc.cash + Number(s.cash_amount || 0),
      bkash: acc.bkash + Number(s.bkash_amount || 0),
      credit: acc.credit + Number(s.credit_amount || 0),
    }),
    { cash: 0, bkash: 0, credit: 0 }
  );

  const totalPayments = paymentBreakdown.cash + paymentBreakdown.bkash + paymentBreakdown.credit;

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <header className="mb-8">
          <SkeletonBlock className="w-[200px] h-7" />
          <SkeletonBlock className="w-[260px] h-[18px] mt-2" />
        </header>
        <div className="dashboard-grid">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <section className="mt-12">
          <SkeletonBlock className="w-[160px] h-[22px] mb-6" />
          <div className="card skeleton-block h-[200px] opacity-30" />
        </section>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="dashboard-container">
        <ErrorState message="Failed to load dashboard data." onRetry={() => { statsQuery.refetch(); lowStockQuery.refetch(); dailySalesQuery.refetch(); expensesQuery.refetch(); }} />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Welcome Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-warm-fg font-display">
          {t('dashboard.welcome')}, {user?.name || stats?.user?.name || 'Mohammed'}
        </h1>
        <p className="text-warm-muted mt-1">Here&apos;s what&apos;s happening today.</p>
      </header>

      {/* Header Stats */}
      <HeaderStats
        todaySales={`৳${stats?.total_sales || '0.00'}`}
        totalRevenue={fmt(totalRevenue)}
        totalCustomers="128"
        netProfit={fmt(Math.abs(netPosition))}
        salesTrend={salesTrend || undefined}
        profitTrend={netPosition >= 0 ? 'up' : 'down'}
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Charts & Tables */}
        <div className="lg:col-span-2 space-y-8">
          {/* Sales vs Expenses Chart */}
          <section className="bg-warm-surface border border-warm-border-warm rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-warm-fg font-display">
                Sales vs Expenses (Last 14 Days)
              </h2>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-warm-success" />
                  <span className="text-warm-muted">Sales</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-warm-danger" />
                  <span className="text-warm-muted">Expenses</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-warm-accent" />
                  <span className="text-warm-muted">Stock</span>
                </div>
              </div>
            </div>

            {salesVsExpenses.length > 0 ? (
              <div className="flex items-end justify-between gap-1" style={{ height: '240px' }}>
                {salesVsExpenses.map((day, idx: number) => {
                  const maxVal = Math.max(
                    ...salesVsExpenses.map((d: { sales: number; expenses: number; stockPurchases: number }) => 
                      Math.max(d.sales, d.expenses, d.stockPurchases)
                    ),
                    1
                  );
                  const salesHeight = maxVal > 0 ? (day.sales / maxVal) * 100 : 0;
                  const expenseHeight = maxVal > 0 ? (day.expenses / maxVal) * 100 : 0;
                  const stockHeight = maxVal > 0 ? (day.stockPurchases / maxVal) * 100 : 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: '100%' }}>
                        <div
                          style={{
                            width: '28%',
                            height: `${salesHeight}%`,
                            backgroundColor: 'var(--warm-success)',
                            borderRadius: '2px 2px 0 0',
                            minHeight: day.sales > 0 ? 4 : 0,
                            transition: 'height 0.3s ease',
                          }}
                          title={`Sales: ৳${day.sales.toLocaleString()}`}
                        />
                        <div
                          style={{
                            width: '28%',
                            height: `${expenseHeight}%`,
                            backgroundColor: 'var(--warm-danger)',
                            borderRadius: '2px 2px 0 0',
                            minHeight: day.expenses > 0 ? 4 : 0,
                            transition: 'height 0.3s ease',
                          }}
                          title={`Expenses: ৳${day.expenses.toLocaleString()}`}
                        />
                        <div
                          style={{
                            width: '28%',
                            height: `${stockHeight}%`,
                            backgroundColor: 'var(--warm-accent)',
                            borderRadius: '2px 2px 0 0',
                            minHeight: day.stockPurchases > 0 ? 4 : 0,
                            transition: 'height 0.3s ease',
                          }}
                          title={`Stock: ৳${day.stockPurchases.toLocaleString()}`}
                        />
                      </div>
                      <span className="text-[10px] text-warm-dim whitespace-nowrap">
                        {day.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-warm-muted py-12">
                No daily sales data available.{' '}
                <a href="/admin/daily-sales" className="text-warm-accent hover:underline">
                  Add daily sales
                </a>
              </div>
            )}
          </section>

          {/* Financial Overview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Revenue Breakdown */}
            <div className="bg-warm-surface border border-warm-border-warm rounded-xl shadow-sm p-6">
              <h3 className="text-xs font-semibold text-warm-muted uppercase tracking-wider mb-4">
                {t('dashboard.revenueBreakdown')}
              </h3>
              <div className="text-2xl font-bold text-warm-success font-mono mb-4">৳{fmt(totalRevenue)}</div>
              <div className="space-y-3">
                {[
                  { label: 'Cash', value: totalCash, total: totalRevenue, color: 'bg-warm-success' },
                  { label: 'bKash', value: totalBkash, total: totalRevenue, color: 'bg-primary-subtle0' },
                  { label: 'Credit', value: totalCredit, total: totalRevenue, color: 'bg-warm-warning' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-warm-muted">{item.label}</span>
                      <span className="font-mono font-medium text-warm-fg">৳{fmt(item.value)}</span>
                    </div>
                    <div className="h-1.5 bg-warm-border rounded-full overflow-hidden">
                      <div 
                        className={item.color} 
                        style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%`, height: '100%' }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expense Breakdown */}
            <div className="bg-warm-surface border border-warm-border-warm rounded-xl shadow-sm p-6">
              <h3 className="text-xs font-semibold text-warm-muted uppercase tracking-wider mb-4">
                {t('dashboard.expenseBreakdown')}
              </h3>
              <div className="text-2xl font-bold text-warm-danger font-mono mb-4">৳{fmt(expenseTotalFromItems)}</div>
              <div className="space-y-3">
                {(Object.entries(expenseCategories as Record<string, number>) as [string, number][])
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([cat, amount]) => {
                    const config = categoryConfig[cat] || { label: cat, color: 'text-warm-dim', barColor: 'bg-warm-silver' };
                    const pct = expenseTotalFromItems > 0 ? (amount / expenseTotalFromItems) * 100 : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className={config.color}>{config.label}</span>
                          <span className="font-mono text-warm-fg">
                            ৳{fmt(amount)} <span className="text-warm-dim">({pct.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-warm-border rounded-full overflow-hidden">
                          <div className={config.barColor} style={{ width: `${pct}%`, height: '100%' }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Investment Summary */}
            <div className="bg-warm-surface border border-warm-border-warm rounded-xl shadow-sm p-6">
              <h3 className="text-xs font-semibold text-warm-muted uppercase tracking-wider mb-4">
                {t('dashboard.investmentSummary')}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-warm-border">
                  <span className="text-warm-muted">Mohammed</span>
                  <span className="font-mono font-medium text-warm-accent">৳{fmt(mohammedCapital)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-warm-border">
                  <span className="text-warm-muted">Sayeed Imam</span>
                  <span className="font-mono font-medium text-warm-accent">৳{fmt(sayeedCapital)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-warm-border">
                  <span className="font-semibold text-warm-fg">Total Capital</span>
                  <span className="font-mono font-bold text-lg text-warm-accent">৳{fmt(partnerCapital)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-warm-border">
                  <span className="text-warm-muted">{t('dashboard.stockInvestment')}</span>
                  <span className="font-mono font-medium text-primary-default">৳{fmt(totalStockAllTime)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className={clsx('font-semibold', netPosition >= 0 ? 'text-warm-success' : 'text-warm-danger')}>
                    {netPosition >= 0 ? t('dashboard.netProfit') : t('dashboard.netLoss')}
                  </span>
                  <span className={clsx('font-mono font-bold text-lg', netPosition >= 0 ? 'text-warm-success' : 'text-warm-danger')}>
                    ৳{fmt(Math.abs(netPosition))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Breakdown */}
          <section className="bg-warm-surface border border-warm-border-warm rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-warm-fg font-display mb-6">
              {t('dashboard.revenueBreakdown')}
            </h2>
            {totalRevenue > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-warm-bg rounded-lg">
                    <div className="text-sm text-warm-muted mb-1">Cash</div>
                    <div className="text-xl font-bold text-warm-success font-mono">৳{fmt(totalCash)}</div>
                    <div className="text-xs text-warm-dim mt-1">{((totalCash / totalRevenue) * 100).toFixed(1)}%</div>
                  </div>
                  <div className="text-center p-4 bg-warm-bg rounded-lg">
                    <div className="text-sm text-warm-muted mb-1">Bkash</div>
                    <div className="text-xl font-bold text-primary-default font-mono">৳{fmt(totalBkash)}</div>
                    <div className="text-xs text-warm-dim mt-1">{((totalBkash / totalRevenue) * 100).toFixed(1)}%</div>
                  </div>
                  <div className="text-center p-4 bg-warm-bg rounded-lg">
                    <div className="text-sm text-warm-muted mb-1">Credit Due</div>
                    <div className="text-xl font-bold text-warm-warning font-mono">৳{fmt(totalCredit)}</div>
                    <div className="text-xs text-warm-dim mt-1">{((totalCredit / (totalRevenue + totalCredit)) * 100).toFixed(1)}%</div>
                  </div>
                </div>
                <div className="h-3 bg-warm-border rounded-full overflow-hidden flex">
                  <div className="bg-warm-success transition-all duration-500" style={{ width: `${(totalCash / totalRevenue) * 100}%` }} />
                  <div className="bg-primary-subtle0 transition-all duration-500" style={{ width: `${(totalBkash / totalRevenue) * 100}%` }} />
                </div>
                <div className="text-center text-sm text-warm-muted mt-4">
                  Realized Revenue: ৳{fmt(totalRevenue)} | Total Sales: ৳{fmt(totalRevenue + totalCredit)}
                </div>
              </>
            ) : (
              <div className="text-center text-warm-muted py-8">No sales data available</div>
            )}
          </section>
        </div>

        {/* Right Column - Activity & Quick Actions */}
        <div className="space-y-8">
          {/* Quick POS Shortcut */}
          <section className="bg-gradient-to-br from-warm-accent to-warm-accent-light rounded-xl shadow-sm p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Zap size={20} />
                  Quick POS
                </h3>
                <p className="text-white/80 text-sm mt-1">Start a quick sale</p>
              </div>
              <a 
                href="/admin/pos" 
                className="bg-surface-default text-warm-accent px-4 py-2 rounded-lg font-medium hover:bg-surface-default/90 transition-colors"
              >
                Launch
              </a>
            </div>
          </section>

          {/* Total Balance Card */}
          <section className="bg-warm-surface border border-warm-border-warm rounded-xl shadow-sm p-6 text-center">
            <div className="text-xs font-semibold text-warm-muted uppercase tracking-wider mb-2">
              {t('dashboard.currentAvailableBalance')}
            </div>
            <div className="text-4xl font-bold text-warm-success font-mono">৳{fmt(availableBalance)}</div>
            <div className="text-sm text-warm-muted mt-1">Capital + Revenue − Expenses</div>
          </section>

          {/* Recent Activity */}
          <RecentActivity />

          {/* Low Stock Alerts */}
          <section className="bg-warm-surface border border-warm-border-warm rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-warm-border">
              <h3 className="text-lg font-semibold text-warm-fg font-display flex items-center gap-2">
                <AlertTriangle size={18} className="text-warm-warning" />
                Low Stock Alerts
              </h3>
            </div>
            {lowStock && lowStock.length > 0 ? (
              <ul className="divide-y divide-warm-border">
                {lowStock.slice(0, 5).map((item: { id: string, name: string, quantity: number }) => (
                  <li key={item.id} className="flex justify-between items-center px-6 py-3">
                    <span className="text-sm text-warm-fg">{item.name}</span>
                    <span className="text-sm font-semibold text-warm-danger">{item.quantity} left</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-6 py-8 text-center text-warm-muted">
                <Package size={32} className="mx-auto mb-2 text-warm-success" />
                <p>Stock is healthy</p>
                <p className="text-sm text-warm-dim">No items are currently running low.</p>
              </div>
            )}
          </section>

          {/* Reminders */}
          <section className="bg-warm-surface border border-warm-border-warm rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-warm-border">
              <h3 className="text-lg font-semibold text-warm-fg font-display flex items-center gap-2">
                <Bell size={18} className="text-warm-accent" />
                Upcoming Reminders
              </h3>
            </div>
            {reminders && reminders.length > 0 ? (
              <ul className="divide-y divide-warm-border">
                {reminders.slice(0, 5).map((reminder: { id: string, title: string, reminderDate: string, description: string | null }) => (
                  <li key={reminder.id} className="flex flex-col gap-1 px-6 py-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-warm-fg">{reminder.title}</span>
                      <span className="text-xs text-warm-muted">
                        {format(parseISO(reminder.reminderDate), 'dd MMM')}
                      </span>
                    </div>
                    {reminder.description && (
                      <span className="text-xs text-warm-muted line-clamp-1">{reminder.description}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-6 py-8 text-center text-warm-muted">
                <p>No upcoming reminders</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
