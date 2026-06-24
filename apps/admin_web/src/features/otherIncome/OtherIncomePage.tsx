import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Banknote, Calendar, AlertCircle, Trash2, Loader2, Info } from 'lucide-react';
import { otherIncome, OtherIncome, OtherIncomeFormData } from '../../lib/api/domains/otherIncome';
import { useAuth } from '../../lib/AuthContext';
import { useNotify } from '../../components/NotificationContext';
import { Drawer } from '../../components/ui/Drawer';
import { format, startOfMonth, isWithinInterval, endOfMonth } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../lib/format';

const incomeFormSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  category: z.enum(['Display Fee', 'Delivery', 'Miscellaneous'], {
    message: 'Category must be selected',
  }),
  amount: z.number({ message: 'Amount must be a number' }).min(1, 'Amount must be at least 1'),
  paymentMethod: z.enum(['Cash', 'bKash', 'Bank'], {
    message: 'Payment method must be selected',
  }),
  notes: z.string().optional(),
});

type IncomeFormValues = z.infer<typeof incomeFormSchema>;

export const OtherIncomePage: React.FC = () => {
  const { tenantId, storeId } = useAuth();
  const { notify } = useNotify();
  const { t } = useTranslation();
  
  const [records, setRecords] = useState<OtherIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      notes: '',
    },
  });

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await otherIncome.list(tenantId, storeId || undefined);
      setRecords(data);
    } catch (err: any) {
      notify(err.message || 'Failed to load other income records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchRecords();
    }
  }, [tenantId, storeId]);

  const onSubmit = async (values: IncomeFormValues) => {
    setSubmitting(true);
    try {
      const payload: OtherIncomeFormData = {
        ...values,
        storeId: storeId || undefined,
      } as OtherIncomeFormData;
      await otherIncome.create(tenantId, payload);
      notify('Other income recorded successfully', 'success');
      setIsDrawerOpen(false);
      reset({
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: 0,
        notes: '',
      });
      fetchRecords();
    } catch (err: any) {
      notify(err.message || 'Failed to record income', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await otherIncome.remove(id);
      notify('Record deleted successfully', 'success');
      fetchRecords();
    } catch (err: any) {
      notify(err.message || 'Failed to delete record', 'error');
    }
  };

  // Calculations
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const totalThisMonth = records
    .filter((r) => {
      const d = new Date(r.date);
      return isWithinInterval(d, { start: monthStart, end: monthEnd });
    })
    .reduce((sum, r) => sum + r.amount, 0);

  const totalAllTime = records.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="dashboard-container p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-warm-surface p-4 rounded-xl border border-warm-border-warm shadow-sm">
        <div>
          <h1 className="text-xl font-display font-black text-warm-fg tracking-tight">{t('nav.otherIncome')}</h1>
          <p className="text-xs text-warm-muted">Record and monitor all secondary business earnings</p>
        </div>

        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-2 py-2.5 px-4 bg-warm-accent hover:bg-warm-accent-light text-white font-semibold text-xs rounded-xl shadow-level-2 transition-all duration-200 animate-fade-in"
        >
          <Plus size={16} />
          Record Income
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card !bg-warm-surface border border-warm-border-warm rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-warm-success/15 flex items-center justify-center text-warm-success">
            <Banknote size={24} />
          </div>
          <div>
            <p className="text-xs text-warm-dim font-bold uppercase tracking-wider">This Month's Other Income</p>
            <h3 className="text-2xl font-black text-warm-fg mt-1">{formatCurrency(totalThisMonth)}</h3>
          </div>
        </div>

        <div className="card !bg-warm-surface border border-warm-border-warm rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-warm-accent/15 flex items-center justify-center text-warm-accent">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-xs text-warm-dim font-bold uppercase tracking-wider">Total Ledger Earnings</p>
            <h3 className="text-2xl font-black text-warm-fg mt-1">{formatCurrency(totalAllTime)}</h3>
          </div>
        </div>
      </div>

      {/* Datatable */}
      <div className="bg-warm-surface rounded-xl border border-warm-border-warm overflow-hidden shadow-sm">
        <div className="p-4 border-b border-warm-border-warm bg-warm-bg/50">
          <h2 className="text-sm font-bold text-warm-fg">Recent Postings</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-warm-dim flex items-center justify-center gap-2">
            <Loader2 className="animate-spin text-warm-accent" size={20} />
            Loading records...
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-warm-muted flex flex-col items-center justify-center gap-3">
            <Info size={36} className="opacity-30" />
            <p className="text-sm font-semibold">No other income recorded yet.</p>
            <p className="text-xs">Click the button above to post your first non-sales transaction.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-warm-bg/50 text-[10px] uppercase font-bold text-warm-muted tracking-wider border-b border-warm-border-warm">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 w-12 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border-warm text-xs">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-warm-bg/30">
                    <td className="py-3 px-4 text-warm-fg font-medium">
                      {format(new Date(r.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        r.category === 'Display Fee' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                        r.category === 'Delivery' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300' :
                        'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/20 dark:text-zinc-300'
                      }`}>
                        {r.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-warm-muted font-semibold">{r.paymentMethod}</td>
                    <td className="py-3 px-4 text-warm-dim italic max-w-[200px] truncate" title={r.notes}>
                      {r.notes || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-warm-fg text-sm">{formatCurrency(r.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 text-warm-muted hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Income Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Record Other Income"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-warm-muted uppercase tracking-wider mb-1">
              Date *
            </label>
            <input
              type="date"
              {...register('date')}
              className={`w-full bg-white dark:bg-zinc-900 border px-3 py-2 rounded-xl focus:ring-1 focus:ring-warm-accent transition text-xs ${
                errors.date ? 'border-red-500 focus:ring-red-500' : 'border-warm-border-warm'
              }`}
            />
            {errors.date && (
              <span className="text-[10px] text-red-500 font-semibold mt-1 block">
                {errors.date.message}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-warm-muted uppercase tracking-wider mb-1">
              Category *
            </label>
            <select
              {...register('category')}
              className={`w-full bg-white dark:bg-zinc-900 border px-3 py-2 rounded-xl focus:ring-1 focus:ring-warm-accent transition text-xs ${
                errors.category ? 'border-red-500 focus:ring-red-500' : 'border-warm-border-warm'
              }`}
            >
              <option value="">Select category...</option>
              <option value="Display Fee">Display Fee</option>
              <option value="Delivery">Delivery</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>
            {errors.category && (
              <span className="text-[10px] text-red-500 font-semibold mt-1 block">
                {errors.category.message}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-warm-muted uppercase tracking-wider mb-1">
              Payment Method *
            </label>
            <select
              {...register('paymentMethod')}
              className={`w-full bg-white dark:bg-zinc-900 border px-3 py-2 rounded-xl focus:ring-1 focus:ring-warm-accent transition text-xs ${
                errors.paymentMethod ? 'border-red-500 focus:ring-red-500' : 'border-warm-border-warm'
              }`}
            >
              <option value="">Select method...</option>
              <option value="Cash">Cash</option>
              <option value="bKash">bKash</option>
              <option value="Bank">Bank</option>
            </select>
            {errors.paymentMethod && (
              <span className="text-[10px] text-red-500 font-semibold mt-1 block">
                {errors.paymentMethod.message}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-warm-muted uppercase tracking-wider mb-1">
              Amount (৳) *
            </label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 5000"
              onChange={(e) => setValue('amount', parseFloat(e.target.value))}
              className={`w-full bg-white dark:bg-zinc-900 border px-3 py-2 rounded-xl focus:ring-1 focus:ring-warm-accent transition text-xs ${
                errors.amount ? 'border-red-500 focus:ring-red-500' : 'border-warm-border-warm'
              }`}
            />
            {errors.amount && (
              <span className="text-[10px] text-red-500 font-semibold mt-1 block">
                {errors.amount.message}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-warm-muted uppercase tracking-wider mb-1">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Provide transaction details or descriptions..."
              className="w-full bg-white dark:bg-zinc-900 border border-warm-border-warm px-3 py-2 rounded-xl focus:ring-1 focus:ring-warm-accent transition text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-warm-border-warm">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="py-2.5 px-4 bg-warm-bg hover:bg-warm-border-warm text-warm-fg border border-warm-border-warm font-semibold text-xs rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="py-2.5 px-5 bg-warm-accent hover:bg-warm-accent-light text-white font-semibold text-xs rounded-xl shadow-level-2 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  Saving...
                </>
              ) : (
                <>
                  Save Record
                </>
              )}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default OtherIncomePage;
