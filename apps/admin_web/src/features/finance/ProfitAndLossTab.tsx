import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { formatCurrency } from '../../lib/format';
import { SkeletonBlock } from '../../components/PageState';
import { MetricCard } from '../../components/data-display/MetricCard';
import { Wallet, TrendingUp, DollarSign } from 'lucide-react';

const CHART_COLORS = [
  'var(--color-success-default)',
  'var(--color-info-default)',
  'var(--color-warning-default)',
  'var(--color-danger-default)',
  'var(--color-primary-default)',
];

interface ProfitAndLossTabProps {
  startDate: string;
  endDate: string;
}

export function ProfitAndLossTab({ startDate, endDate }: ProfitAndLossTabProps) {
  const { storeId } = useAuth();

  const { data: dailySalesData, isLoading: salesLoading } = useQuery({
    queryKey: ['dailySales', storeId, startDate, endDate],
    queryFn: () => api.dailySales.list(storeId, { startDate, endDate }),
  });

  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses', storeId, startDate, endDate],
    queryFn: () => api.expenses.list(storeId, { startDate, endDate }),
  });

  const isLoading = salesLoading || expensesLoading;

  const allSales = useMemo(() => dailySalesData || [], [dailySalesData]);
  const allExpenses = useMemo(() => expensesData || [], [expensesData]);

  // Totals
  const totalRevenue = useMemo(() => allSales.reduce((sum, s) => sum + s.totalSales, 0), [allSales]);
  const totalItemizedExpenses = useMemo(() => allExpenses.reduce((sum, e) => sum + e.amount, 0), [allExpenses]);
  const totalPurchases = useMemo(() => allSales.reduce((sum, s) => sum + s.stockPurchase, 0), [allSales]);
  const netProfit = totalRevenue - totalItemizedExpenses - totalPurchases;

  // Monthly Trend (Sales vs Itemized Expenses vs Purchases)
  const monthlyTrend = useMemo(() => {
    const grouped: Record<string, { revenue: number; expenses: number; purchases: number }> = {};
    
    allSales.forEach(s => {
      const monthKey = s.saleDate.substring(0, 7);
      if (!grouped[monthKey]) grouped[monthKey] = { revenue: 0, expenses: 0, purchases: 0 };
      grouped[monthKey].revenue += s.totalSales;
      grouped[monthKey].purchases += s.stockPurchase;
    });

    allExpenses.forEach(e => {
      const monthKey = e.expenseDate.substring(0, 7);
      if (!grouped[monthKey]) grouped[monthKey] = { revenue: 0, expenses: 0, purchases: 0 };
      grouped[monthKey].expenses += e.amount;
    });

    return Object.entries(grouped)
      .map(([month, data]) => ({
        month: format(parseISO(`${month}-01`), 'MMM yyyy'),
        revenue: data.revenue,
        expenses: data.expenses,
        purchases: data.purchases,
        expenseRatio: data.revenue > 0 ? (data.expenses / data.revenue) * 100 : 0,
      }))
      .sort((a, b) => new Date(`1 ${a.month}`).getTime() - new Date(`1 ${b.month}`).getTime());
  }, [allSales, allExpenses]);

  // Payment Breakdown
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

  // Daily Trend (Last 30 Days of selected range)
  const dailyTrend = useMemo(() => {
    const grouped: Record<string, { sales: number; expense: number; purchase: number }> = {};
    
    allSales.forEach(s => {
      grouped[s.saleDate] = {
        sales: s.totalSales,
        expense: 0, // we will add itemized below
        purchase: s.stockPurchase,
      };
    });
    
    allExpenses.forEach(e => {
      if (!grouped[e.expenseDate]) {
        grouped[e.expenseDate] = { sales: 0, expense: 0, purchase: 0 };
      }
      grouped[e.expenseDate].expense += e.amount;
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
  }, [allSales, allExpenses]);

  if (isLoading) {
    return (
      <div className="dashboard-grid">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="dashboard-grid">
        <MetricCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={<Wallet size={20} className="text-emerald-600" />} color="success" variant="light" />
        <MetricCard title="Total Expenses" value={formatCurrency(totalItemizedExpenses)} icon={<DollarSign size={20} className="text-danger" />} color="danger" variant="light" />
        <MetricCard title="Stock Purchases" value={formatCurrency(totalPurchases)} icon={<DollarSign size={20} className="text-info" />} color="info" variant="light" />
        <MetricCard title="Net Profit" value={formatCurrency(netProfit)} icon={<TrendingUp size={20} className={netProfit >= 0 ? "text-emerald-600" : "text-danger"} />} color={netProfit >= 0 ? "success" : "danger"} variant="light" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dual Axis Monthly Chart */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Revenue vs Expenses</h2>
          {monthlyTrend.length > 0 && (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fontSize: 12 }} 
                    stroke="var(--color-info-default)"
                    tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }} 
                    stroke="var(--color-danger-default)"
                    tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip
                    formatter={(value: any, name: any) => value !== undefined && value !== null ? [formatCurrency(Number(value)), name] : ['N/A', name]}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]?.payload) {
                        const { expenseRatio } = payload[0].payload;
                        return `${label}  ·  Expense Ratio: ${expenseRatio.toFixed(1)}%`;
                      }
                      return label;
                    }}
                    labelStyle={{ color: 'var(--color-text-primary)' }}
                    contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="var(--color-info-default)" 
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-info-default)', r: 4 }}
                    name="Revenue"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="var(--color-danger-default)" 
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-danger-default)', r: 4 }}
                    name="Expense"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Payment Breakdown */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Payment Breakdown</h2>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height={200}>
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
                <RechartsTooltip 
                  formatter={(value: any) => value !== undefined && value !== null ? [formatCurrency(Number(value)), 'Amount'] : ['N/A', 'Amount']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
