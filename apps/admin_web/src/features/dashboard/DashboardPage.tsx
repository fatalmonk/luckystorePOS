import React, { useState } from 'react';
import { clsx } from "clsx";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { AlertTriangle, Package, TrendingUp, Bell, ArrowUpRight, ArrowDownRight, Scale, Zap, PlusCircle, ShoppingBag } from 'lucide-react';
import { supabase } from "@/lib/supabase";
import { SkeletonCard, SkeletonBlock, ErrorState } from '../../components/PageState';
import { useRealtimeSubscription } from '../../hooks/useRealtime';
import { useNotify } from '../../components/NotificationContext';
import { HeaderStats } from './HeaderStats';
import { TrendCard } from './TrendCard';
import { CashflowChart } from './CashflowChart';
import { RecentActivity } from './RecentActivity';
import { format, subDays, parseISO } from 'date-fns';
import { formatCurrency } from '../../lib/format';

export function DashboardPage() {
  const { t } = useTranslation();
  const { storeId, user } = useAuth();
  const { notify } = useNotify();
  const queryClient = useQueryClient();
  const notifiedOrders = React.useRef<Set<string>>(new Set());

  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  // Typed API calls
  const missingMetricsQuery = useQuery({
    queryKey: ['dashboard-missing-metrics', storeId],
    queryFn: () => api.dashboard.getMissingMetrics(storeId!),
    enabled: !!storeId,
  });
  const missingMetrics = missingMetricsQuery.data || { toReceive: 0, toGive: 0, totalBalance: 0 };

  const monthlyTrendQuery = useQuery({
    queryKey: ['dashboard-monthly-trend', storeId],
    queryFn: () => api.dashboard.getMonthlyTrend(storeId!),
    enabled: !!storeId,
  });
  const trends = monthlyTrendQuery.data || {
    sales: { amount: 0, trend: 0 },
    purchase: { amount: 0, trend: 0 },
    expense: { amount: 0, trend: 0 }
  };

  const currentMonthName = format(new Date(), 'MMMM');

  const calculateProgress = () => {
    let score = 0;
    if (user?.name) score += 20;
    if (storeId) score += 40;
    if (missingMetricsQuery.isSuccess) score += 40;
    return Math.min(score, 100);
  };

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

  // Helper to play chime sound using Web Audio API (so no external assets are required)
  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5
      gain2.gain.setValueAtTime(0.15, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.3);
    } catch (e) {
      console.error('Failed to play notification chime', e);
    }
  };

  // Realtime order subscription (Postgres changes)
  useRealtimeSubscription({
    table: 'orders',
    event: 'INSERT',
    filter: storeId ? `store_id=eq.${storeId}` : undefined,
    invalidateKeys: [['dashboard-delivery-orders', storeId]],
    onEvent: (payload) => {
      const order = payload.new as any;
      if (order && order.order_number) {
        if (!notifiedOrders.current.has(order.order_number)) {
          notifiedOrders.current.add(order.order_number);
          playChime();
          notify(`Critical: New Delivery Order ${order.order_number} placed!`, 'success');
        }
      }
    },
  });

  // Realtime order subscription (Broadcast Channel)
  React.useEffect(() => {
    if (!storeId) return;
    const channel = supabase.channel(`store-notifications:${storeId}`);
    channel.on('broadcast', { event: 'new-delivery-order' }, (payload: any) => {
      const order = payload.payload;
      if (order && order.orderNumber) {
        if (!notifiedOrders.current.has(order.orderNumber)) {
          notifiedOrders.current.add(order.orderNumber);
          playChime();
          notify(`Critical: New Delivery Order ${order.orderNumber} placed!`, 'success');
          queryClient.invalidateQueries({ queryKey: ['dashboard-delivery-orders', storeId] });
        }
      }
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, queryClient, notify]);

  // Query to fetch dashboard delivery orders
  const deliveryOrdersQuery = useQuery({
    queryKey: ['dashboard-delivery-orders', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!storeId,
  });
  const deliveryOrders = deliveryOrdersQuery.data || [];

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

  const retailKpisQuery = useQuery({
    queryKey: ['retail-kpis', storeId],
    queryFn: () => api.dashboard.getRetailKpis(storeId!, 30),
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
  const kpis: any = retailKpisQuery.data || {};
  const dailySales = dailySalesQuery.data || [];
  const expenses = expensesQuery.data || [];
  const isLoading = statsQuery.isLoading || dailySalesQuery.isLoading || expensesQuery.isLoading;
  const isError = statsQuery.isError || dailySalesQuery.isError || expensesQuery.isError;

  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'operations'>('overview');

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
  const getCategoryConfig = (cat: string) => {
    const config: Record<string, { label: string; color: string; barColor: string }> = {
      'Stock Purchase': { label: 'Stock Purchase', color: 'text-warm-accent', barColor: 'bg-warm-accent' },
      'Capital Expenditure': { label: t('dashboard.capital'), color: 'text-warm-warning', barColor: 'bg-warm-warning' },
      'Staff salary': { label: 'Staff Salary', color: 'text-primary-default', barColor: 'bg-primary-subtle0' },
      'Utility Expenses': { label: 'Utilities', color: 'text-warm-success', barColor: 'bg-warm-success' },
      'All Other Expenses': { label: 'Other', color: 'text-warm-dim', barColor: 'bg-warm-silver' },
      'Partners Take': { label: 'Partners Take', color: 'text-warm-danger', barColor: 'bg-warm-danger' },
      'Transport & Conveyance': { label: 'Transport', color: 'text-warm-charcoal', barColor: 'bg-warm-charcoal' },
    };
    return config[cat] || { label: cat, color: 'text-warm-muted', barColor: 'bg-warm-muted' };
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
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-warm-fg font-display">
            {t('dashboard.welcome')}, {user?.name || stats?.user?.name || 'Mohammed'}
          </h1>
          <p className="text-warm-muted mt-1">Here&apos;s what&apos;s happening today.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsSalesModalOpen(true)}
            className="flex items-center gap-2 bg-warm-success text-white px-4 py-2 rounded-lg font-medium hover:bg-warm-success/90 transition-colors"
          >
            <PlusCircle size={18} /> Add Sales
          </button>
          <button 
            onClick={() => setIsPurchaseModalOpen(true)}
            className="flex items-center gap-2 bg-warm-accent text-white px-4 py-2 rounded-lg font-medium hover:bg-warm-accent/90 transition-colors"
          >
            <ShoppingBag size={18} /> Add Purchase
          </button>
        </div>
      </header>

      {/* Monthly Trends */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <TrendCard 
          title={`Sales (${currentMonthName})`}
          amount={trends.sales.amount} 
          trend={trends.sales.trend} 
        />
        <TrendCard 
          title={`Purchase (${currentMonthName})`}
          amount={trends.purchase.amount} 
          trend={trends.purchase.trend} 
          inverseTrend={true}
        />
        <TrendCard 
          title={`Expense (${currentMonthName})`}
          amount={trends.expense.amount} 
          trend={trends.expense.trend} 
          inverseTrend={true}
        />
      </div>

      {/* Missing Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-warm-surface border-l-4 border-l-warm-success border-y border-r border-warm-border-warm rounded-r-xl p-6 shadow-sm">
          <span className="text-warm-muted text-xs font-semibold uppercase tracking-wider">To Receive</span>
          <h2 className="text-2xl font-bold text-warm-fg mt-2 font-mono">৳{fmt(missingMetrics.toReceive)}</h2>
        </div>
        <div className="bg-warm-surface border-l-4 border-l-warm-danger border-y border-r border-warm-border-warm rounded-r-xl p-6 shadow-sm">
          <span className="text-warm-muted text-xs font-semibold uppercase tracking-wider">To Give</span>
          <h2 className="text-2xl font-bold text-warm-fg mt-2 font-mono">৳{fmt(missingMetrics.toGive)}</h2>
        </div>
        <div className="bg-warm-surface border border-warm-border-warm rounded-xl p-6 shadow-sm">
          <span className="text-warm-muted text-xs font-semibold uppercase tracking-wider">Total Balance (Cash & Bank)</span>
          <h2 className="text-2xl font-bold text-primary-default mt-2 font-mono">৳{fmt(missingMetrics.totalBalance)}</h2>
        </div>
      </div>

      {/* Header Stats */}
      <div className="mb-8">
        <HeaderStats
          todaySales={`৳${stats?.total_sales || '0.00'}`}
          totalRevenue={fmt(totalRevenue)}
          netProfit={fmt(Math.abs(netPosition))}
          atv={fmt(Number(kpis.atv) || 0)}
          upt={Number(kpis.upt || 0).toFixed(1)}
          grossMargin={`${Number(kpis.gross_margin_pct || 0).toFixed(1)}%`}
          salesTrend={salesTrend || undefined}
          profitTrend={netPosition >= 0 ? 'up' : 'down'}
          atvTrend="up"
        />
      </div>

      {/* Tab Navigation buttons */}
      <div className="flex border-b border-warm-border-warm gap-2 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={clsx(
            'px-5 py-2.5 font-bold text-sm border-b-[3px] transition-all duration-200',
            activeTab === 'overview'
              ? 'border-warm-accent text-warm-accent bg-warm-accent/5'
              : 'border-transparent text-warm-muted hover:text-warm-fg hover:bg-warm-border-warm/30'
          )}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('financials')}
          className={clsx(
            'px-5 py-2.5 font-bold text-sm border-b-[3px] transition-all duration-200',
            activeTab === 'financials'
              ? 'border-warm-accent text-warm-accent bg-warm-accent/5'
              : 'border-transparent text-warm-muted hover:text-warm-fg hover:bg-warm-border-warm/30'
          )}
        >
          Financials
        </button>
        <button
          onClick={() => setActiveTab('operations')}
          className={clsx(
            'px-5 py-2.5 font-bold text-sm border-b-[3px] transition-all duration-200',
            activeTab === 'operations'
              ? 'border-warm-accent text-warm-accent bg-warm-accent/5'
              : 'border-transparent text-warm-muted hover:text-warm-fg hover:bg-warm-border-warm/30'
          )}
        >
          Operations
        </button>
      </div>

      {/* Tab Contents */}
      <div className="tab-content transition-all duration-300">
        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            {/* Left Column - CashflowChart & Sales vs Expenses Chart */}
            <div className="lg:col-span-2 space-y-8">
              {/* Delivery Orders Widget */}
              <div className="bg-warm-surface border border-warm-border-warm rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-semibold text-warm-muted uppercase tracking-wider flex items-center gap-2">
                    <ShoppingBag size={14} className="text-warm-accent" />
                    Recent Delivery Orders
                  </h3>
                  <a href="/admin/delivery-orders" className="text-xs text-warm-accent hover:underline font-bold">
                    View All
                  </a>
                </div>
                {deliveryOrders.length === 0 ? (
                  <p className="text-sm text-warm-muted py-2">No recent delivery orders.</p>
                ) : (
                  <div className="divide-y divide-warm-border-warm/40">
                    {deliveryOrders.map((ord: any) => (
                      <div key={ord.id} className="py-3 flex justify-between items-center text-xs first:pt-0 last:pb-0">
                        <div>
                          <p className="font-mono font-bold text-warm-fg">{ord.order_number}</p>
                          <p className="text-warm-muted mt-0.5">{ord.customer_name} · {ord.customer_phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-warm-success">{formatCurrency(ord.total)}</p>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mt-1 uppercase ${
                            ord.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            ord.status === 'confirmed' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            ord.status === 'preparing' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                            ord.status === 'out_for_delivery' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                            ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {ord.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <CashflowChart />

              {/* Sales vs Expenses Comparison Section */}
              <div className="bg-warm-surface border border-warm-border-warm rounded-xl shadow-sm p-6">
                <h3 className="text-xs font-semibold text-warm-muted uppercase tracking-wider mb-4">
                  {t('dashboard.salesVsExpenses')}
                </h3>
                {salesVsExpenses.length > 0 ? (
                  <>
                    <div className="flex items-center gap-6 mb-6">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-warm-success" />
                        <span className="text-sm text-warm-muted">Sales</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-warm-danger" />
                        <span className="text-sm text-warm-muted">Expenses</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-warm-accent" />
                        <span className="text-sm text-warm-muted">Stock Purchases</span>
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-1 h-[200px]">
                      {salesVsExpenses.map((day: any, idx: number) => {
                        const maxVal = Math.max(
                          ...salesVsExpenses.map((d: any) => Math.max(d.sales, d.expenses, d.stockPurchases)),
                          1
                        );
                        const salesHeight = maxVal > 0 ? (day.sales / maxVal) * 100 : 0;
                        const expenseHeight = maxVal > 0 ? (day.expenses / maxVal) * 100 : 0;
                        const stockHeight = maxVal > 0 ? (day.stockPurchases / maxVal) * 100 : 0;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                            <div className="flex items-end gap-0.5 w-full justify-center h-full">
                              <div
                                style={{
                                  width: '28%',
                                  height: `${salesHeight}%`,
                                  backgroundColor: 'var(--color-success-default)',
                                  borderRadius: '2px 2px 0 0',
                                  minHeight: day.sales > 0 ? 4 : 0,
                                  transition: 'height 0.3s ease',
                                }}
                                title={`Sales: ${formatCurrency(day.sales)}`}
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
                                title={`Expenses: ${formatCurrency(day.expenses)}`}
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
                                title={`Stock: ${formatCurrency(day.stockPurchases)}`}
                              />
                            </div>
                            <span className="text-[10px] text-warm-muted whitespace-nowrap mt-1">
                              {day.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center text-warm-muted py-8">
                    {t('dashboard.noDailySales')}{' '}
                    <a href="/admin/daily-sales" className="text-primary-default hover:underline">
                      {t('dashboard.addDailySales')}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Recent Activity & Info widgets */}
            <div className="space-y-8">
              {/* Profile setup onboarding progress */}
              <section className="bg-warm-surface border border-warm-border-warm rounded-xl shadow-sm p-6 flex gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-12 h-12 text-warm-accent" viewBox="0 0 36 36">
                    <path
                      className="text-warm-border"
                      strokeWidth="3"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-warm-accent"
                      strokeDasharray={`${calculateProgress()}, 100`}
                      strokeWidth="3"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <text x="18" y="21" className="font-bold text-[9px] text-warm-fg" fill="currentColor" textAnchor="middle">
                      {calculateProgress()}%
                    </text>
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-warm-fg font-display">Complete your Profile</h4>
                  <p className="text-xs text-warm-muted mt-1">Unlock additional reporting metrics by finalizing setup.</p>
                </div>
              </section>

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

              {/* Available balance card */}
              <section className="bg-warm-surface border border-warm-border-warm rounded-xl shadow-sm p-6 text-center">
                <div className="text-xs font-semibold text-warm-muted uppercase tracking-wider mb-2">
                  {t('dashboard.currentAvailableBalance')}
                </div>
                <div className="text-4xl font-bold text-warm-success font-mono">৳{fmt(availableBalance)}</div>
                <div className="text-sm text-warm-muted mt-1">Capital + Revenue − Expenses</div>
              </section>

              <RecentActivity />
            </div>
          </div>
        )}

        {/* Tab 2: Financials */}
        {activeTab === 'financials' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
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
                  { label: 'Credit (Due)', value: totalCredit, total: totalRevenue, color: 'bg-warm-warning' },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-warm-muted">{item.label}</span>
                      <span className="font-semibold text-warm-fg">
                        ৳{fmt(item.value)} ({item.total > 0 ? ((item.value / item.total) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                    <div className="h-2 bg-warm-border rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color}`}
                        style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}
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
              <div className="text-2xl font-bold text-warm-danger font-mono mb-4">
                ৳{fmt(expenseTotalFromItems)}
              </div>
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {Object.entries(expenseCategories).map(([cat, amount], idx) => {
                  const cfg = getCategoryConfig(cat);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-warm-muted truncate max-w-[120px]">{cfg.label}</span>
                        <span className={`font-semibold ${cfg.color}`}>
                          ৳{fmt(amount)} ({expenseTotalFromItems > 0 ? ((amount / expenseTotalFromItems) * 100).toFixed(0) : 0}%)
                        </span>
                      </div>
                      <div className="h-2 bg-warm-border rounded-full overflow-hidden">
                        <div
                          className={`h-full ${cfg.barColor}`}
                          style={{ width: `${expenseTotalFromItems > 0 ? (amount / expenseTotalFromItems) * 100 : 0}%` }}
                        />
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
              <div className="text-2xl font-bold text-primary-default font-mono mb-4">৳{fmt(partnerCapital)}</div>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-warm-border">
                  <span className="text-sm text-warm-muted">Mohammed (553k)</span>
                  <span className="text-sm font-semibold text-warm-fg">36.4%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-warm-border">
                  <span className="text-sm text-warm-muted">Sayeed (965.5k)</span>
                  <span className="text-sm font-semibold text-warm-fg">63.6%</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-warm-muted">Store Net Position</span>
                  <span className={`text-sm font-bold ${netPosition >= 0 ? 'text-warm-success' : 'text-warm-danger'}`}>
                    {netPosition >= 0 ? `৳${fmt(netPosition)} Surplus` : `৳${fmt(Math.abs(netPosition))} Deficit`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Operations */}
        {activeTab === 'operations' && (
          <div className="space-y-8 animate-fade-in">
            {/* Delivery Orders Widget */}
            <section className="bg-warm-surface border border-warm-border-warm rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-warm-border flex justify-between items-center">
                <h3 className="text-lg font-semibold text-warm-fg font-display flex items-center gap-2">
                  <ShoppingBag size={18} className="text-warm-accent" />
                  Active Delivery Orders
                </h3>
                <a href="/admin/delivery-orders" className="text-xs text-warm-accent hover:underline font-bold">
                  Manage Orders
                </a>
              </div>
              {deliveryOrders.filter((o: any) => o.status !== 'delivered' && o.status !== 'cancelled').length === 0 ? (
                <div className="px-6 py-8 text-center text-warm-muted">
                  <ShoppingBag size={32} className="mx-auto mb-2 text-warm-success" />
                  <p>No active delivery orders</p>
                </div>
              ) : (
                <div className="divide-y divide-warm-border">
                  {deliveryOrders
                    .filter((o: any) => o.status !== 'delivered' && o.status !== 'cancelled')
                    .slice(0, 5)
                    .map((ord: any) => (
                      <div key={ord.id} className="px-6 py-3.5 flex justify-between items-center">
                        <div className="space-y-1">
                          <p className="text-sm font-mono font-bold text-warm-fg">{ord.order_number}</p>
                          <p className="text-xs text-warm-muted">
                            {ord.customer_name} · {ord.customer_phone} · {ord.customer_address}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-sm font-mono font-bold text-warm-success">{formatCurrency(ord.total)}</p>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            ord.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            ord.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            ord.status === 'preparing' ? 'bg-purple-100 text-purple-800' :
                            'bg-indigo-100 text-indigo-800'
                          }`}>
                            {ord.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                    {lowStock.slice(0, 5).map((item: { item_id: string; item_name: string; current_qty: number }) => (
                      <li key={item.item_id} className="flex justify-between items-center px-6 py-3">
                        <span className="text-sm text-warm-fg">{item.item_name}</span>
                        <span className="text-sm font-semibold text-warm-danger">{item.current_qty} left</span>
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
        )}
      </div>

      {/* Quick Action Modals (Stubs) */}
      {isSalesModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-warm-surface rounded-xl p-6 max-w-md w-full relative">
            <h2 className="text-xl font-bold mb-4 font-display">Quick Add Sales</h2>
            <p className="text-warm-muted mb-6">Localized modal form for sales goes here.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsSalesModalOpen(false)} className="px-4 py-2 text-warm-fg bg-warm-border rounded-lg hover:bg-warm-border/80">Cancel</button>
              <button className="px-4 py-2 bg-warm-success text-white rounded-lg hover:bg-warm-success/90">Save</button>
            </div>
          </div>
        </div>
      )}

      {isPurchaseModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-warm-surface rounded-xl p-6 max-w-md w-full relative">
            <h2 className="text-xl font-bold mb-4 font-display">Quick Add Purchase</h2>
            <p className="text-warm-muted mb-6">Localized inventory intake form goes here.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsPurchaseModalOpen(false)} className="px-4 py-2 text-warm-fg bg-warm-border rounded-lg hover:bg-warm-border/80">Cancel</button>
              <button className="px-4 py-2 bg-warm-accent text-white rounded-lg hover:bg-warm-accent/90">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
