/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { ErrorState, EmptyState, SkeletonBlock } from '../../components/PageState';
import { useNotify } from '../../components/NotificationContext';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../components/layout/PageHeader';
import { Drawer } from '../../components/ui/Drawer';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { MetricCard } from '../../components/data-display/MetricCard';
import { TableFilters } from '../../components/data-display/TableFilters';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Receipt,
  Plus,
  CalendarDays,
  TrendingUp,
  Wallet,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Building2,
  CreditCard,
  Download,
} from 'lucide-react';
import { format, startOfMonth, isToday, isThisWeek, isThisMonth, subMonths, parseISO } from 'date-fns';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_TYPES,
} from '../../lib/api/types';
import type { Expense, ExpenseFormData, ExpenseCategory, ExpensePaymentType, ExpenseTemplate, ExpenseBatchItem } from '../../lib/api/types';
import { downloadCSV, formatCurrency } from '../../lib/format';

// Chart colors matching the app's design system
const CHART_COLORS = [
  'var(--color-success-default)',
  'var(--color-info-default)',
  'var(--color-warning-default)',
  'var(--color-danger-default)',
  'var(--color-primary-default)',
  'var(--color-secondary-default)',
];

export function ExpensesTab() {
  const { notify } = useNotify();
  const { storeId } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ExpenseTemplate | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterPaymentType, setFilterPaymentType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: expenses, isLoading, error, refetch } = useQuery({
    queryKey: ['expenses', storeId],
    queryFn: () => api.expenses.list(storeId),
  });

  const { data: templates } = useQuery({
    queryKey: ['expense_templates', storeId],
    queryFn: () => api.expenses.listTemplates(storeId),
  });

  const createMutation = useMutation({
    mutationFn: (form: ExpenseFormData) => api.expenses.create(storeId, form),
    onSuccess: () => {
      notify('Expense recorded successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['expenses', storeId] });
      setShowForm(false);
    },
    onError: (err: { message?: string }) => {
      notify(err.message || 'Failed to record expense.', 'error');
    },
  });

  const batchCreateMutation = useMutation({
    mutationFn: (list: ExpenseBatchItem[]) => api.expenses.recordBatch(storeId, list),
    onSuccess: () => {
      notify('Expenses batch recorded successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['expenses', storeId] });
      setShowForm(false);
    },
    onError: (err: { message?: string }) => {
      notify(err.message || 'Failed to record batch.', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) => api.expenses.update(id, updates),
    onSuccess: () => {
      notify('Expense updated successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['expenses', storeId] });
      setEditingExpense(null);
    },
    onError: (err: { message?: string }) => {
      notify(err.message || 'Failed to update expense.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.expenses.remove(id),
    onSuccess: () => {
      notify('Expense deleted.', 'success');
      queryClient.invalidateQueries({ queryKey: ['expenses', storeId] });
      setDeletingExpenseId(null);
    },
    onError: (err: { message?: string }) => {
      notify(err.message || 'Failed to delete expense.', 'error');
    },
  });



  const filtered = useMemo(() => {
    if (!expenses) return [];
    return expenses.filter((e) => {
      if (filterCategory && e.category !== filterCategory) return false;
      if (filterPaymentType && e.paymentType !== filterPaymentType) return false;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        const matches =
          e.vendorName.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [expenses, filterCategory, filterPaymentType, debouncedSearch]);

  const todayTotal = useMemo(
    () => filtered.filter((e) => isToday(new Date(e.expenseDate))).reduce((s, e) => s + e.amount, 0),
    [filtered],
  );
  const weekTotal = useMemo(
    () => filtered.filter((e) => isThisWeek(new Date(e.expenseDate), { weekStartsOn: 6 })).reduce((s, e) => s + e.amount, 0),
    [filtered],
  );
  const monthTotal = useMemo(
    () => filtered.filter((e) => isThisMonth(new Date(e.expenseDate))).reduce((s, e) => s + e.amount, 0),
    [filtered],
  );

  // Dashboard statistics
  const allExpenses = useMemo(() => expenses ?? [], [expenses]);

  // Total statistics
  const totalStats = useMemo(() => {
    if (allExpenses.length === 0) return { total: 0, avg: 0, min: 0, max: 0, count: 0 };
    const amounts = allExpenses.map(e => e.amount);
    const total = amounts.reduce((a, b) => a + b, 0);
    return {
      total,
      avg: total / amounts.length,
      min: Math.min(...amounts),
      max: Math.max(...amounts),
      count: amounts.length,
    };
  }, [allExpenses]);

  // Last month vs previous month comparison
  const monthlyComparison = useMemo(() => {
    const now = new Date();
    const thisMonth = allExpenses.filter(e => isThisMonth(new Date(e.expenseDate))).reduce((s, e) => s + e.amount, 0);
    const lastMonthStart = subMonths(startOfMonth(now), 1);
    const lastMonthEnd = startOfMonth(now);
    const lastMonth = allExpenses
      .filter(e => {
        const d = new Date(e.expenseDate);
        return d >= lastMonthStart && d < lastMonthEnd;
      })
      .reduce((s, e) => s + e.amount, 0);
    const change = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
    return { thisMonth, lastMonth, change };
  }, [allExpenses]);

  // Category breakdown for pie chart
  const categoryBreakdown = useMemo(() => {
    const grouped: Record<string, number> = {};
    allExpenses.forEach(e => {
      grouped[e.category] = (grouped[e.category] || 0) + e.amount;
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value, percentage: totalStats.total > 0 ? (value / totalStats.total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [allExpenses, totalStats.total]);

  // Payment type breakdown
  const paymentBreakdown = useMemo(() => {
    const grouped: Record<string, { total: number; count: number }> = {};
    allExpenses.forEach(e => {
      if (!grouped[e.paymentType]) grouped[e.paymentType] = { total: 0, count: 0 };
      grouped[e.paymentType].total += e.amount;
      grouped[e.paymentType].count++;
    });
    return Object.entries(grouped)
      .map(([type, data]) => ({
        type,
        total: data.total,
        count: data.count,
        percentage: totalStats.total > 0 ? (data.total / totalStats.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [allExpenses, totalStats.total]);

  // Monthly trend for bar chart
  const monthlyTrend = useMemo(() => {
    const grouped: Record<string, { total: number; count: number }> = {};
    allExpenses.forEach(e => {
      const monthKey = e.expenseDate.substring(0, 7); // YYYY-MM
      if (!grouped[monthKey]) grouped[monthKey] = { total: 0, count: 0 };
      grouped[monthKey].total += e.amount;
      grouped[monthKey].count++;
    });
    return Object.entries(grouped)
      .map(([month, data]) => ({
        month: format(parseISO(`${month}-01`), 'MMM yyyy'),
        total: data.total,
        count: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [allExpenses]);

  // Top vendors
  const topVendors = useMemo(() => {
    const grouped: Record<string, { total: number; count: number }> = {};
    allExpenses.forEach(e => {
      if (e.vendorName) {
        if (!grouped[e.vendorName]) grouped[e.vendorName] = { total: 0, count: 0 };
        grouped[e.vendorName].total += e.amount;
        grouped[e.vendorName].count++;
      }
    });
    return Object.entries(grouped)
      .map(([vendor, data]) => ({ vendor, total: data.total, count: data.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [allExpenses]);

  // Top 10 highest single expenses
  const topExpenses = useMemo(() => {
    return [...allExpenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(e => ({
        ...e,
        date: format(new Date(e.expenseDate), 'dd MMM yyyy'),
      }));
  }, [allExpenses]);

  if (error) {
    return (
      <div className="expenses-container">
        <PageHeader
          title="Expenses"
          subtitle="Track and manage store expenses."
        />
        <div className="card">
          <ErrorState message="Failed to load expenses." onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  return (
    <div className="expenses-container">
      <PageHeader
        title="Expenses"
        subtitle="Track and manage store expenses."
        actions={
          <div className="flex items-center gap-2">
            <button
              className="button-outline gap-2"
              onClick={() => downloadCSV(
                filtered.map((e: Expense) => ({
                  date: e.expenseDate, vendor: e.vendorName, description: e.description,
                  category: e.category, payment: e.paymentType, amount: e.amount,
                })),
                `expenses-${new Date().toISOString().split('T')[0]}.csv`
              )}
            >
              <Download size={16} /> Export CSV
            </button>
            <button className="button-primary" onClick={() => setShowForm(true)}>
              <Plus size={18} /> Add Expense
            </button>
          </div>
        }
      />

      {templates && templates.filter(t => t.isPinned).length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-text-muted mb-3 uppercase tracking-wider">Quick Add (Pinned)</h2>
          <div className="flex flex-wrap gap-3">
            {templates.filter(t => t.isPinned).map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTemplate(t);
                  setShowForm(true);
                }}
                className="bg-surface-secondary hover:bg-surface-tertiary border border-border-light rounded-lg p-3 text-left transition-colors duration-200"
                style={{ minWidth: '180px' }}
              >
                <div className="font-medium text-text-primary text-sm mb-1">{t.name}</div>
                <div className="text-xs text-text-muted mb-2">{t.vendorName}</div>
                <div className="font-semibold text-text-primary" style={{ color: 'var(--color-primary-default)' }}>
                  {formatCurrency(t.amount)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-grid mt-6 mb-6">
        <MetricCard title="Today" value={formatCurrency(todayTotal)} icon={<CalendarDays size={20} className="text-emerald-600" />} color="success" variant="light" />
        <MetricCard title="This Week" value={formatCurrency(weekTotal)} icon={<TrendingUp size={20} className="text-emerald-600" />} color="success" variant="light" />
        <MetricCard title="This Month" value={formatCurrency(monthTotal)} icon={<Wallet size={20} className="text-emerald-600" />} color="success" variant="light" />
      </div>

      {/* Expense Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Overview Stats */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Expense Overview</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-surface-secondary rounded-lg">
              <div className="text-sm text-text-muted">Total Expenses</div>
              <div className="text-2xl font-bold text-text-primary">{formatCurrency(totalStats.total)}</div>
              <div className="text-xs text-text-muted">{totalStats.count} transactions</div>
            </div>
            <div className="p-4 bg-surface-secondary rounded-lg">
              <div className="text-sm text-text-muted">Average Expense</div>
              <div className="text-2xl font-bold text-text-primary">{formatCurrency(totalStats.avg)}</div>
              <div className="text-xs text-text-muted">per transaction</div>
            </div>
            <div className="p-4 bg-surface-secondary rounded-lg">
              <div className="text-sm text-text-muted">Highest Single</div>
              <div className="text-2xl font-bold text-danger">{formatCurrency(totalStats.max)}</div>
              <div className="text-xs text-text-muted">single expense</div>
            </div>
            <div className="p-4 bg-surface-secondary rounded-lg">
              <div className="text-sm text-text-muted">Lowest Single</div>
              <div className="text-2xl font-bold text-success">{formatCurrency(totalStats.min)}</div>
              <div className="text-xs text-text-muted">single expense</div>
            </div>
          </div>
          {monthlyComparison.lastMonth > 0 && (
            <div className="mt-4 p-4 bg-surface-secondary rounded-lg">
              <div className="text-sm text-text-muted mb-2">Month Over Month</div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-text-primary">{formatCurrency(monthlyComparison.thisMonth)}</span>
                {monthlyComparison.change !== 0 && (
                  <span className={`flex items-center text-sm ${monthlyComparison.change > 0 ? 'text-danger' : 'text-success'}`}>
                    {monthlyComparison.change > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    {Math.abs(monthlyComparison.change).toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="text-xs text-text-muted">vs {formatCurrency(monthlyComparison.lastMonth)} last month</div>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">By Category</h2>
          {categoryBreakdown.length > 0 ? (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ name, percent }) => `${(name as string).split(' ')[0]} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {categoryBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value)), 'Amount']}
                      contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {categoryBreakdown.slice(0, 4).map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                      <span className="text-text-muted">{cat.name}</span>
                    </div>
                    <span className="font-medium text-text-primary">{formatCurrency(cat.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon={<Receipt size={32} />} title="No data" description="Add expenses to see breakdown" />
          )}
        </div>

        {/* Monthly Trend */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Monthly Trend</h2>
          {monthlyTrend.length > 0 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), 'Total']}
                    labelStyle={{ color: 'var(--color-text-primary)' }}
                    contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)' }}
                  />
                  <Bar dataKey="total" fill="var(--color-success-default)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={<TrendingUp size={32} />} title="No data" description="Add expenses to see trend" />
          )}
        </div>

        {/* Payment Type & Top Vendors */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Payment Types</h2>
          {paymentBreakdown.length > 0 ? (
            <>
              <div className="space-y-3 mb-6">
                {paymentBreakdown.map((pt) => (
                  <div key={pt.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {pt.type === 'Cash' && <Wallet size={16} className="text-success" />}
                      {pt.type === 'Bank transfer' && <Building2 size={16} className="text-info" />}
                      {pt.type === 'Bkash' && <CreditCard size={16} className="text-warning" />}
                      {pt.type === 'Card' && <CreditCard size={16} className="text-danger" />}
                      <span className="text-sm text-text-muted">{pt.type}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-text-primary">{formatCurrency(pt.total)}</div>
                      <div className="text-xs text-text-muted">{pt.count} txns ({pt.percentage.toFixed(1)}%)</div>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="text-md font-semibold text-text-primary mb-3">Top Vendors</h3>
              {topVendors.length > 0 ? (
                <div className="space-y-2">
                  {topVendors.map((v, idx) => (
                    <div key={v.vendor} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-text-muted w-5">{idx + 1}.</span>
                        <span className="text-text-primary truncate" style={{ maxWidth: '150px' }}>{v.vendor}</span>
                      </div>
                      <span className="font-medium text-text-primary">{formatCurrency(v.total)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-text-muted">No vendor data</div>
              )}
            </>
          ) : (
            <EmptyState icon={<CreditCard size={32} />} title="No data" description="Add expenses to see breakdown" />
          )}
        </div>
      </div>

      {/* Top 5 Highest Expenses */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Top 5 Highest Expenses</h2>
        {topExpenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-left text-sm font-medium text-text-muted pb-2">Date</th>
                  <th className="text-left text-sm font-medium text-text-muted pb-2">Description</th>
                  <th className="text-left text-sm font-medium text-text-muted pb-2">Category</th>
                  <th className="text-right text-sm font-medium text-text-muted pb-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {topExpenses.map((e) => (
                  <tr key={e.id} className="border-b border-border-light">
                    <td className="py-3 text-sm text-text-muted">{e.date}</td>
                    <td className="py-3 text-sm text-text-primary">{e.description}</td>
                    <td className="py-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-surface-secondary text-text-muted">{e.category}</span>
                    </td>
                    <td className="py-3 text-right text-sm font-semibold text-danger">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<Receipt size={32} />} title="No expenses" description="Add expenses to see top transactions" />
        )}
      </div>

      <div className="card expenses-filters">
        <TableFilters
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search vendor, description..."
          filters={[
            {
              label: 'Category',
              value: filterCategory,
              onChange: setFilterCategory,
              options: [
                { label: 'All Categories', value: '' },
                ...EXPENSE_CATEGORIES.map(c => ({ label: c, value: c })),
              ],
            },
            {
              label: 'Payment',
              value: filterPaymentType,
              onChange: setFilterPaymentType,
              options: [
                { label: 'All Payment Types', value: '' },
                ...EXPENSE_PAYMENT_TYPES.map(t => ({ label: t, value: t })),
              ],
            },
          ]}
          onClear={() => { setFilterCategory(''); setFilterPaymentType(''); setSearchTerm(''); }}
          isFiltered={!!(filterCategory || filterPaymentType || searchTerm)}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="expenses-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Vendor</th>
              <th>Description</th>
              <th>Category</th>
              <th>Payment</th>
              <th className="text-right">Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}>
                  <td><SkeletonBlock className="w-[80px] h-[18px]" /></td>
                  <td><SkeletonBlock className="w-[100px] h-[18px]" /></td>
                  <td><SkeletonBlock className="w-[140px] h-[18px]" /></td>
                  <td><SkeletonBlock className="w-[90px] h-[18px]" /></td>
                  <td><SkeletonBlock className="w-[70px] h-[18px]" /></td>
                  <td><SkeletonBlock className="w-[80px] h-[18px] ml-auto" /></td>
                  <td><SkeletonBlock className="w-[60px] h-[18px]" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="expenses-empty">
                  <EmptyState
                    icon={<Receipt size={48} />}
                    title="No expenses yet"
                    description="Record your first expense to start tracking spending."
                    action={<button className="button-primary" onClick={() => setShowForm(true)}><Plus size={18} /> Add Expense</button>}
                  />
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.id}>
                  <td className="expenses-date">{format(new Date(e.expenseDate), 'dd/MM/yyyy')}</td>
                  <td className="expenses-vendor">{e.vendorName}</td>
                  <td className="expenses-desc">{e.description}</td>
                  <td>
                    <span className="expenses-badge">{e.category}</span>
                  </td>
                  <td>
                    <span className="expenses-payment-badge">{e.paymentType}</span>
                  </td>
                  <td className="expenses-amount text-right">{formatCurrency(e.amount)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setEditingExpense(e)} style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none' }} aria-label="Edit expense">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeletingExpenseId(e.id)} style={{ color: 'var(--color-danger)', cursor: 'pointer', background: 'none', border: 'none' }} aria-label="Delete expense">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddExpenseDrawer
        isOpen={showForm}
        onSubmit={(form) => createMutation.mutate(form)}
        onClose={() => {
          setShowForm(false);
          setSelectedTemplate(null);
        }}
        isPending={createMutation.isPending}
        selectedTemplate={selectedTemplate}
        onBatchSubmit={(list) => batchCreateMutation.mutate(list)}
        batchIsPending={batchCreateMutation.isPending}
        previousExpenses={expenses ?? []}
      />

      <EditExpenseDrawer
        key={editingExpense?.id ?? 'none'}
        expense={editingExpense}
        isOpen={!!editingExpense}
        onSubmit={(id, updates) => updateMutation.mutate({ id, updates })}
        onClose={() => setEditingExpense(null)}
        isPending={updateMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!deletingExpenseId}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isPending={deleteMutation.isPending}
        onConfirm={() => deletingExpenseId && deleteMutation.mutate(deletingExpenseId)}
        onCancel={() => setDeletingExpenseId(null)}
      />
    </div>
  );
}

function AddExpenseDrawer({
  isOpen,
  onSubmit,
  onClose,
  isPending,
  selectedTemplate,
  onBatchSubmit,
  batchIsPending,
  previousExpenses = []
}: {
  isOpen: boolean;
  onSubmit: (form: ExpenseFormData) => void;
  onClose: () => void;
  isPending: boolean;
  selectedTemplate?: ExpenseTemplate | null;
  onBatchSubmit?: (list: ExpenseBatchItem[]) => void;
  batchIsPending?: boolean;
  previousExpenses?: Expense[];
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [isBulkMode, setIsBulkMode] = useState(false);
  
  // Single mode state
  const [form, setForm] = useState<ExpenseFormData>({
    expenseDate: today,
    vendorName: '',
    description: '',
    amount: 0,
    paymentType: 'Cash',
    category: 'All Other Expenses',
  });
  const [isAutofilled, setIsAutofilled] = useState(false);

  // Bulk mode state
  const [bulkRows, setBulkRows] = useState<ExpenseBatchItem[]>([
    { date: today, vendor: '', description: '', amount: 0, payment_type: 'Cash', category: 'All Other Expenses' }
  ]);

  // Handle selected template effect
  React.useEffect(() => {
    if (selectedTemplate && isOpen) {
      setForm({
        expenseDate: today,
        vendorName: selectedTemplate.vendorName || '',
        description: selectedTemplate.description || '',
        amount: selectedTemplate.amount || 0,
        paymentType: selectedTemplate.paymentType,
        category: selectedTemplate.category,
      });
      setIsBulkMode(false);
      setIsAutofilled(false);
    } else if (isOpen && !selectedTemplate) {
      setForm({
        expenseDate: today,
        vendorName: '',
        description: '',
        amount: 0,
        paymentType: 'Cash',
        category: 'All Other Expenses',
      });
      setBulkRows([{ date: today, vendor: '', description: '', amount: 0, payment_type: 'Cash', category: 'All Other Expenses' }]);
      setIsAutofilled(false);
    }
  }, [isOpen, selectedTemplate, today]);

  const set = <K extends keyof ExpenseFormData>(key: K, value: ExpenseFormData[K]) => {
    if (isAutofilled && (key === 'amount' || key === 'paymentType' || key === 'category')) {
      setIsAutofilled(false);
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleVendorBlur = () => {
    if (!form.vendorName.trim()) return;
    const match = previousExpenses.find(e => e.vendorName.toLowerCase() === form.vendorName.toLowerCase().trim());
    if (match && form.amount === 0) {
      setForm(prev => ({
        ...prev,
        amount: match.amount,
        paymentType: match.paymentType,
        category: match.category
      }));
      setIsAutofilled(true);
    }
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vendorName.trim() || form.amount <= 0) return;
    onSubmit(form);
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onBatchSubmit) return;
    const validRows = bulkRows.filter(r => r.vendor.trim() && r.amount > 0);
    if (validRows.length === 0) return;
    onBatchSubmit(validRows);
  };

  const handlePaste = (e: React.ClipboardEvent, index: number) => {
    const text = e.clipboardData.getData('text');
    if (!text || (text.indexOf('\t') === -1 && text.indexOf(',') === -1)) return;
    e.preventDefault();
    const rows = text.split('\n').filter(r => r.trim());
    const newBulkRows = [...bulkRows];
    rows.forEach((rowStr, i) => {
      let cols = rowStr.split('\t');
      if (cols.length < 2) {
        cols = rowStr.split(',');
      }
      if (cols.length >= 2) {
        const targetIdx = index + i;
        
        let parsedDate = today;
        const rawDate = cols[0]?.trim();
        if (rawDate) {
          if (rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            parsedDate = rawDate;
          } else {
            const dmy = rawDate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
            if (dmy) {
              const day = dmy[1].padStart(2, '0');
              const month = dmy[2].padStart(2, '0');
              const year = dmy[3];
              parsedDate = `${year}-${month}-${day}`;
            }
          }
        }

        const rawAmount = cols[3]?.replace(/,/g, '').trim();
        const parsedAmount = parseFloat(rawAmount) || 0;

        const rawPaymentType = cols[4]?.trim();
        const rawCategory = cols[5]?.trim();

        const item: ExpenseBatchItem = {
          date: parsedDate,
          vendor: cols[1]?.trim() || '',
          description: cols[2]?.trim() || '',
          amount: parsedAmount,
          payment_type: (rawPaymentType as ExpensePaymentType) || 'Cash',
          category: (rawCategory as ExpenseCategory) || 'All Other Expenses',
        };
        if (targetIdx < newBulkRows.length) {
          newBulkRows[targetIdx] = item;
        } else {
          newBulkRows.push(item);
        }
      }
    });
    setBulkRows(newBulkRows);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isBulkMode ? "Bulk Add Expenses" : "Add Expense"} size={isBulkMode ? "xl" : "lg"}>
      <div className="mb-6 flex gap-2">
        <button type="button" className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${!isBulkMode ? 'bg-surface-tertiary text-text-primary border border-border-default' : 'text-text-muted hover:bg-surface-secondary'}`} onClick={() => setIsBulkMode(false)}>Single Record</button>
        <button type="button" className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${isBulkMode ? 'bg-surface-tertiary text-text-primary border border-border-default' : 'text-text-muted hover:bg-surface-secondary'}`} onClick={() => setIsBulkMode(true)}>Bulk Upload</button>
      </div>

      {!isBulkMode ? (
        <form onSubmit={handleSingleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Date</label>
            <input type="date" value={form.expenseDate} onChange={(e) => set('expenseDate', e.target.value)} className="input w-full" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Vendor</label>
            <input type="text" placeholder="e.g. ABC Supplies" value={form.vendorName} onChange={(e) => set('vendorName', e.target.value)} onBlur={handleVendorBlur} className="input w-full" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Description</label>
            <input type="text" placeholder="What was this for?" value={form.description} onChange={(e) => set('description', e.target.value)} className="input w-full" required />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-muted mb-1">
              Amount (৳)
              {isAutofilled && <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">⚠️ Last used value — verify</span>}
            </label>
            <input type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount || ''} onChange={(e) => set('amount', parseFloat(e.target.value) || 0)} className={`input w-full ${isAutofilled ? 'border-warning/50' : ''}`} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Category</label>
            <select value={form.category} onChange={(e) => set('category', e.target.value as ExpenseCategory)} className="input w-full">
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Payment Method</label>
            <select value={form.paymentType} onChange={(e) => set('paymentType', e.target.value as ExpensePaymentType)} className="input w-full">
              {EXPENSE_PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border-light">
            <button type="button" className="button-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="button-primary" disabled={isPending || !form.vendorName.trim() || form.amount <= 0} style={{ opacity: isPending || !form.vendorName.trim() || form.amount <= 0 ? 0.5 : 1 }}>
              {isPending ? 'Saving...' : 'Record Expense'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleBulkSubmit} className="flex flex-col gap-4">
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default text-text-muted text-left">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Vendor</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">Amount (৳)</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Payment</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {bulkRows.map((row, i) => (
                  <tr key={i} className="border-b border-border-light">
                    <td className="py-2 pr-2">
                      <input type="date" value={row.date} onChange={(e) => { const n = [...bulkRows]; n[i].date = e.target.value; setBulkRows(n); }} className="input w-[130px] p-1.5 text-sm" required />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="text" placeholder="Paste excel here..." value={row.vendor} onPaste={(e) => handlePaste(e, i)} onChange={(e) => { const n = [...bulkRows]; n[i].vendor = e.target.value; setBulkRows(n); }} className="input w-[150px] p-1.5 text-sm" required />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="text" placeholder="Desc" value={row.description} onChange={(e) => { const n = [...bulkRows]; n[i].description = e.target.value; setBulkRows(n); }} className="input w-[150px] p-1.5 text-sm" required />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="number" min="0" step="0.01" value={row.amount || ''} onChange={(e) => { const n = [...bulkRows]; n[i].amount = parseFloat(e.target.value) || 0; setBulkRows(n); }} className="input w-[100px] p-1.5 text-sm" required />
                    </td>
                    <td className="py-2 pr-2">
                      <select value={row.category} onChange={(e) => { const n = [...bulkRows]; n[i].category = e.target.value as ExpenseCategory; setBulkRows(n); }} className="input w-[130px] p-1.5 text-sm">
                        {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c.substring(0, 15)}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <select value={row.payment_type} onChange={(e) => { const n = [...bulkRows]; n[i].payment_type = e.target.value as ExpensePaymentType; setBulkRows(n); }} className="input w-[110px] p-1.5 text-sm">
                        {EXPENSE_PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="py-2 text-right">
                      <button type="button" onClick={() => setBulkRows(bulkRows.filter((_, idx) => idx !== i))} className="text-danger hover:text-danger/80 p-1">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 mb-4">
            <button type="button" onClick={() => setBulkRows([...bulkRows, { date: today, vendor: '', description: '', amount: 0, payment_type: 'Cash', category: 'All Other Expenses' }])} className="button-outline text-sm py-1.5">
              <Plus size={14} className="mr-1 inline" /> Add Row
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border-light">
            <button type="button" className="button-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="button-primary" disabled={batchIsPending || bulkRows.length === 0} style={{ opacity: batchIsPending || bulkRows.length === 0 ? 0.5 : 1 }}>
              {batchIsPending ? 'Saving Batch...' : `Save ${bulkRows.length} Expenses`}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function EditExpenseDrawer({
  expense,
  isOpen,
  onSubmit,
  onClose,
  isPending,
}: {
  expense: Expense | null;
  isOpen: boolean;
  onSubmit: (id: string, updates: Record<string, unknown>) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState(expense ? {
    expenseDate: expense.expenseDate,
    vendorName: expense.vendorName,
    description: expense.description,
    amount: expense.amount,
    paymentType: expense.paymentType,
    category: expense.category,
  } : {
    expenseDate: '',
    vendorName: '',
    description: '',
    amount: 0,
    paymentType: 'Cash' as ExpensePaymentType,
    category: 'All Other Expenses' as ExpenseCategory,
  });

  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  if (!expense) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Edit Expense">
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(expense.id, form); }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: 'var(--space-1)' }}>Date</label>
          <input type="date" value={form.expenseDate} onChange={e => set('expenseDate', e.target.value)} className="input w-full" required />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: 'var(--space-1)' }}>Vendor</label>
          <input type="text" value={form.vendorName} onChange={e => set('vendorName', e.target.value)} className="input w-full" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: 'var(--space-1)' }}>Description</label>
          <input type="text" value={form.description} onChange={e => set('description', e.target.value)} className="input w-full" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: 'var(--space-1)' }}>Amount (৳)</label>
          <input type="number" value={form.amount || ''} onChange={e => set('amount', parseFloat(e.target.value) || 0)} className="input w-full" required />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: 'var(--space-1)' }}>Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value as ExpenseCategory)} className="input w-full">
            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: 'var(--space-1)' }}>Payment Method</label>
          <select value={form.paymentType} onChange={e => set('paymentType', e.target.value as ExpensePaymentType)} className="input w-full">
            {EXPENSE_PAYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          <button type="button" className="button-outline" onClick={onClose} disabled={isPending}>Cancel</button>
          <button type="submit" className="button-primary" disabled={isPending}>
            {isPending ? 'Saving...' : 'Record Expense'}
          </button>
        </div>
      </form>
    </Drawer>
  );
}