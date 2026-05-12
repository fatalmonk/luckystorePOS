import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/layout/PageHeader';
import {
  BarChart3, TrendingUp, Package, Calendar, Download, Activity, Users, UserCheck,
} from 'lucide-react';
import { clsx } from 'clsx';
import { ErrorState, EmptyState, SkeletonBlock } from '../../components/PageState';
import { MetricCard } from '../../components/data-display/MetricCard';
import { useAuth } from '../../lib/AuthContext';
import { api } from '../../lib/api';
import { downloadCSV } from '../../lib/format';
import type {
  StockValuationItem,
  TopSellingItem,
  SlowMovingItem,
  DailyMovementItem,
  CustomerAnalyticsItem,
  StaffPerformanceItem,
} from '../../lib/api/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';

type DateRange = 'today' | 'week' | 'month' | 'custom';
type TabType = 'sales' | 'inventory' | 'profit' | 'analytics' | 'customers' | 'staff';
type AnalyticsSubTab = 'valuation' | 'top-sellers' | 'slow-movers' | 'movement';

export const ReportsPage: React.FC = () => {
  const { storeId } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('sales');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [analyticsSubTab, setAnalyticsSubTab] = useState<AnalyticsSubTab>('valuation');

  const dateParams = useMemo(() => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    switch (dateRange) {
      case 'today':
        return { start: formatDate(today), end: formatDate(today) };
      case 'week': {
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { start: formatDate(weekAgo), end: formatDate(today) };
      }
      case 'month': {
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { start: formatDate(monthAgo), end: formatDate(today) };
      }
      case 'custom':
        return {
          start: customStartDate || formatDate(today),
          end: customEndDate || formatDate(today)
        };
      default:
        return { start: formatDate(today), end: formatDate(today) };
    }
  }, [dateRange, customStartDate, customEndDate]);

  // Sales Report Query
  const salesQuery = useQuery({
    queryKey: ['sales-report', storeId, dateParams.start, dateParams.end],
    queryFn: () => {
      if (!storeId) return null;
      return api.reports.getSalesReport(storeId, dateParams.start, dateParams.end);
    },
    enabled: !!storeId && activeTab === 'sales',
  });

  // Previous period sales for WoW/MoM comparison
  const prevPeriodParams = useMemo(() => {
    const currStart = new Date(dateParams.start);
    const currEnd = new Date(dateParams.end);
    const days = Math.ceil((currEnd.getTime() - currStart.getTime()) / (86400000)) + 1;
    const prevEnd = new Date(currStart.getTime() - 86400000);
    const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86400000);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    return { start: fmt(prevStart), end: fmt(prevEnd) };
  }, [dateParams.start, dateParams.end]);

  const prevSalesQuery = useQuery({
    queryKey: ['sales-report-prev', storeId, prevPeriodParams.start, prevPeriodParams.end],
    queryFn: () => {
      if (!storeId) return null;
      return api.reports.getSalesReport(storeId, prevPeriodParams.start, prevPeriodParams.end);
    },
    enabled: !!storeId && activeTab === 'sales',
  });

  // Inventory Report Query
  const inventoryQuery = useQuery({
    queryKey: ['inventory-report', storeId],
    queryFn: () => {
      if (!storeId) return null;
      return api.reports.getInventoryValue(storeId);
    },
    enabled: !!storeId && activeTab === 'inventory',
  });

  // Profit & Loss Query
  const profitQuery = useQuery({
    queryKey: ['profit-report', storeId, dateParams.start, dateParams.end],
    queryFn: () => {
      if (!storeId) return null;
      return api.reports.getProfitLoss(storeId, dateParams.start, dateParams.end);
    },
    enabled: !!storeId && activeTab === 'profit',
  });

  // Analytics queries
  const valuationQuery = useQuery({
    queryKey: ['stock-valuation', storeId],
    queryFn: () => {
      if (!storeId) return null;
      return api.inventory.getStockValuation(storeId);
    },
    enabled: !!storeId && activeTab === 'analytics' && analyticsSubTab === 'valuation',
  });

  const topSellersQuery = useQuery({
    queryKey: ['top-selling-items', storeId],
    queryFn: () => {
      if (!storeId) return null;
      return api.inventory.getTopSellingItems(storeId);
    },
    enabled: !!storeId && activeTab === 'analytics' && analyticsSubTab === 'top-sellers',
  });

  const slowMoversQuery = useQuery({
    queryKey: ['slow-moving-items', storeId],
    queryFn: () => {
      if (!storeId) return null;
      return api.inventory.getSlowMovingItems(storeId);
    },
    enabled: !!storeId && activeTab === 'analytics' && analyticsSubTab === 'slow-movers',
  });

  const movementQuery = useQuery({
    queryKey: ['movement-trend', storeId],
    queryFn: () => {
      if (!storeId) return null;
      return api.inventory.getDailyMovementTrend(storeId);
    },
    enabled: !!storeId && activeTab === 'analytics' && analyticsSubTab === 'movement',
  });

  // Customer Analytics Query
  const customerQuery = useQuery({
    queryKey: ['customer-analytics', storeId],
    queryFn: () => {
      if (!storeId) return null;
      return api.reports.getCustomerAnalytics(storeId);
    },
    enabled: !!storeId && activeTab === 'customers',
  });

  // Staff Performance Query
  const staffQuery = useQuery({
    queryKey: ['staff-performance', storeId],
    queryFn: () => {
      if (!storeId) return null;
      return api.reports.getStaffPerformance(storeId);
    },
    enabled: !!storeId && activeTab === 'staff',
  });

  const isLoading = salesQuery.isLoading || inventoryQuery.isLoading || profitQuery.isLoading
    || valuationQuery.isLoading || topSellersQuery.isLoading || slowMoversQuery.isLoading || movementQuery.isLoading
    || customerQuery.isLoading || staffQuery.isLoading;
  const error = salesQuery.error || inventoryQuery.error || profitQuery.error
    || valuationQuery.error || topSellersQuery.error || slowMoversQuery.error || movementQuery.error
    || customerQuery.error || staffQuery.error;

  if (error) {
    return (
      <div className="p-6">
        <PageHeader title="Reports" subtitle="Business analytics and insights" />
        <ErrorState message="Failed to load reports." onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Business Reports"
        subtitle="View performance metrics, sales trends, and inventory stats."
        actions={
          <div className="flex items-center gap-2">
            {dateRange === 'custom' ? (
              <div className="flex items-center gap-2">
                <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="input text-sm" />
                <span className="text-text-muted">to</span>
                <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="input text-sm" />
              </div>
            ) : (
              <button className="button-outline gap-2">
                <Calendar size={18} />
                <span>
                  {dateRange === 'today' && 'Today'}
                  {dateRange === 'week' && 'Last 7 Days'}
                  {dateRange === 'month' && 'Last 30 Days'}
                </span>
              </button>
            )}
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRange)} className="input text-sm">
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-border-color">
        <button onClick={() => setActiveTab('sales')} className={clsx(
          'flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors',
          activeTab === 'sales' ? 'border-color-primary text-text-main' : 'border-transparent text-text-muted hover:text-text-main hover:border-border-color'
        )}>
          <BarChart3 size={18} /> Sales Report
        </button>
        <button onClick={() => setActiveTab('inventory')} className={clsx(
          'flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors',
          activeTab === 'inventory' ? 'border-color-primary text-text-main' : 'border-transparent text-text-muted hover:text-text-main hover:border-border-color'
        )}>
          <Package size={18} /> Inventory Value
        </button>
        <button onClick={() => setActiveTab('profit')} className={clsx(
          'flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors',
          activeTab === 'profit' ? 'border-color-primary text-text-main' : 'border-transparent text-text-muted hover:text-text-main hover:border-border-color'
        )}>
          <TrendingUp size={18} /> Profit & Loss
        </button>
        <button onClick={() => setActiveTab('analytics')} className={clsx(
          'flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors',
          activeTab === 'analytics' ? 'border-color-primary text-text-main' : 'border-transparent text-text-muted hover:text-text-main hover:border-border-color'
        )}>
          <Activity size={18} /> Inventory Analytics
        </button>
        <button onClick={() => setActiveTab('customers')} className={clsx(
          'flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors',
          activeTab === 'customers' ? 'border-color-primary text-text-main' : 'border-transparent text-text-muted hover:text-text-main hover:border-border-color'
        )}>
          <Users size={18} /> Customers
        </button>
        <button onClick={() => setActiveTab('staff')} className={clsx(
          'flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors',
          activeTab === 'staff' ? 'border-color-primary text-text-main' : 'border-transparent text-text-muted hover:text-text-main hover:border-border-color'
        )}>
          <UserCheck size={18} /> Staff
        </button>
      </div>

      {/* Tab Content */}
      <div className="card">
        {isLoading ? (
          <div className="p-8 space-y-4">
            <SkeletonBlock className="h-8 w-48" />
            <div className="grid grid-cols-4 gap-4">
              {Array(4).fill(0).map((_, i) => (<SkeletonBlock key={i} className="h-24" />))}
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'sales' && salesQuery.data && (
              <SalesReportContent data={salesQuery.data} prevData={prevSalesQuery.data} />
            )}
            {activeTab === 'inventory' && inventoryQuery.data && (
              <InventoryReportContent data={inventoryQuery.data} />
            )}
            {activeTab === 'profit' && profitQuery.data && (
              <ProfitReportContent data={profitQuery.data} />
            )}
            {activeTab === 'analytics' && (
              <InventoryAnalyticsContent
                subTab={analyticsSubTab}
                onSubTabChange={setAnalyticsSubTab}
                valuationData={valuationQuery.data}
                topSellersData={topSellersQuery.data}
                slowMoversData={slowMoversQuery.data}
                movementData={movementQuery.data}
              />
            )}
            {activeTab === 'customers' && customerQuery.data && (
              <CustomerAnalyticsContent data={customerQuery.data} />
            )}
            {activeTab === 'staff' && staffQuery.data && (
              <StaffPerformanceContent data={staffQuery.data} />
            )}
          </>
        )}
      </div>
    </div>
  );
};


