import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { DollarSign, AlertTriangle, Package, TrendingUp, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SkeletonCard, SkeletonBlock } from '../../components/PageState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageContainer } from '../../layouts/PageContainer';
import { PageHeader } from '../../layouts/PageHeader';
import { useRealtimeSubscription } from '../../hooks/useRealtime';
import { useNotify } from '../../components/NotificationContext';
import { MetricCard } from '../../components/data-display/MetricCard';

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

  // Fetch last 7 days revenue vs expenses
  const cashflowQuery = useQuery({
    queryKey: ['cashflow', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const days = 7;
      const data = [];
      const today = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDateStr = nextDate.toISOString().split('T')[0];

        // Get sales for this day
        const { data: salesData } = await supabase
          .from('sales')
          .select('total_amount')
          .eq('store_id', storeId)
          .eq('status', 'completed')
          .gte('created_at', dateStr)
          .lt('created_at', nextDateStr);

        // Get expenses for this day
        const { data: expensesData } = await supabase
          .from('expenses')
          .select('amount')
          .eq('store_id', storeId)
          .gte('expense_date', dateStr)
          .lt('expense_date', nextDateStr);

        const revenue = salesData?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
        const expenses = expensesData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

        data.push({
          date: dateStr,
          label: date.toLocaleDateString('en-US', { weekday: 'short' }),
          revenue,
          expenses,
        });
      }
      return data;
    },
    enabled: !!storeId,
  });

  const stats = statsQuery.data;
  const lowStock = lowStockQuery.data;
  const cashflow = cashflowQuery.data || [];
  const isLoading = statsQuery.isLoading || cashflowQuery.isLoading;
  const isError = statsQuery.isError || cashflowQuery.isError;

  if (isLoading) {
    return (
      <PageContainer className="dashboard-container">
        <PageHeader 
          title="Loading Dashboard..." 
          description="Gathering your latest statistics." 
        />
        <div className="dashboard-grid">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <section className="mt-12">
          <SkeletonBlock className="w-[160px] h-[22px] mb-6" />
          <div className="card skeleton-block h-[200px] opacity-30" />
        </section>
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer className="dashboard-container">
        <ErrorState message="Failed to load dashboard data." onRetry={() => { statsQuery.refetch(); lowStockQuery.refetch(); }} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="dashboard-container">
      <PageHeader 
        title={`Welcome ${stats?.user?.name || 'Mohammed'}`}
        description="Here's what's happening today." 
      />

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
          title="Purchase"
          value={`৳${stats?.total_purchases || '0.00'}`}
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

      <div className="grid grid-cols-2 gap-6 mt-8">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              Cashflow Overview
            </h2>
            <div className="bg-surface rounded-md border border-border-default shadow-level-1 p-6">
              {cashflow.length > 0 && (
                <>
                  <div className="flex items-center gap-6 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-success" />
                      <span className="text-sm text-text-muted">Revenue</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-danger" />
                      <span className="text-sm text-text-muted">Expenses</span>
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-2" style={{ height: '200px' }}
                  >
                    {cashflow.map((day: { date: string, label: string, revenue: number, expenses: number }, idx: number) => {
                      const maxVal = Math.max(...cashflow.map((d: { revenue: number, expenses: number }) => Math.max(d.revenue, d.expenses)), 1);
                      const revenueHeight = maxVal > 0 ? (day.revenue / maxVal) * 100 : 0;
                      const expenseHeight = maxVal > 0 ? (day.expenses / maxVal) * 100 : 0;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: '100%' }}>
                            <div
                              style={{
                                width: '40%',
                                height: `${revenueHeight}%`,
                                backgroundColor: 'var(--color-success-default)',
                                borderRadius: '2px 2px 0 0',
                                minHeight: day.revenue > 0 ? 4 : 0,
                                transition: 'height 0.3s ease',
                              }}
                              title={`Revenue: ৳${day.revenue.toLocaleString()}`}
                            />
                            <div
                              style={{
                                width: '40%',
                                height: `${expenseHeight}%`,
                                backgroundColor: 'var(--color-danger-default)',
                                borderRadius: '2px 2px 0 0',
                                minHeight: day.expenses > 0 ? 4 : 0,
                                transition: 'height 0.3s ease',
                              }}
                              title={`Expenses: ৳${day.expenses.toLocaleString()}`}
                            />
                          </div>
                          <span className="text-xs text-text-muted">{day.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
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
    </PageContainer>
  );
}
