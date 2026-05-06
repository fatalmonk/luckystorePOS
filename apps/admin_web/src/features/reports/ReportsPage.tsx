import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/layout/PageHeader';
import { BarChart3, TrendingUp, Package, Calendar, Download } from 'lucide-react';
import { clsx } from 'clsx';
import { ErrorState, EmptyState, SkeletonBlock } from '../../components/PageState';
import { MetricCard } from '../../components/data-display/MetricCard';
import { useAuth } from '../../lib/AuthContext';
import { api } from '../../lib/api';

type DateRange = 'today' | 'week' | 'month' | 'custom';
type TabType = 'sales' | 'inventory' | 'profit';

export const ReportsPage: React.FC = () => {
  const { storeId } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('sales');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const dateParams = useMemo(() => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    switch (dateRange) {
      case 'today':
        return { start: formatDate(today), end: formatDate(today) };
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { start: formatDate(weekAgo), end: formatDate(today) };
      case 'month':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { start: formatDate(monthAgo), end: formatDate(today) };
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

  const isLoading = salesQuery.isLoading || inventoryQuery.isLoading || profitQuery.isLoading;
  const error = salesQuery.error || inventoryQuery.error || profitQuery.error;

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
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="input text-sm"
                />
                <span className="text-text-muted">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="input text-sm"
                />
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
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="input text-sm"
            >
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
        <button
          onClick={() => setActiveTab('sales')}
          className={clsx(
            'flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors',
            activeTab === 'sales'
              ? 'border-color-primary text-text-main'
              : 'border-transparent text-text-muted hover:text-text-main hover:border-border-color'
          )}
        >
          <BarChart3 size={18} />
          Sales Report
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={clsx(
            'flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors',
            activeTab === 'inventory'
              ? 'border-color-primary text-text-main'
              : 'border-transparent text-text-muted hover:text-text-main hover:border-border-color'
          )}
        >
          <Package size={18} />
          Inventory Value
        </button>
        <button
          onClick={() => setActiveTab('profit')}
          className={clsx(
            'flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors',
            activeTab === 'profit'
              ? 'border-color-primary text-text-main'
              : 'border-transparent text-text-muted hover:text-text-main hover:border-border-color'
          )}
        >
          <TrendingUp size={18} />
          Profit & Loss
        </button>
      </div>

      {/* Tab Content */}
      <div className="card">
        {isLoading ? (
          <div className="p-8 space-y-4">
            <SkeletonBlock className="h-8 w-48" />
            <div className="grid grid-cols-4 gap-4">
              {Array(4).fill(0).map((_, i) => (
                <SkeletonBlock key={i} className="h-24" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'sales' && salesQuery.data && (
              <SalesReportContent data={salesQuery.data} />
            )}
            {activeTab === 'inventory' && inventoryQuery.data && (
              <InventoryReportContent data={inventoryQuery.data} />
            )}
            {activeTab === 'profit' && profitQuery.data && (
              <ProfitReportContent data={profitQuery.data} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Sales Report Content Component
function SalesReportContent({ data }: { data: any }) {
  const maxDaily = Math.max(...data.dailySales.map((d: any) => d.revenue), 1);

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={`৳${data.totalRevenue.toLocaleString()}`}
          icon={<TrendingUp size={20} />}
          color="emerald"
          variant="solid"
        />
        <MetricCard
          title="Transactions"
          value={data.transactionCount.toString()}
          icon={<BarChart3 size={20} />}
          color="blue"
          variant="solid"
        />
        <MetricCard
          title="Average Ticket"
          value={`৳${data.avgTicket.toFixed(2)}`}
          icon={<TrendingUp size={20} />}
          color="purple"
          variant="solid"
        />
        <MetricCard
          title="Daily Avg"
          value={`৳${data.dailySales.length > 0 ? (data.totalRevenue / data.dailySales.length).toFixed(0) : 0}`}
          icon={<Calendar size={20} />}
          color="amber"
          variant="solid"
        />
      </div>

      {/* Daily Sales Chart */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Daily Revenue Trend</h3>
        <div className="flex items-end justify-between h-48 gap-2">
          {data.dailySales.map((day: any, idx: number) => {
            const height = maxDaily > 0 ? (day.revenue / maxDaily) * 100 : 0;
            return (
              <div key={idx} className="flex flex-col items-center flex-1 gap-1">
                <div
                  className="w-full bg-emerald-500 rounded-t transition-all duration-300 hover:bg-emerald-600"
                  style={{ height: `${height}%`, minHeight: day.revenue > 0 ? 4 : 0 }}
                  title={`${day.date}: ৳${day.revenue.toLocaleString()}`}
                />
                <span className="text-xs text-text-muted">{day.date.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Products Table */}
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
              <tr>
                <td colSpan={3} className="py-8 text-center text-text-muted">
                  No sales data for this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Inventory Report Content Component
function InventoryReportContent({ data }: { data: any }) {
  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Inventory Value"
          value={`৳${data.totalValue.toLocaleString()}`}
          icon={<Package size={20} />}
          color="emerald"
          variant="solid"
        />
        <MetricCard
          title="Total Items"
          value={data.totalItems.toString()}
          icon={<Package size={20} />}
          color="blue"
          variant="solid"
        />
        <MetricCard
          title="Low Stock Items"
          value={data.lowStockCount.toString()}
          icon={<TrendingUp size={20} />}
          color="amber"
          variant="solid"
        />
        <MetricCard
          title="Out of Stock"
          value={data.outOfStockCount.toString()}
          icon={<Package size={20} />}
          color="red"
          variant="solid"
        />
      </div>

      {/* Inventory Table */}
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
                    <span className={clsx(
                      item.qty === 0 ? 'text-red-600' :
                      item.qty <= 5 ? 'text-amber-600' : ''
                    )}>
                      {item.qty}
                    </span>
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

// Profit & Loss Report Content Component
function ProfitReportContent({ data }: { data: any }) {
  const isProfit = data.netProfit >= 0;

  return (
    <div className="p-6 space-y-6">
      {/* P&L Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Gross Revenue"
          value={`৳${data.grossRevenue.toLocaleString()}`}
          icon={<TrendingUp size={20} />}
          color="emerald"
          variant="solid"
        />
        <MetricCard
          title="COGS"
          value={`৳${data.cogs.toLocaleString()}`}
          icon={<Package size={20} />}
          color="red"
          variant="solid"
        />
        <MetricCard
          title="Gross Profit"
          value={`৳${data.grossProfit.toLocaleString()}`}
          icon={<TrendingUp size={20} />}
          color={data.grossProfit >= 0 ? 'emerald' : 'red'}
          variant="solid"
        />
        <MetricCard
          title="Expenses"
          value={`৳${data.totalExpenses.toLocaleString()}`}
          icon={<TrendingUp size={20} />}
          color="red"
          variant="solid"
        />
        <MetricCard
          title="Net Profit"
          value={`৳${Math.abs(data.netProfit).toLocaleString()}`}
          icon={<TrendingUp size={20} />}
          color={isProfit ? 'emerald' : 'red'}
          variant="solid"
        />
      </div>

      {/* Summary Statement */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Profit & Loss Statement</h3>
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
            <span className={clsx('font-bold', data.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              ৳{data.grossProfit.toLocaleString()}
            </span>
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

      {/* Margin Metrics */}
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
