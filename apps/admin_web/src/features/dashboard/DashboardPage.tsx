import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { DollarSign, AlertTriangle, Package, TrendingUp, Bell, BarChart3, Wallet, ArrowUpRight, ArrowDownRight, Scale } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SkeletonCard, SkeletonBlock, ErrorState, EmptyState } from '../../components/PageState';
import { useRealtimeSubscription } from '../../hooks/useRealtime';
import { useNotify } from '../../components/NotificationContext';
import { MetricCard } from '../../components/data-display/MetricCard';
import { format, subDays, parseISO } from 'date-fns';
import clsx from 'clsx';

export function DashboardPage() {
  const { storeId } = useAuth();
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
    queryFn: () => api.dashboard.getStats(storeId),
  });
  const lowStockQuery = useQuery({
    queryKey: ['low-stock', storeId],
    queryFn: () => api.dashboard.getLowStock(storeId),
  });

  // Fetch daily sales data for comparison
  const dailySalesQuery = useQuery({
    queryKey: ['daily-sales-comparison', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from('daily_sales')
        .select('*')
        .eq('store_id', storeId)
        .order('sale_date', { ascending: false })
        .limit(30);
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
  const totalRevenue = dailySales.reduce((sum: number, s: any) => sum + Number(s.total_sales || 0), 0);
  const totalCash = dailySales.reduce((sum: number, s: any) => sum + Number(s.cash_amount || 0), 0);
  const totalBkash = dailySales.reduce((sum: number, s: any) => sum + Number(s.bkash_amount || 0), 0);
  const totalCredit = dailySales.reduce((sum: number, s: any) => sum + Number(s.credit_amount || 0), 0);
  const totalExpensesAllTime = dailySales.reduce((sum: number, s: any) => sum + Number(s.daily_expense || 0), 0);
  const totalStockAllTime = dailySales.reduce((sum: number, s: any) => sum + Number(s.stock_purchase || 0), 0);
  const netPosition = totalRevenue - totalExpensesAllTime;

  // Expense breakdown by category from expenses table
  const expenseCategories: Record<string, number> = expenses.reduce((acc: Record<string, number>, e: any) => {
    const cat = e.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);
  const expenseTotalFromItems: number = Object.values(expenseCategories)
    .reduce((sum: number, v) => sum + (v as number), 0);

  // Map category names to display labels and colors
  const categoryConfig: Record<string, { label: string; color: string; bg: string }> = {
    'Stock Purchase': { label: 'Stock Purchase', color: 'text-primary', bg: 'bg-primary/15' },
    'Capital Expenditure': { label: 'Capital', color: 'text-warning-dark', bg: 'bg-warning/15' },
    'Staff salary': { label: 'Staff Salary', color: 'text-info', bg: 'bg-info/15' },
    'Utility Expenses': { label: 'Utilities', color: 'text-success', bg: 'bg-success/15' },
    'All Other Expenses': { label: 'Other', color: 'text-text-muted', bg: 'bg-surface-secondary' },
    'Partners Take': { label: 'Partners Take', color: 'text-danger', bg: 'bg-danger/15' },
    'Transport & Conveyance': { label: 'Transport', color: 'text-secondary', bg: 'bg-secondary/15' },
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
      sales: Number(s.total_sales || 0),
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
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">Welcome {stats?.user?.name || 'Mohammed'}</h1>
        <p className="text-text-muted mt-1">Here's what's happening today.</p>
      </header>

      <div className="dashboard-grid">
        <MetricCard
          title="Today Sales"
          value={`৳${stats?.total_sales || '0.00'}`}
          icon={<TrendingUp size={20} />}
          color="success"
          trend={salesTrend ?? undefined}
          badge={salesTrend ? `${salesTrend === 'up' ? '↑' : '↓'} vs last week` : undefined}
        />
        <MetricCard
          title="To Receive"
          value={`৳${fmt(totalCredit)}`}
          icon={<ArrowUpRight size={20} />}
          color="success"
          badge={`৳${stats?.to_receive ? Number(stats.to_receive).toLocaleString('en-BD', { maximumFractionDigits: 0 }) : '0'} outstanding`}
        />
        <MetricCard
          title="To Give"
          value={`৳${stats?.to_give || '0.00'}`}
          icon={<ArrowDownRight size={20} />}
          color="danger"
        />
        <MetricCard
          title="Total Revenue"
          value={`৳${fmt(totalRevenue)}`}
          icon={<DollarSign size={20} />}
          color="success"
          badge={`${dailySales.length} days`}
        />
        <MetricCard
          title="Total Expenses"
          value={`৳${fmt(totalExpensesAllTime)}`}
          icon={<AlertTriangle size={20} />}
          color="danger"
          badge={`${dailySales.length} days`}
        />
        <MetricCard
          title="Net Position"
          value={`৳${fmt(Math.abs(netPosition))}`}
          icon={<Scale size={20} />}
          color={netPosition >= 0 ? 'success' : 'danger'}
          badge={netPosition >= 0 ? 'Profit' : 'Loss'}
        />
      </div>

      {/* Financial Overview - KPI Summary */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Financial Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Revenue Breakdown */}
          <div className="bg-surface rounded-md border border-border-default shadow-level-1 p-5">
            <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">Revenue Breakdown</h3>
            <div className="text-2xl font-bold font-mono text-success mb-3">৳{fmt(totalRevenue)}</div>
            <div className="space-y-2">
              {[
                { label: 'Cash', value: totalCash, total: totalRevenue, color: 'bg-success' },
                { label: 'bKash', value: totalBkash, total: totalRevenue, color: 'bg-info' },
                { label: 'Credit', value: totalCredit, total: totalRevenue, color: 'bg-warning' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">{item.label}</span>
                    <span className="font-mono font-medium text-text-primary">৳{fmt(item.value)}</span>
                  </div>
                  <div className="h-1.5 bg-surface-secondary rounded-full mt-1 overflow-hidden">
                    <div className={item.color} style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%`, borderRadius: 'inherit', minHeight: item.value > 0 ? 4 : 0 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="bg-surface rounded-md border border-border-default shadow-level-1 p-5">
            <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">Expense Breakdown</h3>
            <div className="text-2xl font-bold font-mono text-danger mb-3">৳{fmt(expenseTotalFromItems)}</div>
            <div className="space-y-2">
              {(Object.entries(expenseCategories as Record<string, number>) as [string, number][])
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([cat, amount]) => {
                  const config = categoryConfig[cat] || { label: cat, color: 'text-text-muted', bg: 'bg-surface-secondary' };
                  const pct = expenseTotalFromItems > 0 ? (amount / expenseTotalFromItems) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm">
                        <span className={config.color}>{config.label}</span>
                        <span className="font-mono text-text-primary">৳{fmt(amount)} <span className="text-text-muted">({pct.toFixed(1)}%)</span></span>
                      </div>
                      <div className="h-1.5 bg-surface-secondary rounded-full mt-1 overflow-hidden">
                        <div className={config.bg} style={{ width: `${pct}%`, borderRadius: 'inherit', minHeight: amount > 0 ? 4 : 0 }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Investment Summary */}
          <div className="bg-surface rounded-md border border-border-default shadow-level-1 p-5">
            <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">Investment Summary</h3>
            <div className="space-y-3 mt-2">
              <div className="flex justify-between items-center py-2 border-b border-border-default">
                <span className="text-text-secondary">Mohammed</span>
                <span className="font-mono font-medium text-primary">৳{fmt(553000)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border-default">
                <span className="text-text-secondary">Sayeed Imam</span>
                <span className="font-mono font-medium text-primary">৳{fmt(965490)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border-default">
                <span className="font-semibold text-text-primary">Total Capital</span>
                <span className="font-mono font-bold text-lg text-primary">৳{fmt(1518490)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border-default">
                <span className="text-text-secondary">Stock Investment</span>
                <span className="font-mono font-medium text-info">৳{fmt(totalStockAllTime)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border-default">
                <span className="text-text-secondary">Total Revenue</span>
                <span className="font-mono font-medium text-success">৳{fmt(totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className={clsx('font-semibold', netPosition >= 0 ? 'text-success-dark' : 'text-danger')}>
                  {netPosition >= 0 ? 'Net Profit' : 'Net Loss'}
                </span>
                <span className={clsx('font-mono font-bold text-lg', netPosition >= 0 ? 'text-success-dark' : 'text-danger')}>
                  ৳{fmt(Math.abs(netPosition))}
                </span>
              </div>
              <div className="text-xs text-text-muted mt-1">
                Revenue covers {(totalRevenue / totalExpensesAllTime * 100).toFixed(1)}% of total expenses
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sales vs Expenses Comparison Section */}
      <div className="grid grid-cols-2 gap-6 mt-8">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              Sales vs Expenses (Last 14 Days)
            </h2>
            <div className="bg-surface rounded-md border border-border-default shadow-level-1 p-6">
              {salesVsExpenses.length > 0 && (
                <>
                  <div className="flex items-center gap-6 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-success" />
                      <span className="text-sm text-text-muted">Sales</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-danger" />
                      <span className="text-sm text-text-muted">Expenses</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-info" />
                      <span className="text-sm text-text-muted">Stock Purchases</span>
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-1" style={{ height: '200px' }}>
                    {salesVsExpenses.map((day: { date: string; label: string; sales: number; expenses: number; stockPurchases: number }, idx: number) => {
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
                                backgroundColor: 'var(--color-success-default)',
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
                                backgroundColor: 'var(--color-danger-default)',
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
                                backgroundColor: 'var(--color-info-default)',
                                borderRadius: '2px 2px 0 0',
                                minHeight: day.stockPurchases > 0 ? 4 : 0,
                                transition: 'height 0.3s ease',
                              }}
                              title={`Stock: ৳${day.stockPurchases.toLocaleString()}`}
                            />
                          </div>
                          <span className="text-xs text-text-muted whitespace-nowrap" style={{ fontSize: '10px' }}>
                            {day.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {salesVsExpenses.length === 0 && (
                <div className="text-center text-text-muted py-8">
                  No daily sales data available. <a href="/admin/daily-sales" className="text-primary-default hover:underline">Add daily sales</a>
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">Low Stock Alerts</h2>
            <div className="bg-surface rounded-md border border-border-default shadow-level-1">
              {lowStock && lowStock.length > 0 ? (
                <ul className="divide-y divide-border-default">
                  {lowStock.slice(0, 5).map((item: { id: string, name: string, quantity: number }) => (
                    <li key={item.id} className="flex justify-between items-center px-4 py-3">
                      <span className="text-sm text-text-primary">{item.name}</span>
                      <span className="text-sm font-semibold text-danger">{item.quantity} left</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={<AlertTriangle size={48} />}
                  title="Stock is healthy"
                  description="No items are currently running low."
                />
              )}
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">Total Balance</h2>
            <div className="bg-surface rounded-md border border-border-default shadow-level-1 p-8 text-center">
              <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Current Available Balance</div>
              <div className="text-4xl font-bold text-success font-mono">৳{stats?.total_balance || '0.00'}</div>
            </div>
          </section>

          {/* Payment Breakdown */}
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">Payment Breakdown</h2>
            <div className="bg-surface rounded-md border border-border-default shadow-level-1 p-6">
              {totalPayments > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-surface-secondary rounded-lg">
                      <div className="text-sm text-text-muted">Cash</div>
                      <div className="text-lg font-bold text-success">৳{paymentBreakdown.cash.toLocaleString('en-BD', { maximumFractionDigits: 0 })}</div>
                      <div className="text-xs text-text-muted">{totalPayments > 0 ? ((paymentBreakdown.cash / totalPayments) * 100).toFixed(1) : 0}%</div>
                    </div>
                    <div className="text-center p-3 bg-surface-secondary rounded-lg">
                      <div className="text-sm text-text-muted">Bkash</div>
                      <div className="text-lg font-bold text-info">৳{paymentBreakdown.bkash.toLocaleString('en-BD', { maximumFractionDigits: 0 })}</div>
                      <div className="text-xs text-text-muted">{totalPayments > 0 ? ((paymentBreakdown.bkash / totalPayments) * 100).toFixed(1) : 0}%</div>
                    </div>
                    <div className="text-center p-3 bg-surface-secondary rounded-lg">
                      <div className="text-sm text-text-muted">Credit</div>
                      <div className="text-lg font-bold text-warning">৳{paymentBreakdown.credit.toLocaleString('en-BD', { maximumFractionDigits: 0 })}</div>
                      <div className="text-xs text-text-muted">{totalPayments > 0 ? ((paymentBreakdown.credit / totalPayments) * 100).toFixed(1) : 0}%</div>
                    </div>
                  </div>
                  <div className="h-2 bg-surface-secondary rounded-full overflow-hidden flex">
                    {totalPayments > 0 && (
                      <>
                        <div 
                          className="bg-success" 
                          style={{ width: `${(paymentBreakdown.cash / totalPayments) * 100}%` }} 
                        />
                        <div 
                          className="bg-info" 
                          style={{ width: `${(paymentBreakdown.bkash / totalPayments) * 100}%` }} 
                        />
                        <div 
                          className="bg-warning" 
                          style={{ width: `${(paymentBreakdown.credit / totalPayments) * 100}%` }} 
                        />
                      </>
                    )}
                  </div>
                  <div className="text-center text-sm text-text-muted mt-2">
                    Total: ৳{totalPayments.toLocaleString('en-BD', { maximumFractionDigits: 0 })}
                  </div>
                </>
              ) : (
                <div className="text-center text-text-muted py-4">
                  No sales data available
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">Upcoming Reminders</h2>
            <div className="bg-surface rounded-md border border-border-default shadow-level-1">
              {reminders && reminders.length > 0 ? (
                <ul className="divide-y divide-border-default">
                  {reminders.slice(0, 5).map((reminder: { id: string, title: string, reminderDate: string, description: string | null }) => (
                    <li key={reminder.id} className="flex flex-col gap-1 px-4 py-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-text-primary">{reminder.title}</span>
                        <span className="text-xs text-text-muted">{new Date(reminder.reminderDate).toLocaleDateString()}</span>
                      </div>
                      {reminder.description && (
                        <p className="text-sm text-text-muted">{reminder.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={<Bell size={48} />}
                  title="No upcoming reminders"
                  description="You are all caught up."
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
