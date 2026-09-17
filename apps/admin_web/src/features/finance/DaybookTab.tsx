import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Download, Calendar, DollarSign, Receipt, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { formatCurrency } from '../../lib/format';
import { SkeletonBlock, EmptyState, ErrorState } from '@/components';
import { FinanceMetricCard } from '@/components';

interface DaybookTabProps {
  startDate: string;
  endDate: string;
}

export type ActivityCategory = 'all' | 'sales' | 'expenses' | 'purchases' | 'other_income';

export interface DaybookActivityItem {
  id: string;
  date: string;
  category: 'sales' | 'expenses' | 'purchases' | 'other_income';
  description: string;
  reference?: string;
  inflow: number;
  outflow: number;
  paymentMethod?: string;
}

export function DaybookTab({ startDate, endDate }: DaybookTabProps) {
  const { storeId, tenantId } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory>('all');

  // Fetch all domain daily activities across the date range
  const { data: dailySalesData, isLoading: salesLoading, error: salesError, refetch: refetchSales } = useQuery({
    queryKey: ['dailySales', storeId, startDate, endDate],
    queryFn: () => api.dailySales.list(storeId, { startDate, endDate }),
  });

  const { data: expensesData, isLoading: expensesLoading, error: expensesError, refetch: refetchExpenses } = useQuery({
    queryKey: ['expenses', storeId, startDate, endDate],
    queryFn: () => api.expenses.list(storeId, { startDate, endDate }),
  });

  const { data: otherIncomeData, isLoading: incomeLoading, error: incomeError, refetch: refetchIncome } = useQuery({
    queryKey: ['otherIncome', tenantId, storeId],
    queryFn: () => api.otherIncome.list(tenantId, storeId),
    enabled: Boolean(tenantId),
  });

  const isLoading = salesLoading || expensesLoading || incomeLoading;
  const isError = salesError || expensesError || incomeError;

  // Unify mapped transactions into daily chronological items
  const activityItems = useMemo<DaybookActivityItem[]>(() => {
    const items: DaybookActivityItem[] = [];

    // Map Daily Sales & Cash Collections
    (dailySalesData || []).forEach((sale) => {
      if (sale.totalSales > 0) {
        const tenderCount = (sale.cashAmount > 0 ? 1 : 0) + (sale.bkashAmount > 0 ? 1 : 0) + (sale.creditAmount > 0 ? 1 : 0);
        let method = 'Cash';
        if (tenderCount > 1) {
          method = 'Split Tender';
        } else if (sale.creditAmount > 0) {
          method = 'Credit';
        } else if (sale.bkashAmount > 0) {
          method = 'Digital/Bkash';
        }

        items.push({
          id: `sale-${sale.id}`,
          date: sale.saleDate,
          category: 'sales',
          description: 'Daily Store Sales',
          reference: sale.id ? `DS-${sale.id.slice(0, 8)}` : undefined,
          inflow: sale.totalSales,
          outflow: 0,
          paymentMethod: method,
        });
      }

      if (sale.stockPurchase > 0) {
        items.push({
          id: `purchase-${sale.id}`,
          date: sale.saleDate,
          category: 'purchases',
          description: 'Daily Direct Stock Purchase',
          reference: sale.id ? `PO-${sale.id.slice(0, 8)}` : undefined,
          inflow: 0,
          outflow: sale.stockPurchase,
          paymentMethod: 'Cash/Supplier',
        });
      }

      if (sale.dailyExpense > 0) {
        items.push({
          id: `daily-expense-${sale.id}`,
          date: sale.saleDate,
          category: 'expenses',
          description: 'Daily Shop Expense',
          reference: sale.id ? `DE-${sale.id.slice(0, 8)}` : undefined,
          inflow: 0,
          outflow: sale.dailyExpense,
          paymentMethod: 'Cash',
        });
      }
    });

    // Map Operating Expenses
    (expensesData || []).forEach((exp) => {
      const isStockPurchase = exp.category === 'Stock Purchase';
      items.push({
        id: `exp-${exp.id}`,
        date: exp.expenseDate,
        category: isStockPurchase ? 'purchases' : 'expenses',
        description: exp.description || exp.category || 'Operating Expense',
        reference: exp.vendorName || exp.category,
        inflow: 0,
        outflow: exp.amount,
        paymentMethod: exp.paymentType || 'Cash',
      });
    });

    // Map Other Incomes
    (otherIncomeData || []).forEach((inc) => {
      if (!startDate || !endDate || (inc.date >= startDate && inc.date <= endDate)) {
        items.push({
          id: `inc-${inc.id}`,
          date: inc.date,
          category: 'other_income',
          description: inc.category || 'Other Income',
          reference: inc.notes,
          inflow: inc.amount,
          outflow: 0,
          paymentMethod: inc.paymentMethod || 'Cash',
        });
      }
    });

    // Sort descending by date
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dailySalesData, expensesData, otherIncomeData, startDate, endDate]);

  // Filter by category
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') return activityItems;
    return activityItems.filter((i) => i.category === selectedCategory);
  }, [activityItems, selectedCategory]);

  // Totals & Control Reconciliation
  const totalInflow = useMemo(() => activityItems.reduce((acc, i) => acc + i.inflow, 0), [activityItems]);
  const totalOutflow = useMemo(() => activityItems.reduce((acc, i) => acc + i.outflow, 0), [activityItems]);
  const netDailyBalance = totalInflow - totalOutflow;

  const escapeCSVCell = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    const sanitized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
    return `"${sanitized.replace(/"/g, '""')}"`;
  };

  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;
    const headers = ['Date', 'Category', 'Description', 'Reference', 'Inflow', 'Outflow', 'Payment Method'];
    const rows = filteredItems.map((item) => [
      escapeCSVCell(item.date),
      escapeCSVCell(item.category),
      escapeCSVCell(item.description),
      escapeCSVCell(item.reference || ''),
      escapeCSVCell(item.inflow),
      escapeCSVCell(item.outflow),
      escapeCSVCell(item.paymentMethod || ''),
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Daybook_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonBlock className="h-28 rounded-xl" />
          <SkeletonBlock className="h-28 rounded-xl" />
          <SkeletonBlock className="h-28 rounded-xl" />
        </div>
        <SkeletonBlock className="h-64 rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        message="Could not retrieve daily activity logs. Please check your connection and try again."
        onRetry={() => {
          refetchSales();
          refetchExpenses();
          refetchIncome();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FinanceMetricCard
          title="Total Inflow"
          value={formatCurrency(totalInflow)}
          icon={<TrendingUp size={20} className="text-emerald-600" />}
          color="success"
        />
        <FinanceMetricCard
          title="Total Outflow"
          value={formatCurrency(totalOutflow)}
          icon={<Receipt size={20} className="text-rose-600" />}
          color="danger"
        />
        <FinanceMetricCard
          title="Net Cash Movement"
          value={formatCurrency(netDailyBalance)}
          icon={<DollarSign size={20} className="text-primary" />}
          color={netDailyBalance >= 0 ? 'success' : 'danger'}
        />
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--color-paper)] p-4 rounded-xl border border-[var(--color-border)]">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {(['all', 'sales', 'expenses', 'purchases', 'other_income'] as ActivityCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 shrink-0 ${
                selectedCategory === cat
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] shadow-sm'
                  : 'bg-[var(--color-border-light)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
              }`}
            >
              {cat === 'other_income' ? 'Income' : cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filteredItems.length === 0}
            className="button-outline text-xs px-3 py-1.5 flex items-center gap-1.5"
            type="button"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Unified Activity Table */}
      <div className="card overflow-hidden p-0 border border-[var(--color-border)]">
        {filteredItems.length === 0 ? (
          <EmptyState
            icon={<Calendar size={48} />}
            title="No activity recorded"
            description="No transaction activities found for the selected category and date range."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-background-subtle)] text-[var(--color-muted)] text-xs uppercase tracking-wider text-left">
                  <th className="p-4">Date</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Method / Ref</th>
                  <th className="p-4 text-right">Inflow</th>
                  <th className="p-4 text-right">Outflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--color-background-subtle)]/50 transition-colors">
                    <td className="p-4 text-sm text-[var(--color-muted)] whitespace-nowrap">
                      {format(parseISO(item.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${
                          item.category === 'sales'
                            ? 'bg-[var(--color-success-subtle)] text-[var(--color-success-default)]'
                            : item.category === 'other_income'
                            ? 'bg-[var(--color-info-subtle)] text-[var(--color-info-default)]'
                            : item.category === 'purchases'
                            ? 'bg-[var(--color-warning-subtle)] text-[var(--color-warning-default)]'
                            : 'bg-[var(--color-danger-subtle)] text-[var(--color-danger-default)]'
                        }`}
                      >
                        {item.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-[var(--color-foreground)]">{item.description}</div>
                      {item.reference && <div className="text-xs text-[var(--color-muted)]">{item.reference}</div>}
                    </td>
                    <td className="p-4 text-xs text-[var(--color-muted)]">
                      {item.paymentMethod || '—'}
                    </td>
                    <td className="p-4 text-right font-semibold text-sm text-[var(--color-success-default)]">
                      {item.inflow > 0 ? formatCurrency(item.inflow) : '—'}
                    </td>
                    <td className="p-4 text-right font-semibold text-sm text-[var(--color-danger-default)]">
                      {item.outflow > 0 ? formatCurrency(item.outflow) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
