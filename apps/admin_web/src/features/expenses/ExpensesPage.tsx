import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { ErrorState, EmptyState, SkeletonBlock } from '../../components/PageState';
import { useNotify } from '../../components/Notification';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../components/layout/PageHeader';
import { Drawer } from '../../components/ui/Drawer';
import { MetricCard } from '../../components/data-display/MetricCard';
import { TableFilters } from '../../components/data-display/TableFilters';
import {
  Receipt,
  Plus,
  CalendarDays,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, isToday, isThisWeek, isThisMonth } from 'date-fns';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_TYPES,
} from '../../lib/api/types';
import type { Expense, ExpenseFormData, ExpenseCategory, ExpensePaymentType } from '../../lib/api/types';

export function ExpensesPage() {
  const { notify } = useNotify();
  const { storeId } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterPaymentType, setFilterPaymentType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: expenses, isLoading, error, refetch } = useQuery({
    queryKey: ['expenses', storeId],
    queryFn: () => api.expenses.list(storeId),
  });

  const createMutation = useMutation({
    mutationFn: (form: ExpenseFormData) => api.expenses.create(storeId, form),
    onSuccess: () => {
      notify('Expense recorded successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['expenses', storeId] });
      setShowForm(false);
    },
    onError: (err: any) => {
      notify(err.message || 'Failed to record expense.', 'error');
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
          <button className="button-primary" onClick={() => setShowForm(true)}>
            <Plus size={18} /> Add Expense
          </button>
        }
      />

      <div className="dashboard-grid mt-6 mb-6">
        <MetricCard title="Today" value={`৳${todayTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`} icon={<CalendarDays size={20} className="text-emerald-600" />} color="success" variant="light" />
        <MetricCard title="This Week" value={`৳${weekTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`} icon={<TrendingUp size={20} className="text-emerald-600" />} color="success" variant="light" />
        <MetricCard title="This Month" value={`৳${monthTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}`} icon={<Wallet size={20} className="text-emerald-600" />} color="success" variant="light" />
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
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="expenses-empty">
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
                  <td className="expenses-amount text-right">৳{e.amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddExpenseDrawer
        isOpen={showForm}
        onSubmit={(form) => createMutation.mutate(form)}
        onClose={() => setShowForm(false)}
        isPending={createMutation.isPending}
      />
    </div>
  );
}

function AddExpenseDrawer({
  isOpen,
  onSubmit,
  onClose,
  isPending,
}: {
  isOpen: boolean;
  onSubmit: (form: ExpenseFormData) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState<ExpenseFormData>({
    expenseDate: today,
    vendorName: '',
    description: '',
    amount: 0,
    paymentType: 'Cash',
    category: 'All Other Expenses',
  });

  const set = <K extends keyof ExpenseFormData>(key: K, value: ExpenseFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vendorName.trim() || form.amount <= 0) return;
    onSubmit(form);
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Add Expense">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">
            Date
          </label>
          <input
            type="date"
            value={form.expenseDate}
            onChange={(e) => set('expenseDate', e.target.value)}
            className="input w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">
            Vendor
          </label>
          <input
            type="text"
            placeholder="e.g. ABC Supplies"
            value={form.vendorName}
            onChange={(e) => set('vendorName', e.target.value)}
            className="input w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">
            Description
          </label>
          <input
            type="text"
            placeholder="What was this for?"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            className="input w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">
            Amount (৳)
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={form.amount || ''}
            onChange={(e) => set('amount', parseFloat(e.target.value) || 0)}
            className="input w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">
            Category
          </label>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value as ExpenseCategory)}
            className="input w-full"
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">
            Payment Method
          </label>
          <select
            value={form.paymentType}
            onChange={(e) => set('paymentType', e.target.value as ExpensePaymentType)}
            className="input w-full"
          >
            {EXPENSE_PAYMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border-light">
          <button type="button" className="button-outline" onClick={onClose}>Cancel</button>
          <button
            type="submit"
            className="button-primary"
            disabled={isPending || !form.vendorName.trim() || form.amount <= 0}
            style={{ opacity: isPending || !form.vendorName.trim() || form.amount <= 0 ? 0.5 : 1 }}
          >
            {isPending ? 'Saving...' : 'Record Expense'}
          </button>
        </div>
      </form>
    </Drawer>
  );
}