// =========================================================================
// Sales Report Content
// =========================================================================
function SalesReportContent({ data, prevData }: { data: any; prevData?: any }) {
  const maxDaily = Math.max(...data.dailySales.map((d: any) => d.revenue), 1);

  const revChange = prevData && prevData.totalRevenue > 0
    ? ((data.totalRevenue - prevData.totalRevenue) / prevData.totalRevenue) * 100
    : null;
  const txnChange = prevData && prevData.transactionCount > 0
    ? ((data.transactionCount - prevData.transactionCount) / prevData.transactionCount) * 100
    : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Sales Overview</h2>
        <button
          className="button-outline gap-2 text-sm"
          onClick={() => downloadCSV(
            data.dailySales.map((d: any) => ({ date: d.date, revenue: d.revenue, count: d.count })),
            `sales-report-${data.dailySales[0]?.date ?? 'report'}.csv`
          )}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={`৳${data.totalRevenue.toLocaleString()}`}
          icon={<TrendingUp size={20} />}
          color="success"
          trend={revChange !== null ? (revChange >= 0 ? 'up' : 'down') : undefined}
          trendLabel={revChange !== null ? `${revChange >= 0 ? '+' : ''}${revChange.toFixed(1)}% vs prev` : undefined}
        />
        <MetricCard
          title="Transactions"
          value={data.transactionCount.toString()}
          icon={<BarChart3 size={20} />}
          color="info"
          trend={txnChange !== null ? (txnChange >= 0 ? 'up' : 'down') : undefined}
          trendLabel={txnChange !== null ? `${txnChange >= 0 ? '+' : ''}${txnChange.toFixed(1)}% vs prev` : undefined}
        />
        <MetricCard title="Average Ticket" value={`৳${data.avgTicket.toFixed(2)}`} icon={<TrendingUp size={20} />} color="tertiary" />
        <MetricCard title="Daily Avg" value={`৳${data.dailySales.length > 0 ? (data.totalRevenue / data.dailySales.length).toFixed(0) : 0}`} icon={<Calendar size={20} />} color="warning" />
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Daily Revenue Trend</h3>
        <div className="flex items-end justify-between h-48 gap-2">
          {data.dailySales.map((day: any, idx: number) => {
            const height = maxDaily > 0 ? (day.revenue / maxDaily) * 100 : 0;
            return (
              <div key={idx} className="flex flex-col items-center flex-1 gap-1">
                <div className="w-full bg-emerald-500 rounded-t transition-all duration-300 hover:bg-emerald-600"
                  style={{ height: `${height}%`, minHeight: day.revenue > 0 ? 4 : 0 }}
                  title={`${day.date}: ৳${day.revenue.toLocaleString()}`} />
                <span className="text-xs text-text-muted">{day.date.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-4">Top Selling Products</h3>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-border-color">
            <tr className="text-left text-sm text-text-muted">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium text-right">Quantity Sold</th>
              <th className="px-4 py-3 font-medium text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-color">
            {data.topProducts.map((product: any, idx: number) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{product.name}</td>
                <td className="px-4 py-3 text-right">{product.quantity}</td>
                <td className="px-4 py-3 text-right">৳{product.revenue.toLocaleString()}</td>
              </tr>
            ))}
            {data.topProducts.length === 0 && (
              <tr><td colSpan={3} className="py-8 text-center text-text-muted">No sales data for this period</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =========================================================================
// Inventory Report Content
// =========================================================================
function InventoryReportContent({ data }: { data: any }) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Inventory Value Summary</h2>
        <button
          className="button-outline gap-2 text-sm"
          onClick={() => downloadCSV(
            data.inventory.map((item: any) => ({ name: item.name, sku: item.sku || '', qty: item.qty, cost: item.cost, totalValue: item.totalValue })),
            `inventory-value-${new Date().toISOString().split('T')[0]}.csv`
          )}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Total Inventory Value" value={`৳${data.totalValue.toLocaleString()}`} icon={<Package size={20} />} color="success" variant="solid" />
        <MetricCard title="Total Items" value={data.totalItems.toString()} icon={<Package size={20} />} color="info" variant="solid" />
        <MetricCard title="Low Stock Items" value={data.lowStockCount.toString()} icon={<TrendingUp size={20} />} color="warning" variant="solid" />
        <MetricCard title="Out of Stock" value={data.outOfStockCount.toString()} icon={<Package size={20} />} color="danger" variant="solid" />
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-4">Inventory Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-border-color">
              <tr className="text-left text-sm text-text-muted">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium text-right">Current Qty</th>
                <th className="px-4 py-3 font-medium text-right">Unit Cost</th>
                <th className="px-4 py-3 font-medium text-right">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {data.inventory.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-text-muted">{item.sku || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={clsx(item.qty === 0 ? 'text-red-600' : item.qty <= 5 ? 'text-amber-600' : '')}>{item.qty}</span>
                  </td>
                  <td className="px-4 py-3 text-right">৳{item.cost}</td>
                  <td className="px-4 py-3 text-right font-medium">৳{item.totalValue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// Profit & Loss Report Content
// =========================================================================
function ProfitReportContent({ data }: { data: any }) {
  const isProfit = data.netProfit >= 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Profit & Loss Statement</h2>
        <button
          className="button-outline gap-2 text-sm"
          onClick={() => downloadCSV(
            [{ metric: 'Gross Revenue', value: data.grossRevenue },
             { metric: 'COGS', value: data.cogs },
             { metric: 'Gross Profit', value: data.grossProfit },
             { metric: 'Operating Expenses', value: data.totalExpenses },
             { metric: 'Net Profit', value: data.netProfit }],
            `profit-loss-${new Date().toISOString().split('T')[0]}.csv`
          )}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard title="Gross Revenue" value={`৳${data.grossRevenue.toLocaleString()}`} icon={<TrendingUp size={20} />} color="success" variant="solid" />
        <MetricCard title="COGS" value={`৳${data.cogs.toLocaleString()}`} icon={<Package size={20} />} color="danger" variant="solid" />
        <MetricCard title="Gross Profit" value={`৳${data.grossProfit.toLocaleString()}`} icon={<TrendingUp size={20} />} color={data.grossProfit >= 0 ? 'success' : 'danger'} variant="solid" />
        <MetricCard title="Expenses" value={`৳${data.totalExpenses.toLocaleString()}`} icon={<TrendingUp size={20} />} color="danger" variant="solid" />
        <MetricCard title="Net Profit" value={`৳${Math.abs(data.netProfit).toLocaleString()}`} icon={<TrendingUp size={20} />} color={isProfit ? 'success' : 'danger'} variant="solid" />
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-border-color">
            <span className="text-text-muted">Gross Revenue</span>
            <span className="font-medium">৳{data.grossRevenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border-color">
            <span className="text-text-muted">Less: Cost of Goods Sold</span>
            <span className="font-medium text-red-600">-৳{data.cogs.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 border-b-2 border-border-color">
            <span className="font-medium">Gross Profit</span>
            <span className={clsx('font-bold', data.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>৳{data.grossProfit.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border-color">
            <span className="text-text-muted">Less: Operating Expenses</span>
            <span className="font-medium text-red-600">-৳{data.totalExpenses.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-3 bg-emerald-50 rounded px-4">
            <span className="font-bold text-lg">Net Profit</span>
            <span className={clsx('font-bold text-lg', isProfit ? 'text-emerald-600' : 'text-red-600')}>
              {isProfit ? '+' : '-'}৳{Math.abs(data.netProfit).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-text-muted mb-1">Gross Profit Margin</div>
          <div className="text-2xl font-bold text-blue-600">
            {data.grossRevenue > 0 ? ((data.grossProfit / data.grossRevenue) * 100).toFixed(1) : 0}%
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-text-muted mb-1">Net Profit Margin</div>
          <div className="text-2xl font-bold text-purple-600">
            {data.grossRevenue > 0 ? ((data.netProfit / data.grossRevenue) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// Inventory Analytics Content (4 sub-tabs)
// =========================================================================
function InventoryAnalyticsContent({
  subTab, onSubTabChange, valuationData, topSellersData, slowMoversData, movementData,
}: {
  subTab: AnalyticsSubTab;
  onSubTabChange: (t: AnalyticsSubTab) => void;
  valuationData: StockValuationItem[] | null;
  topSellersData: TopSellingItem[] | null;
  slowMoversData: SlowMovingItem[] | null;
  movementData: DailyMovementItem[] | null;
}) {
  const subTabs: { key: AnalyticsSubTab; label: string }[] = [
    { key: 'valuation', label: 'Stock Valuation' },
    { key: 'top-sellers', label: 'Top Sellers' },
    { key: 'slow-movers', label: 'Slow Movers' },
    { key: 'movement', label: 'Movement Trend' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex space-x-2 border-b border-border-color pb-0">
        {subTabs.map(t => (
          <button key={t.key} onClick={() => onSubTabChange(t.key)} className={clsx(
            'px-3 py-2 text-sm font-medium border-b-2 transition-colors',
            subTab === t.key ? 'border-color-primary text-text-main' : 'border-transparent text-text-muted hover:text-text-main'
          )}>{t.label}</button>
        ))}
      </div>

      {subTab === 'valuation' && <StockValuationContent data={valuationData} />}
      {subTab === 'top-sellers' && <TopSellersContent data={topSellersData} />}
      {subTab === 'slow-movers' && <SlowMoversContent data={slowMoversData} />}
      {subTab === 'movement' && <MovementTrendContent data={movementData} />}
    </div>
  );
}

function StockValuationContent({ data }: { data: StockValuationItem[] | null }) {
  if (!data || data.length === 0) return <EmptyState icon={<Package size={32} />} title="No data" description="Run inventory valuation first." />;

  const totalValue = data.reduce((s, i) => s + i.total_value, 0);
  const totalCost = data.reduce((s, i) => s + i.total_cost, 0);
  const overallMargin = totalValue > 0 ? ((totalValue - totalCost) / totalValue) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-4 flex-1">
          <div className="bg-emerald-50 rounded-lg p-3 text-center">
            <div className="text-sm text-text-muted">Total Retail Value</div>
            <div className="text-xl font-bold text-emerald-600">৳{totalValue.toLocaleString('en-BD', { maximumFractionDigits: 0 })}</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <div className="text-sm text-text-muted">Total Cost Value</div>
            <div className="text-xl font-bold text-amber-600">৳{totalCost.toLocaleString('en-BD', { maximumFractionDigits: 0 })}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-sm text-text-muted">Overall Margin</div>
            <div className="text-xl font-bold text-blue-600">{overallMargin.toFixed(1)}%</div>
          </div>
        </div>
        <button
          className="button-outline gap-2 text-sm ml-4"
          onClick={() => downloadCSV(data.map((i: StockValuationItem) => ({
            name: i.item_name, sku: i.sku, category: i.category_name, qty: i.qty_on_hand,
            unitCost: i.unit_cost, unitPrice: i.unit_price, totalCost: i.total_cost, totalValue: i.total_value, marginPct: i.margin_pct,
          })), `stock-valuation-${new Date().toISOString().split('T')[0]}.csv`)}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice(0, 15)} layout="vertical">
            <XAxis type="number" tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="item_name" width={120} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: any) => [`৳${Number(value).toLocaleString()}`, '']} />
            <Bar dataKey="total_value" fill="var(--color-success-default)" radius={[0, 4, 4, 0]} name="Retail Value" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-text-muted">
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Unit Cost</th>
              <th className="px-3 py-2 text-right">Unit Price</th>
              <th className="px-3 py-2 text-right">Total Value</th>
              <th className="px-3 py-2 text-right">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.slice(0, 20).map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{item.item_name}</td>
                <td className="px-3 py-2 text-right">{item.qty_on_hand}</td>
                <td className="px-3 py-2 text-right">৳{item.unit_cost}</td>
                <td className="px-3 py-2 text-right">৳{item.unit_price}</td>
                <td className="px-3 py-2 text-right font-medium">৳{item.total_value.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{item.margin_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TopSellersContent({ data }: { data: TopSellingItem[] | null }) {
  if (!data || data.length === 0) return <EmptyState icon={<TrendingUp size={32} />} title="No top sellers" description="No sales data available for this period." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Top Selling Items (30 days)</h3>
        <button
          className="button-outline gap-2 text-sm"
          onClick={() => downloadCSV(data.map((i: TopSellingItem) => ({
            name: i.item_name, sku: i.sku, category: i.category_name,
            totalQty: i.total_qty, totalRevenue: i.total_revenue, totalProfit: i.total_profit,
          })), `top-sellers-${new Date().toISOString().split('T')[0]}.csv`)}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice(0, 15)}>
            <XAxis dataKey="item_name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value: any) => [`৳${Number(value).toLocaleString()}`, '']} />
            <Bar dataKey="total_revenue" fill="var(--color-success-default)" radius={[4, 4, 0, 0]} name="Revenue" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-text-muted">
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2 text-right">Qty Sold</th>
              <th className="px-3 py-2 text-right">Revenue</th>
              <th className="px-3 py-2 text-right">Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.slice(0, 20).map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{item.item_name}</td>
                <td className="px-3 py-2 text-text-muted">{item.category_name || '-'}</td>
                <td className="px-3 py-2 text-right">{item.total_qty}</td>
                <td className="px-3 py-2 text-right">৳{item.total_revenue.toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-emerald-600">৳{item.total_profit.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SlowMoversContent({ data }: { data: SlowMovingItem[] | null }) {
  if (!data || data.length === 0) return <EmptyState icon={<Package size={32} />} title="No slow movers" description="Great! No slow-moving inventory detected." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Slow Moving Items</h3>
          <p className="text-sm text-text-muted">Zero sales in the last 30 days, with stock on hand</p>
        </div>
        <button
          className="button-outline gap-2 text-sm"
          onClick={() => downloadCSV(data.map((i: SlowMovingItem) => ({
            name: i.item_name, sku: i.sku, category: i.category_name,
            qtyOnHand: i.qty_on_hand, totalCost: i.total_cost, lastSoldAt: i.last_sold_at || 'Never',
          })), `slow-movers-${new Date().toISOString().split('T')[0]}.csv`)}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice(0, 15)}>
            <XAxis dataKey="item_name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value: any) => [`৳${Number(value).toLocaleString()}`, 'Cost']} />
            <Bar dataKey="total_cost" fill="var(--color-danger-default)" radius={[4, 4, 0, 0]} name="Cost Value" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-text-muted">
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2 text-right">Qty On Hand</th>
              <th className="px-3 py-2 text-right">Total Cost</th>
              <th className="px-3 py-2 text-right">Last Sold</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.slice(0, 20).map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{item.item_name}</td>
                <td className="px-3 py-2 text-text-muted">{item.category_name || '-'}</td>
                <td className="px-3 py-2 text-right">{item.qty_on_hand}</td>
                <td className="px-3 py-2 text-right text-red-600">৳{item.total_cost.toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-text-muted">
                  {item.last_sold_at ? new Date(item.last_sold_at).toLocaleDateString() : 'Never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MovementTrendContent({ data }: { data: DailyMovementItem[] | null }) {
  if (!data || data.length === 0) return <EmptyState icon={<Activity size={32} />} title="No movement data" description="No stock movements in the recent period." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Daily Stock Movement (14 days)</h3>
        <button
          className="button-outline gap-2 text-sm"
          onClick={() => downloadCSV(data.map((d: DailyMovementItem) => ({
            date: d.trend_date, in: d.total_in, out: d.total_out, net: d.net_delta,
          })), `movement-trend-${new Date().toISOString().split('T')[0]}.csv`)}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="trend_date" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `${v}`} />
            <Tooltip />
            <Line type="monotone" dataKey="total_in" stroke="var(--color-success-default)" strokeWidth={2} name="Stock In" dot={false} />
            <Line type="monotone" dataKey="total_out" stroke="var(--color-danger-default)" strokeWidth={2} name="Stock Out" dot={false} />
            <Line type="monotone" dataKey="net_delta" stroke="var(--color-info-default)" strokeWidth={2} name="Net Delta" dot />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-text-muted">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2 text-right">Stock In</th>
              <th className="px-3 py-2 text-right">Stock Out</th>
              <th className="px-3 py-2 text-right">Net Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{item.trend_date}</td>
                <td className="px-3 py-2 text-right text-emerald-600">+{item.total_in}</td>
                <td className="px-3 py-2 text-right text-red-600">-{item.total_out}</td>
                <td className={clsx('px-3 py-2 text-right font-medium', item.net_delta >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {item.net_delta >= 0 ? '+' : ''}{item.net_delta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =========================================================================
// Customer Analytics Content
// =========================================================================
function CustomerAnalyticsContent({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <EmptyState icon={<Users size={32} />} title="No customer data" description="Customer purchases will appear here once they make transactions." />;

  const totalCustomers = data.length;
  const totalSpent = data.reduce((s: number, c: any) => s + Number(c.total_spent), 0);
  const avgLTV = totalCustomers > 0 ? totalSpent / totalCustomers : 0;
  const avgFrequency = totalCustomers > 0
    ? data.reduce((s: number, c: any) => s + Number(c.purchase_count), 0) / totalCustomers
    : 0;

  const spendBuckets = [
    { range: '0-1k', min: 0, max: 1000, count: 0 },
    { range: '1k-5k', min: 1000, max: 5000, count: 0 },
    { range: '5k-10k', min: 5000, max: 10000, count: 0 },
    { range: '10k-25k', min: 10000, max: 25000, count: 0 },
    { range: '25k+', min: 25000, max: Infinity, count: 0 },
  ];
  data.forEach((c: any) => {
    for (const bucket of spendBuckets) {
      if (Number(c.total_spent) >= bucket.min && Number(c.total_spent) < bucket.max) {
        bucket.count++;
        break;
      }
    }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Customer Analytics</h2>
        <button
          className="button-outline gap-2 text-sm"
          onClick={() => downloadCSV(data.map((c: any) => ({
            name: c.customer_name,
            phone: c.phone || '',
            totalSpent: c.total_spent,
            purchases: c.purchase_count,
            avgOrder: c.avg_order_value,
            lastPurchase: c.last_purchase_date || '',
            daysSinceLast: c.days_since_last ?? '',
          })), `customer-analytics-${new Date().toISOString().split('T')[0]}.csv`)}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Total Customers" value={totalCustomers.toString()} icon={<Users size={20} />} color="primary" variant="solid" />
        <MetricCard title="Total Revenue" value={`৳${totalSpent.toLocaleString('en-BD', { maximumFractionDigits: 0 })}`} icon={<TrendingUp size={20} />} color="success" variant="solid" />
        <MetricCard title="Avg LTV" value={`৳${avgLTV.toLocaleString('en-BD', { maximumFractionDigits: 0 })}`} icon={<BarChart3 size={20} />} color="tertiary" variant="solid" />
        <MetricCard title="Avg Frequency" value={`${avgFrequency.toFixed(1)}x`} icon={<Activity size={20} />} color="info" variant="solid" />
      </div>

      <div className="h-[250px]">
        <h3 className="font-semibold text-sm text-text-muted mb-3">Customer Spend Distribution</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={spendBuckets}>
            <XAxis dataKey="range" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(value: any) => [value, 'Customers']} />
            <Bar dataKey="count" fill="var(--color-primary-default)" radius={[4, 4, 0, 0]} name="Customers" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <h3 className="font-semibold text-sm text-text-muted mb-3">Top Customers</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-text-muted">
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2 text-right">Purchases</th>
              <th className="px-3 py-2 text-right">Total Spent</th>
              <th className="px-3 py-2 text-right">Avg Order</th>
              <th className="px-3 py-2 text-right">Last Purchase</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.slice(0, 25).map((c: any, idx: number) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{c.customer_name}</td>
                <td className="px-3 py-2 text-text-muted">{c.phone || '-'}</td>
                <td className="px-3 py-2 text-right">{c.purchase_count}</td>
                <td className="px-3 py-2 text-right font-medium">৳{Number(c.total_spent).toLocaleString()}</td>
                <td className="px-3 py-2 text-right">৳{Number(c.avg_order_value).toLocaleString('en-BD', { maximumFractionDigits: 0 })}</td>
                <td className="px-3 py-2 text-right text-text-muted">
                  {c.last_purchase_date ? new Date(c.last_purchase_date).toLocaleDateString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =========================================================================
// Staff Performance Content
// =========================================================================
function StaffPerformanceContent({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <EmptyState icon={<UserCheck size={32} />} title="No staff data" description="Staff performance will appear once sales are recorded by cashiers." />;

  const totalRevenue = data.reduce((s: number, st: any) => s + Number(st.total_revenue), 0);
  const totalSales = data.reduce((s: number, st: any) => s + Number(st.total_sales), 0);
  const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Staff Performance (30 days)</h2>
        <button
          className="button-outline gap-2 text-sm"
          onClick={() => downloadCSV(data.map((st: any) => ({
            name: st.staff_name,
            role: st.role,
            totalSales: st.total_sales,
            totalRevenue: st.total_revenue,
            avgTicket: st.avg_ticket,
            totalDiscounts: st.total_discounts,
            activeDays: st.active_days,
            revenuePerDay: st.revenue_per_day,
          })), `staff-performance-${new Date().toISOString().split('T')[0]}.csv`)}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Active Staff" value={data.length.toString()} icon={<UserCheck size={20} />} color="primary" variant="solid" />
        <MetricCard title="Total Transactions" value={totalSales.toString()} icon={<Activity size={20} />} color="info" variant="solid" />
        <MetricCard title="Total Revenue" value={`৳${totalRevenue.toLocaleString('en-BD', { maximumFractionDigits: 0 })}`} icon={<TrendingUp size={20} />} color="success" variant="solid" />
        <MetricCard title="Store Avg Ticket" value={`৳${avgTicket.toLocaleString('en-BD', { maximumFractionDigits: 0 })}`} icon={<BarChart3 size={20} />} color="tertiary" variant="solid" />
      </div>

      <div className="h-[300px]">
        <h3 className="font-semibold text-sm text-text-muted mb-3">Revenue by Staff</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice(0, 15)}>
            <XAxis dataKey="staff_name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value: any) => [`৳${Number(value).toLocaleString()}`, '']} />
            <Bar dataKey="total_revenue" fill="var(--color-primary-default)" radius={[4, 4, 0, 0]} name="Revenue" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <h3 className="font-semibold text-sm text-text-muted mb-3">Staff Details</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-text-muted">
              <th className="px-3 py-2">Staff</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2 text-right">Transactions</th>
              <th className="px-3 py-2 text-right">Revenue</th>
              <th className="px-3 py-2 text-right">Avg Ticket</th>
              <th className="px-3 py-2 text-right">Discounts</th>
              <th className="px-3 py-2 text-right">Active Days</th>
              <th className="px-3 py-2 text-right">Rev/Day</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((st: any, idx: number) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{st.staff_name}</td>
                <td className="px-3 py-2">
                  <span className={clsx(
                    'text-xs font-semibold px-2 py-0.5 rounded-full',
                    st.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    st.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  )}>{st.role}</span>
                </td>
                <td className="px-3 py-2 text-right">{st.total_sales}</td>
                <td className="px-3 py-2 text-right font-medium">৳{Number(st.total_revenue).toLocaleString()}</td>
                <td className="px-3 py-2 text-right">৳{Number(st.avg_ticket).toLocaleString('en-BD', { maximumFractionDigits: 0 })}</td>
                <td className="px-3 py-2 text-right text-amber-600">৳{Number(st.total_discounts).toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{st.active_days}</td>
                <td className="px-3 py-2 text-right text-emerald-600">৳{Number(st.revenue_per_day).toLocaleString('en-BD', { maximumFractionDigits: 0 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
