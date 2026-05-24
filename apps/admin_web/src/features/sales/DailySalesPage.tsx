import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { ErrorState, EmptyState, SkeletonBlock } from '../../components/PageState';
import { useNotify } from '../../components/NotificationContext';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../components/layout/PageHeader';
import { Drawer } from '../../components/ui/Drawer';
import { MetricCard } from '../../components/data-display/MetricCard';
import { TableFilters } from '../../components/data-display/TableFilters';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  CalendarDays,
  Wallet,
  Plus,
  ArrowUp,
  ArrowDown,
  CreditCard,
  Banknote, Download, Trash2,
} from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, endOfWeek, endOfMonth, isToday, isThisWeek, isThisMonth, isSameDay, subMonths, subWeeks, parseISO, subDays } from 'date-fns';
import type { DailySale, DailySaleFormData } from '../../lib/api/types';
import { downloadCSV, formatCurrency } from '../../lib/format';

type TempRow = DailySale & { tempId?: string; isNew?: boolean };

const CHART_COLORS = [
  'var(--color-success-default)',
  'var(--color-info-default)',
  'var(--color-warning-default)',
  'var(--color-danger-default)',
  'var(--color-primary-default)',
];

export function DailySalesPage() {
  const { notify } = useNotify();
  const { storeId } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState<DailySale | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hideEmptyDays, setHideEmptyDays] = useState(true);
  // Selected month filter (format: 'yyyy-MM')
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Inline editing state for All Sales Entries table
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editValues, setEditValues] = useState<Record<string, Partial<DailySale>>>({});
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());
  const [savedRows, setSavedRows] = useState<Set<string>>(new Set());
  const [errorRows, setErrorRows] = useState<Set<string>>(new Set());
  const [dirtyRows, setDirtyRows] = useState<Set<string>>(new Set());
  const [tempRows, setTempRows] = useState<TempRow[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const editableFields = ['saleDate', 'cashAmount', 'bkashAmount', 'creditAmount', 'stockPurchase', 'dailyExpense'];
  const fieldOrder = editableFields;

  const getCellValue = (sale: DailySale, field: string) => {
    const edited = editValues[sale.id];
    if (edited && field in edited) {
      return edited[field as keyof DailySale];
    }
    return sale[field as keyof DailySale];
  };

  const calculateTotals = (values: Partial<DailySale>) => {
    const cash = Number(values.cashAmount ?? 0);
    const bkash = Number(values.bkashAmount ?? 0);
    const credit = Number(values.creditAmount ?? 0);
    const purchase = Number(values.stockPurchase ?? 0);
    const expense = Number(values.dailyExpense ?? 0);
    const salesTotal = cash + bkash + credit;
    const netTotal = salesTotal - purchase - expense;
    return { salesTotal, netTotal };
  };

  const TEMP_ROW_PREFIX = 'temp-';

  const createNewRow = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const tempId = `${TEMP_ROW_PREFIX}${Date.now()}`;
    const now = new Date().toISOString();
    const newRow: TempRow = {
      id: tempId,
      tempId,
      isNew: true,
      saleDate: today,
      cashAmount: 0,
      bkashAmount: 0,
      creditAmount: 0,
      totalSales: 0,
      stockPurchase: 0,
      dailyExpense: 0,
      storeId: storeId || '',
      createdAt: now,
      updatedAt: now,
    };
    setTempRows(prev => [newRow, ...prev]);
    setEditingCell({ rowId: tempId, field: 'saleDate' });
  };

  const isTempRow = (id: string) => id.startsWith(TEMP_ROW_PREFIX);

  const handleCreateFromTemp = async (tempRow: DailySale) => {
    const edited = editValues[tempRow.id];
    const values = {
      saleDate: edited?.saleDate ?? tempRow.saleDate,
      cashAmount: Number(edited?.cashAmount ?? tempRow.cashAmount ?? 0),
      bkashAmount: Number(edited?.bkashAmount ?? tempRow.bkashAmount ?? 0),
      creditAmount: Number(edited?.creditAmount ?? tempRow.creditAmount ?? 0),
      stockPurchase: Number(edited?.stockPurchase ?? tempRow.stockPurchase ?? 0),
      dailyExpense: Number(edited?.dailyExpense ?? tempRow.dailyExpense ?? 0),
    };
    const { salesTotal } = calculateTotals({ ...values, totalSales: 0 });
    
    setSavingRows(prev => new Set(prev).add(tempRow.id));
    
    try {
      await createMutation.mutateAsync({
        ...values,
        totalSales: salesTotal,
      });
      setTempRows(prev => prev.filter(r => r.id !== tempRow.id));
      setEditValues(prev => {
        const next = { ...prev };
        delete next[tempRow.id];
        return next;
      });
    } catch (err: any) {
      notify(err.message || 'Failed to create entry', 'error');
      setErrorRows(prev => new Set(prev).add(tempRow.id));
    } finally {
      setSavingRows(prev => {
        const next = new Set(prev);
        next.delete(tempRow.id);
        return next;
      });
      setEditingCell(null);
    }
  };

  const handleDeleteRow = (id: string) => {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return;
    if (isTempRow(id)) {
      setTempRows((prev: TempRow[]) => prev.filter((r: TempRow) => r.id !== id));
    } else {
      deleteMutation.mutate(id);
    }
  };

  const validateValue = (field: string, value: string): { valid: boolean; parsed: any } => {
    if (field === 'saleDate') {
      return { valid: true, parsed: value };
    }
    const num = parseFloat(value);
    if (isNaN(num)) return { valid: true, parsed: 0 };
    if (num < 0) return { valid: false, parsed: 0 };
    if (num > 999999999.99) return { valid: false, parsed: 999999999.99 };
    return { valid: true, parsed: num };
  };

  const handleCellClick = (sale: DailySale, field: string) => {
    if (!editableFields.includes(field)) return;
    setEditingCell({ rowId: sale.id, field });
    setEditValues(prev => ({
      ...prev,
      [sale.id]: { ...prev[sale.id], ...sale }
    }));
  };

  const handleCellChange = (saleId: string, field: string, value: string) => {
    const { valid, parsed } = validateValue(field, value);
    if (!valid) return;
    
    setEditValues(prev => ({
      ...prev,
      [saleId]: { ...prev[saleId], [field]: parsed }
    }));
    setDirtyRows(prev => new Set(prev).add(saleId));
  };

  const saveCellValue = async (sale: DailySale, field: string) => {
    const edited = editValues[sale.id];
    if (!edited) {
      setEditingCell(null);
      return;
    }

    const originalValue = sale[field as keyof DailySale];
    const newValue = edited[field as keyof DailySale];

    // Only save if value actually changed
    if (JSON.stringify(originalValue) === JSON.stringify(newValue)) {
      setEditingCell(null);
      return;
    }

    // Validation for negative
    if (field !== 'saleDate' && Number(newValue) < 0) {
      notify('Amount cannot be negative', 'error');
      setEditValues(prev => ({
        ...prev,
        [sale.id]: { ...prev[sale.id], [field]: 0 }
      }));
      return;
    }

    setSavingRows(prev => new Set(prev).add(sale.id));
    setEditingCell(null);
    setDirtyRows(prev => {
      const next = new Set(prev);
      next.delete(sale.id);
      return next;
    });

    const updates: Partial<DailySaleFormData> = { [field]: newValue };
    
    // Also update totalSales if payment amounts changed
    if (['cashAmount', 'bkashAmount', 'creditAmount'].includes(field)) {
      const { salesTotal } = calculateTotals(edited);
      updates.totalSales = salesTotal;
    }

    try {
      await api.dailySales.update(sale.id, updates);
      notify('Daily sale updated successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['dailySales', storeId] });
      setSavedRows(prev => new Set(prev).add(sale.id));
      setErrorRows(prev => {
        const next = new Set(prev);
        next.delete(sale.id);
        return next;
      });
      setTimeout(() => {
        setSavedRows(prev => {
          const next = new Set(prev);
          next.delete(sale.id);
          return next;
        });
      }, 2000);
    } catch (err: any) {
      notify(err.message || 'Failed to save row', 'error');
      setErrorRows(prev => new Set(prev).add(sale.id));
      // Revert to original
      setEditValues(prev => ({
        ...prev,
        [sale.id]: { ...sale }
      }));
    } finally {
      setSavingRows(prev => {
        const next = new Set(prev);
        next.delete(sale.id);
        return next;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, sale: DailySale, field: string, rowIndex: number, salesList: DailySale[]) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const isLastRow = rowIndex === salesList.length - 1;
      const isLastField = field === 'dailyExpense';
      
      if (isTempRow(sale.id)) {
        // For temp rows, Enter saves the entire row as new entry
        handleCreateFromTemp(sale);
        if (isLastRow) {
          setTimeout(() => createNewRow(), 100);
        }
      } else {
        saveCellValue(sale, field);
        // Move to next row, same column
        if (isLastRow && isLastField) {
          // On last row's last field, create new row
          setTimeout(() => createNewRow(), 0);
        } else if (!isLastRow) {
          setTimeout(() => {
            setEditingCell({ rowId: salesList[rowIndex + 1].id, field });
          }, 0);
        }
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValues(prev => ({
        ...prev,
        [sale.id]: { ...sale }
      }));
      setDirtyRows(prev => {
        const next = new Set(prev);
        next.delete(sale.id);
        return next;
      });
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const currentFieldIndex = fieldOrder.indexOf(field);
      let nextFieldIndex: number;
      let nextRowIndex = rowIndex;
      
      if (e.shiftKey) {
        // Shift+Tab: previous field
        nextFieldIndex = currentFieldIndex - 1;
        if (nextFieldIndex < 0) {
          nextFieldIndex = fieldOrder.length - 1;
          nextRowIndex = rowIndex - 1;
        }
      } else {
        // Tab: next field
        nextFieldIndex = currentFieldIndex + 1;
        if (nextFieldIndex >= fieldOrder.length) {
          nextFieldIndex = 0;
          nextRowIndex = rowIndex + 1;
        }
      }
      
      if (nextRowIndex >= 0 && nextRowIndex < salesList.length) {
        saveCellValue(sale, field);
        setTimeout(() => {
          setEditingCell({ rowId: salesList[nextRowIndex].id, field: fieldOrder[nextFieldIndex] });
        }, 0);
      }
    }
  };

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.type === 'text' || inputRef.current.type === 'number') {
        inputRef.current.select();
      }
    }
  }, []);

  useEffect(() => {
    if (editingCell) {
      focusInput();
    }
  }, [editingCell, focusInput]);

  const renderEditableCell = (sale: DailySale, field: string, rowIndex: number, salesList: DailySale[]) => {
    const isEditing = editingCell?.rowId === sale.id && editingCell?.field === field;
    const value = getCellValue(sale, field);
    const isSaving = savingRows.has(sale.id);
    const isSaved = savedRows.has(sale.id);
    const isDirty = dirtyRows.has(sale.id);
    const hasError = errorRows.has(sale.id);

    if (isEditing) {
      const inputType = field === 'saleDate' ? 'date' : 'number';
      const step = field === 'saleDate' ? undefined : '0.01';
      const min = field === 'saleDate' ? undefined : '0';
      const displayValue = field === 'saleDate' ? value : (value === '' || value === null || value === undefined ? '' : Number(value));

      return (
        <td className="py-2 px-2 relative" key={`${sale.id}-${field}-edit`}
          style={{ 
            border: '2px solid var(--color-primary)',
            backgroundColor: 'var(--color-primary-subtle, rgba(59, 130, 246, 0.1))'
          }}
        >
          <input
            ref={inputRef}
            type={inputType}
            step={step}
            min={min}
            value={displayValue}
            onChange={(e) => handleCellChange(sale.id, field, e.target.value)}
            onBlur={() => saveCellValue(sale, field)}
            onKeyDown={(e) => handleKeyDown(e, sale, field, rowIndex, salesList)}
            className="w-full px-2 py-1 text-sm text-right rounded outline-none bg-transparent"
          />
      </td>
      );
    }

    const formatValue = (val: any, f: string) => {
      if (f === 'saleDate') return format(new Date(val), 'dd MMM yyyy');
      return `৳${Number(val || 0).toLocaleString()}`;
    };

    return (
      <td
        key={`${sale.id}-${field}`}
        className="py-3 px-4 text-sm text-text-primary text-right cursor-pointer hover:bg-surface-secondary transition-colors relative"
        onClick={() => handleCellClick(sale, field)}
        style={{ opacity: isSaving ? 0.7 : 1 }}
      >
        <span>{formatValue(value, field)}</span>
        {isDirty && !isSaved && !hasError && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-warning" title="Unsaved changes" />
        )}
        {isSaved && (
          <span className="absolute top-1 right-1 text-success text-xs" title="Saved">✓</span>
        )}
        {hasError && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger" title="Save failed - click to retry" />
        )}
      </td>
    );
  };

  const { data: sales, isLoading, error, refetch } = useQuery({
    queryKey: ['dailySales', storeId],
    queryFn: () => api.dailySales.list(storeId),
  });

  const createMutation = useMutation({
    mutationFn: (form: DailySaleFormData) => api.dailySales.create(storeId, form),
    onSuccess: (created) => {
      notify('Daily sale recorded successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['dailySales', storeId] });
      // Remove temp row that matches this new entry
      setTempRows(prev => prev.filter(r => r.tempId !== created.id));
      setShowForm(false);
    },
    onError: (err: any) => {
      notify(err.message || 'Failed to record daily sale.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.dailySales.remove(id),
    onSuccess: () => {
      notify('Entry deleted', 'success');
      queryClient.invalidateQueries({ queryKey: ['dailySales', storeId] });
    },
    onError: (err: any) => {
      notify(err.message || 'Failed to delete entry.', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<DailySaleFormData> }) => 
      api.dailySales.update(id, updates),
    onSuccess: () => {
      notify('Daily sale updated successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['dailySales', storeId] });
      setEditingSale(null);
    },
    onError: (err: any) => {
      notify(err.message || 'Failed to update daily sale.', 'error');
    },
  });

  

  const allSales = sales || [];

  // Time-based totals
  const todayTotal = useMemo(
    () => allSales.filter((s) => isToday(new Date(s.saleDate))).reduce((sum, s) => sum + s.totalSales, 0),
    [allSales],
  );

  // Yesterday's total
  const yesterdayDate = subDays(new Date(), 1);
  const yesterdayTotal = useMemo(
    () => allSales.filter((s) => isSameDay(new Date(s.saleDate), yesterdayDate)).reduce((sum, s) => sum + s.totalSales, 0),
    [allSales],
  );
  const weekTotal = useMemo(
    () => allSales.filter((s) => isThisWeek(new Date(s.saleDate), { weekStartsOn: 6 })).reduce((sum, s) => sum + s.totalSales, 0),
    [allSales],
  );
  // Last week's total (previous week)
  const startPrevWeek = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 6 });
  const endPrevWeek = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 6 });
  const lastWeekTotal = useMemo(
    () => allSales.filter((s) => {
      const d = new Date(s.saleDate);
      return d >= startPrevWeek && d <= endPrevWeek;
    }).reduce((sum, s) => sum + s.totalSales, 0),
    [allSales],
  );
  const monthTotal = useMemo(
    () => allSales.filter((s) => isThisMonth(new Date(s.saleDate))).reduce((sum, s) => sum + s.totalSales, 0),
    [allSales],
  );
  // Last month's total (previous month)
  const startPrevMonth = startOfMonth(subMonths(new Date(), 1));
  const endPrevMonth = endOfMonth(subMonths(new Date(), 1));
  const lastMonthTotal = useMemo(
    () => allSales.filter((s) => {
      const d = new Date(s.saleDate);
      return d >= startPrevMonth && d <= endPrevMonth;
    }).reduce((sum, s) => sum + s.totalSales, 0),
    [allSales],
  );

  // Days with sales since April 4th
  const salesStartDate = new Date('2026-04-04');
  const daysSinceStartCount = useMemo(() => {
    const dateSet = new Set<string>();
    allSales.forEach(s => {
      const d = new Date(s.saleDate);
      if (d >= salesStartDate) {
        dateSet.add(s.saleDate);
      }
    });
    return dateSet.size;
  }, [allSales]);
  // Duplicate startDate block removed

  const totalStats = useMemo(() => {
    // Only count days with actual sales since store opening (April 4th)
    const salesOnly = allSales.filter(s => new Date(s.saleDate) >= salesStartDate && s.totalSales > 0);
    if (salesOnly.length === 0) return { total: 0, avg: 0, min: 0, max: 0, count: 0 };
    const amounts = salesOnly.map(s => s.totalSales);
    const total = amounts.reduce((a, b) => a + b, 0);
    return {
      total,
      avg: total / amounts.length,
      min: Math.min(...amounts),
      max: Math.max(...amounts),
      count: salesOnly.length,
    };
  }, [allSales]);

  // Monthly comparison
  const monthlyComparison = useMemo(() => {
    const now = new Date();
    const thisMonth = allSales.filter(s => isThisMonth(new Date(s.saleDate))).reduce((sum, s) => sum + s.totalSales, 0);
    const lastMonthStart = subMonths(startOfMonth(now), 1);
    const lastMonthEnd = startOfMonth(now);
    const lastMonth = allSales
      .filter(s => {
        const d = new Date(s.saleDate);
        return d >= lastMonthStart && d < lastMonthEnd;
      })
      .reduce((sum, s) => sum + s.totalSales, 0);
    const change = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
    return { thisMonth, lastMonth, change };
  }, [allSales]);

  // Payment breakdown for pie chart
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

  // Daily trend for line chart (last 30 days)
  const dailyTrend = useMemo(() => {
    const grouped: Record<string, { sales: number; expense: number; purchase: number }> = {};
    allSales.forEach(s => {
      grouped[s.saleDate] = {
        sales: s.totalSales,
        expense: s.dailyExpense,
        purchase: s.stockPurchase,
      };
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
  }, [allSales]);

  // Monthly trend
  const monthlyTrend = useMemo(() => {
    const grouped: Record<string, { total: number; count: number }> = {};
    allSales.forEach(s => {
      const monthKey = s.saleDate.substring(0, 7);
      if (!grouped[monthKey]) grouped[monthKey] = { total: 0, count: 0 };
      grouped[monthKey].total += s.totalSales;
      grouped[monthKey].count++;
    });
    return Object.entries(grouped)
      .map(([month, data]) => ({
        month: format(parseISO(`${month}-01`), 'MMM yyyy'),
        total: data.total,
        count: data.count,
      }))
      .sort((a, b) => new Date(`1 ${a.month}`).getTime() - new Date(`1 ${b.month}`).getTime());
  }, [allSales]);

  // Top 10 highest sales days
  const topSalesDays = useMemo(() => {
    return [...allSales]
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 5)
      .map(s => ({
        ...s,
        date: format(new Date(s.saleDate), 'dd MMM yyyy'),
      }));
  }, [allSales]);
  const tableData = useMemo(() => {
    let data = sales || [];
    if (hideEmptyDays) {
      data = data.filter(s => s.cashAmount !== 0 || s.bkashAmount !== 0 || s.creditAmount !== 0 || s.stockPurchase !== 0 || s.dailyExpense !== 0);
    }
    return data;
  }, [sales, hideEmptyDays]);
  if (isLoading) {
    return (
      <div className="sales-container">
        <PageHeader title="Daily Sales & Expenditure Summary" subtitle="Track daily sales, purchases, and expenses with auto-calculated totals." />
        <div className="dashboard-grid mt-6">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sales-container">
        <PageHeader title="Daily Sales & Expenditure Summary" subtitle="Track daily sales, purchases, and expenses with auto-calculated totals." />
        <div className="card">
          <ErrorState message="Failed to load daily sales." onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  // tableData moved above loading/error checks

  return (
    <div className="sales-container">
      <PageHeader
        title="Daily Sales & Expenditure Summary"
        subtitle="Track daily sales, purchases, and expenses with auto-calculated totals."
        actions={
          <div className="flex items-center gap-2">
            <button
              className="button-outline gap-2"
              onClick={() => downloadCSV(
                (sales || []).map((s: DailySale) => ({
                  date: s.saleDate, totalSales: s.totalSales, cash: s.cashAmount,
                  bkash: s.bkashAmount, credit: s.creditAmount,
                  stockPurchase: s.stockPurchase, dailyExpense: s.dailyExpense,
                })),
                `daily-sales-${new Date().toISOString().split('T')[0]}.csv`
              )}
            >
              <Download size={16} /> Export CSV
            </button>
            {/* Add Daily Sale button moved to All Sales Entries section */}
          </div>
        }
      />

      <div className="dashboard-grid mt-6 mb-6">
        <MetricCard title="Today's Sales" value={`৳${todayTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`} icon={<CalendarDays size={20} className="text-emerald-600" />} color="success" variant="light" />
        <MetricCard title="Yesterday's Sales" value={`৳${yesterdayTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`} icon={<CalendarDays size={20} className="text-emerald-600" />} color="success" variant="light" />
        <MetricCard title="This Week" value={`৳${weekTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`} icon={<TrendingUp size={20} className="text-emerald-600" />} color="success" variant="light" />
        <MetricCard title="Last Week" value={`৳${lastWeekTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`} icon={<TrendingUp size={20} className="text-emerald-600" />} color="success" variant="light" />
        <MetricCard title="This Month" value={`৳${monthTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`} icon={<Wallet size={20} className="text-emerald-600" />} color="success" variant="light" />
        <MetricCard title="Last Month" value={`৳${lastMonthTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`} icon={<Wallet size={20} className="text-emerald-600" />} color="success" variant="light" />
        <MetricCard title="Total Records" value={totalStats.count.toString()} icon={<Banknote size={20} className="text-info" />} color="info" variant="light" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Sales Overview</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-surface-secondary rounded-lg">
              <div className="text-sm text-text-muted">Total Sales</div>
              <div className="text-2xl font-bold text-success">৳{totalStats.total.toLocaleString('en-BD', { maximumFractionDigits: 0 })}</div>
              <div className="text-xs text-text-muted">{totalStats.count} days recorded</div>
            </div>
            <div className="p-4 bg-surface-secondary rounded-lg">
              <div className="text-sm text-text-muted">Average Daily</div>
              <div className="text-2xl font-bold text-text-primary">৳{totalStats.avg.toLocaleString('en-BD', { maximumFractionDigits: 0 })}</div>
              <div className="text-xs text-text-muted">per day</div>
            </div>
            <div className="p-4 bg-surface-secondary rounded-lg">
              <div className="text-sm text-text-muted">Highest Day</div>
              <div className="text-2xl font-bold text-success">৳{totalStats.max.toLocaleString('en-BD', { maximumFractionDigits: 0 })}</div>
              <div className="text-xs text-text-muted">best day</div>
            </div>
            <div className="p-4 bg-surface-secondary rounded-lg">
              <div className="text-sm text-text-muted">Lowest Day</div>
              <div className="text-2xl font-bold text-danger">৳{totalStats.min.toLocaleString('en-BD', { maximumFractionDigits: 0 })}</div>
              <div className="text-xs text-text-muted">slowest day</div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Payment Breakdown</h2>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
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
                <Tooltip 
                  formatter={(value: any) => value !== undefined && value !== null ? [`৳${Number(value).toLocaleString()}`, 'Amount'] : ['N/A', 'Amount']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {paymentBreakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS[idx] }} />
                  <span className="text-sm text-text-primary">{item.name}</span>
                </div>
                <div className="text-sm">
                  <span className="font-semibold">৳{item.value.toLocaleString()}</span>
                  <span className="text-text-muted ml-2">({item.percentage.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Monthly Sales Trend</h2>
        {monthlyTrend.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `৳${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: any) => value !== undefined && value !== null ? [`৳${Number(value).toLocaleString()}`, 'Total Sales'] : ['N/A', 'Total Sales']}
                  contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-default)' }}
                />
                <Bar dataKey="total" fill="var(--color-success-default)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            icon={<TrendingUp size={48} />}
            title="No data available"
            description="Add daily sales to see trends."
          />
        )}
      </div>

      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Daily Trend (Last 30 Days)</h2>
        {dailyTrend.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={10} interval="preserveStartEnd" angle={-45} textAnchor="end" height={60} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `৳${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-default)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="var(--color-success-default)" strokeWidth={2} name="Sales" dot={false} />
                <Line type="monotone" dataKey="expense" stroke="var(--color-danger-default)" strokeWidth={2} name="Expense" dot={false} />
                <Line type="monotone" dataKey="purchase" stroke="var(--color-info-default)" strokeWidth={2} name="Stock Purchase" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            icon={<TrendingUp size={48} />}
            title="No data available"
            description="Add daily sales to see trends."
          />
        )}
      </div>

      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Top 5 Highest Sales Days</h2>
        {topSalesDays.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">Date</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Total Sales</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Cash</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Bkash</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Credit</th>
                </tr>
              </thead>
              <tbody>
                {topSalesDays.map((s) => (
                  <tr key={s.id} className="border-b border-border-default hover:bg-surface-secondary">
                    <td className="py-3 px-4 text-sm text-text-primary">{s.date}</td>
                    <td className="py-3 px-4 text-sm font-semibold text-success text-right">৳{s.totalSales.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-text-primary text-right">৳{s.cashAmount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-text-primary text-right">৳{s.bkashAmount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-text-primary text-right">৳{s.creditAmount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<DollarSign size={48} />}
            title="No sales data"
            description="Add daily sales to see top performing days."
          />
        )}
      </div>
      <div className="card p-6 mt-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary mb-4">All Sales Entries</h2>
          <button className="button-primary gap-2" onClick={() => setShowForm(true)}>
            <Plus size={18} /> Add Daily Sale
          </button>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-text-muted mb-4">
          <input type="checkbox" checked={hideEmptyDays} onChange={(e) => setHideEmptyDays(e.target.checked)} className="form-checkbox rounded text-primary" />
          Hide Empty Activity Days
        </label>
        {(tempRows.length > 0 || tableData.length > 0) ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">Date</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Cash</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Bkash</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Credit</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Sales Total</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Purchase</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Expense</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Daily Cash Flow</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">Gross Margin</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-text-muted w-10">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...tempRows, ...tableData].map((s, idx, list) => {
                  const edited = editValues[s.id] || s;
                  const salesTotal = Number(edited.cashAmount ?? s.cashAmount) + 
                                     Number(edited.bkashAmount ?? s.bkashAmount) + 
                                     Number(edited.creditAmount ?? s.creditAmount);
                  const netTotal = salesTotal - 
                                   Number(edited.stockPurchase ?? s.stockPurchase) - 
                                   Number(edited.dailyExpense ?? s.dailyExpense);
                  const netColorClass = netTotal >= 0 ? 'text-success' : 'text-danger';
                  const isSaving = savingRows.has(s.id);
                  const isTemp = isTempRow(s.id);
                  
                  return (
                    <tr 
                      key={s.id} 
                      className="border-b border-border-default hover:bg-surface-secondary group relative" 
                      style={{ 
                        opacity: isSaving ? 0.7 : 1,
                        backgroundColor: isTemp ? 'var(--color-primary-subtle, rgba(59, 130, 246, 0.1))' : undefined
                      }}
                    >
                      {renderEditableCell(s, 'saleDate', idx, list)}
                      {renderEditableCell(s, 'cashAmount', idx, list)}
                      {renderEditableCell(s, 'bkashAmount', idx, list)}
                      {renderEditableCell(s, 'creditAmount', idx, list)}
                      <td className="py-3 px-4 text-sm text-text-primary text-right">{formatCurrency(salesTotal)}</td>
                      {renderEditableCell(s, 'stockPurchase', idx, list)}
                      {renderEditableCell(s, 'dailyExpense', idx, list)}
                      <td className={`py-3 px-4 text-sm font-semibold text-right ${netColorClass}`}>{formatCurrency(netTotal)}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-right text-text-primary">{formatCurrency(salesTotal)}</td>
                      <td className="py-3 px-2 w-10 text-center">
                        <button
                          onClick={() => handleDeleteRow(s.id)}
                          className="transition-colors p-1 rounded hover:bg-danger-subtle text-danger"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<DollarSign size={48} />}
            title="No entries yet"
            description="Click '+ Add New Entry' to start."
          />
        )}
      </div>

      <Drawer
        isOpen={showForm || editingSale !== null}
        onClose={() => {
          setShowForm(false);
          setEditingSale(null);
        }}
        title={editingSale ? 'Edit Daily Sale' : 'Add Daily Sale'}
      >
        <DailySaleForm
          initialData={editingSale}
          onSubmit={(data) => {
            if (editingSale) {
              updateMutation.mutate({ id: editingSale.id, updates: data });
            } else {
              createMutation.mutate(data);
            }
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingSale(null);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </Drawer>
    </div>
  );
}

function DailySaleForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initialData: DailySale | null;
  onSubmit: (data: DailySaleFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState<DailySaleFormData>(() => ({
    saleDate: initialData?.saleDate || format(new Date(), 'yyyy-MM-dd'),
    cashAmount: initialData?.cashAmount || 0,
    bkashAmount: initialData?.bkashAmount || 0,
    creditAmount: initialData?.creditAmount || 0,
    totalSales: initialData?.totalSales || 0,
    stockPurchase: initialData?.stockPurchase || 0,
    dailyExpense: initialData?.dailyExpense || 0,
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const handleAmountChange = (field: keyof DailySaleFormData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setForm(prev => {
      const updated = { ...prev, [field]: numValue };
      if (field === 'cashAmount' || field === 'bkashAmount' || field === 'creditAmount') {
        updated.totalSales = updated.cashAmount + updated.bkashAmount + updated.creditAmount;
      }
      return updated;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Date</label>
        <input
          type="date"
          value={form.saleDate}
          onChange={(e) => setForm(prev => ({ ...prev, saleDate: e.target.value }))}
          className="input w-full"
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Cash</label>
          <input
            type="number"
            step="0.01"
            value={form.cashAmount}
            onChange={(e) => handleAmountChange('cashAmount', e.target.value)}
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Bkash</label>
          <input
            type="number"
            step="0.01"
            value={form.bkashAmount}
            onChange={(e) => handleAmountChange('bkashAmount', e.target.value)}
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Credit</label>
          <input
            type="number"
            step="0.01"
            value={form.creditAmount}
            onChange={(e) => handleAmountChange('creditAmount', e.target.value)}
            className="input w-full"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Total Sales (Auto)</label>
        <input
          type="number"
          step="0.01"
          value={form.totalSales}
          onChange={(e) => handleAmountChange('totalSales', e.target.value)}
          className="input w-full bg-surface-secondary"
        />
        <p className="text-xs text-text-muted mt-1">Auto-calculated from Cash + Bkash + Credit</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Stock Purchase</label>
          <input
            type="number"
            step="0.01"
            value={form.stockPurchase}
            onChange={(e) => handleAmountChange('stockPurchase', e.target.value)}
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Daily Expense</label>
          <input
            type="number"
            step="0.01"
            value={form.dailyExpense}
            onChange={(e) => handleAmountChange('dailyExpense', e.target.value)}
            className="input w-full"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={onCancel} className="button-secondary" disabled={isLoading}>
          Cancel
        </button>
        <button type="submit" className="button-primary" disabled={isLoading}>
          {isLoading ? 'Saving...' : initialData ? 'Update' : 'Add'}
        </button>
      </div>
    </form>
  );
}
