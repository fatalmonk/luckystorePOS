import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { SkeletonBlock } from '../../components/PageState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { useNotify } from '../../components/NotificationContext';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../layouts/PageHeader';
import { PageContainer } from '../../layouts/PageContainer';
import { Drawer } from '../../components/ui/Drawer';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { MetricCard } from '../../components/data-display/MetricCard';
import { TableFilters } from '../../components/data-display/TableFilters';
import { useForm } from 'react-hook-form';
import { Form, FormInput, FormSelect, PriceInput, FormActions } from '../../components/forms';
import {
  Receipt,
  Plus,
  CalendarDays,
  TrendingUp,
  Wallet,
  Edit2,
  Trash2,
} from 'lucide-react';
import { format, isToday, isThisWeek, isThisMonth } from 'date-fns';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_TYPES,
} from '../../lib/api/types';
import type { Expense, ExpenseFormData } from '../../lib/api/types';

export function ExpensesPage() {
  const { notify } = useNotify();
  const { storeId } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
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

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => api.expenses.update(id, updates),
    onSuccess: () => {
      notify('Expense updated successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['expenses', storeId] });
      setEditingExpense(null);
    },
    onError: (err: any) => {
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
    onError: (err: any) => {
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

  if (error) {
    return (
      <PageContainer className="expenses-container">
        <PageHeader
          title="Expenses"
          description="Track and manage store expenses."
        />
        <div className="card">
          <ErrorState message="Failed to load expenses." onRetry={() => refetch()} />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="expenses-container">
      <PageHeader
        title="Expenses"
        description="Track and manage store expenses."
        action={
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
                  <td className="expenses-amount text-right">৳{e.amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</td>
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
        onClose={() => setShowForm(false)}
        isPending={createMutation.isPending}
      />

      <EditExpenseDrawer
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
        onConfirm={() => deletingExpenseId && deleteMutation.mutate(deletingExpenseId)}
        onCancel={() => setDeletingExpenseId(null)}
      />
    </PageContainer>
  );
}

function AddExpenseDrawer({
  isOpen,
  onSubmit,
  onClose,
  isPending,
}: {
  isOpen: boolean;
  onSubmit: (form: any) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const form = useForm<any>({
    defaultValues: {
      expenseDate: today,
      vendorName: '',
      description: '',
      amount: 0,
      paymentType: 'Cash',
      category: 'All Other Expenses',
    }
  });

  const handleSubmit = (data: any) => {
    onSubmit(data);
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Add Expense">
      <Form form={form} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormInput 
          type="date"
          name="expenseDate"
          label="Date"
          required
        />
        <FormInput 
          name="vendorName"
          label="Vendor"
          placeholder="e.g. ABC Supplies"
          required
        />
        <FormInput 
          name="description"
          label="Description"
          placeholder="What was this for?"
          required
        />
        <PriceInput 
          name="amount"
          label="Amount"
        />
        <FormSelect
          name="category"
          label="Category"
          options={EXPENSE_CATEGORIES.map(c => ({ label: c, value: c }))}
        />
        <FormSelect
          name="paymentType"
          label="Payment Method"
          options={EXPENSE_PAYMENT_TYPES.map(t => ({ label: t, value: t }))}
        />

        <FormActions>
          <button type="button" className="button-outline" onClick={onClose}>Cancel</button>
          <button
            type="submit"
            className="button-primary"
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Record Expense'}
          </button>
        </FormActions>
      </Form>
    </Drawer>
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
  onSubmit: (id: string, updates: any) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const form = useForm<any>({
    values: expense ? {
      expenseDate: expense.expenseDate,
      vendorName: expense.vendorName,
      description: expense.description,
      amount: expense.amount,
      paymentType: expense.paymentType,
      category: expense.category,
    } : undefined
  });

  if (!expense) return null;

  const handleSubmit = (data: any) => {
    onSubmit(expense.id, data);
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Edit Expense">
      <Form form={form} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormInput 
          type="date"
          name="expenseDate"
          label="Date"
          required
        />
        <FormInput 
          name="vendorName"
          label="Vendor"
          required
        />
        <FormInput 
          name="description"
          label="Description"
          required
        />
        <PriceInput 
          name="amount"
          label="Amount"
        />
        <FormSelect
          name="category"
          label="Category"
          options={EXPENSE_CATEGORIES.map(c => ({ label: c, value: c }))}
        />
        <FormSelect
          name="paymentType"
          label="Payment Method"
          options={EXPENSE_PAYMENT_TYPES.map(t => ({ label: t, value: t }))}
        />
        <FormActions>
          <button type="button" className="button-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="button-primary" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </FormActions>
      </Form>
    </Drawer>
  );
}