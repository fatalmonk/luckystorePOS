import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { DollarSign, AlertTriangle, Package, TrendingUp, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SkeletonCard, SkeletonBlock, ErrorState, EmptyState } from '../../components/PageState';
import { useRealtimeSubscription } from '../../hooks/useRealtime';
import { useNotify } from '../../components/NotificationContext';
import { MetricCard } from '../../components/data-display/MetricCard';
import { format, parseISO } from 'date-fns';

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

  // Calculate stock purchases from expenses filtered by category
  const totalStockPurchases = expenses
    .filter((e: { category: string }) => e.category === 'Stock Purchase')
    .reduce((sum: number, e: { amount: number }) => sum + Number(e.amount), 0);

  // Sales vs Expenses comparison from daily_sales
  const salesVsExpenses = dailySales
    .slice(0, 14)
    .reverse()
    .map((s: { sale_date: string; total_sales: number; daily_expense: number; stock_purchase: number }) => ({
      date: s.sale_date,
      label: format(parseISO(s.sale_date), 'dd MMM'),
      sales: Number(s.total_sales || 0),
      expenses: Number(s.daily_expense || 0),
      stockPurchases: Number(s.stock_purchase || 0),
    }));

  // Payment breakdown from daily_sales
  const paymentBreakdown = dailySales.reduce(
    (acc: { cash: number; bkash: number; credit: number }, s: { cash_amount: number; bkash_amount: number; credit_amount: number }) => ({
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
          title="To Receive"
          value={`৳${stats?.to_receive || '0.00'}`}
          icon={<DollarSign size={20} />}
          color="success"
        />
        <MetricCard
          title="To Give"
          value={`৳${stats?.to_give || '0.00'}`}
          icon={<DollarSign size={20} />}
          color="danger"
        />
        <MetricCard
          title="Today Sales"
          value={`৳${stats?.total_sales || '0.00'}`}
          icon={<TrendingUp size={20} />}
          color="success"
        />
        <MetricCard
          title="Stock Purchases"
          value={`৳${totalStockPurchases.toLocaleString('en-BD', { maximumFractionDigits: 0 })}`}
          icon={<Package size={20} />}
          color="info"
        />
        <MetricCard
          title="Expense"
          value={`৳${stats?.total_expenses || '0.00'}`}
          icon={<AlertTriangle size={20} />}
          color="danger"
        />
      </div>

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
