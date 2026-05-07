import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { DollarSign, AlertTriangle, Package, TrendingUp, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SkeletonCard, SkeletonBlock, ErrorState, EmptyState } from '../../components/PageState';
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
          .gte('date', dateStr)
          .lt('date', nextDateStr);

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
      <div className="dashboard-container">
        <header className="mb-8">
          <SkeletonBlock className="w-[200px] h-7" />
          <SkeletonBlock className="w-[260px] h-[18px] mt-2" />
        </header>
        <div className="dashboard-grid">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
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
        <ErrorState message="Failed to load dashboard data." onRetry={() => { statsQuery.refetch(); lowStockQuery.refetch(); }} />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: '700', color: 'var(--text-main)' }}>Welcome {stats?.user?.name || 'Mohammed'}</h1>
        <p style={{ color: 'var(--text-muted)' }}>Here's what's happening today.</p>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginTop: 'var(--space-8)' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <section>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '600', marginBottom: 'var(--space-4)' }}>
              Cashflow Overview
            </h2>
            <div className="card" style={{ padding: 'var(--space-6)' }}>
              {cashflow.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <div style={{ width: 12, height: 12, backgroundColor: 'var(--color-success)', borderRadius: 2 }}></div>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Revenue</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <div style={{ width: 12, height: 12, backgroundColor: 'var(--color-danger)', borderRadius: 2 }}></div>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Expenses</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '200px', gap: 'var(--space-2)' }}>
                    {cashflow.map((day: { date: string, label: string, revenue: number, expenses: number }, idx: number) => {
                      const maxVal = Math.max(...cashflow.map((d: { revenue: number, expenses: number }) => Math.max(d.revenue, d.expenses)), 1);
                      const revenueHeight = maxVal > 0 ? (day.revenue / maxVal) * 100 : 0;
                      const expenseHeight = maxVal > 0 ? (day.expenses / maxVal) * 100 : 0;
                      return (
                        <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: '100%', width: '100%', justifyContent: 'center' }}>
                            <div
                              style={{
                                width: '40%',
                                height: `${revenueHeight}%`,
                                backgroundColor: 'var(--color-success)',
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
                                backgroundColor: 'var(--color-danger)',
                                borderRadius: '2px 2px 0 0',
                                minHeight: day.expenses > 0 ? 4 : 0,
                                transition: 'height 0.3s ease',
                              }}
                              title={`Expenses: ৳${day.expenses.toLocaleString()}`}
                            />
                          </div>
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{day.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '600', marginBottom: 'var(--space-4)' }}>
              Low Stock Alerts
            </h2>
            <div className="card">
              {lowStock && lowStock.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {lowStock.slice(0, 5).map((item: { id: string, name: string, quantity: number }) => (
                    <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-light)' }}>
                      <span>{item.name}</span>
                      <span style={{ color: 'var(--color-danger)', fontWeight: '600' }}>{item.quantity} left</span>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <section>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '600', marginBottom: 'var(--space-4)' }}>
              Total Balance
            </h2>
            <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Current Available Balance</div>
              <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: '700', color: 'var(--color-success)' }}>৳{stats?.total_balance || '0.00'}</div>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '600', marginBottom: 'var(--space-4)' }}>
              Upcoming Reminders
            </h2>
            <div className="card">
              {reminders && reminders.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {reminders.slice(0, 5).map((reminder: { id: string, title: string, reminderDate: string, description: string | null }) => (
                    <li key={reminder.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{reminder.title}</span>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{new Date(reminder.reminderDate).toLocaleDateString()}</span>
                      </div>
                      {reminder.description && (
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{reminder.description}</p>
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
