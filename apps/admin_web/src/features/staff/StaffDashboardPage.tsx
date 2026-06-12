import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, Key, Shield, Loader2, CheckCircle2, 
  TrendingUp, DollarSign, ShoppingBag, Calendar
} from 'lucide-react';
import { staff } from '../../lib/api/domains/staff';
import { useAuth } from '../../lib/AuthContext';
import { useNotify } from '../../components/NotificationContext';
import { Modal } from '../../components/ui/Modal';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../lib/format';

export const StaffDashboardPage: React.FC = () => {
  const { storeId } = useAuth();
  const { notify } = useNotify();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaffName, setSelectedStaffName] = useState<string>('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // 1) Fetch Store Users
  const { data: staffList = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['staff', storeId],
    queryFn: () => staff.list(storeId),
    enabled: !!storeId,
  });

  // 2) Fetch Staff Performance metrics for today (last 1 day)
  const { data: performanceList = [], isLoading: loadingPerformance } = useQuery({
    queryKey: ['staff-performance', storeId],
    queryFn: () => staff.getPerformance(storeId, 1),
    enabled: !!storeId,
  });

  // 3) PIN Mutation
  const updatePinMutation = useMutation({
    mutationFn: ({ userId, pin }: { userId: string; pin: string }) => staff.updatePin(userId, pin),
    onSuccess: () => {
      notify('Staff PIN updated successfully', 'success');
      setIsPinModalOpen(false);
      setPinValue('');
      setPinError(null);
      queryClient.invalidateQueries({ queryKey: ['staff', storeId] });
    },
    onError: (err: any) => {
      notify(err.message || 'Failed to update PIN', 'error');
    },
  });

  const handleOpenPinModal = (userId: string, name: string) => {
    setSelectedStaffId(userId);
    setSelectedStaffName(name);
    setPinValue('');
    setPinError(null);
    setIsPinModalOpen(true);
  };

  const handlePinChange = (val: string) => {
    setPinValue(val);
    if (val.length > 0 && (val.length !== 4 || !/^[0-9]+$/.test(val))) {
      setPinError('PIN must be exactly 4 digits');
    } else {
      setPinError(null);
    }
  };

  const onPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinValue.length !== 4 || !/^[0-9]+$/.test(pinValue)) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }

    if (selectedStaffId) {
      updatePinMutation.mutate({ userId: selectedStaffId, pin: pinValue });
    }
  };

  // Aggregated KPIs
  const totalSalesToday = performanceList.reduce((sum, p) => sum + p.totalSales, 0);
  const totalRevenueToday = performanceList.reduce((sum, p) => sum + p.totalRevenue, 0);

  return (
    <div className="dashboard-container p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-warm-surface p-4 rounded-xl border border-warm-border-warm shadow-sm">
        <div>
          <h1 className="text-xl font-display font-black text-warm-fg tracking-tight">{t('nav.manageStaff')}</h1>
          <p className="text-xs text-warm-muted">Monitor cashier performance and secure system access credentials</p>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card !bg-warm-surface border border-warm-border-warm rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-warm-accent/15 flex items-center justify-center text-warm-accent">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs text-warm-dim font-bold uppercase tracking-wider">Active Store Staff</p>
            <h3 className="text-2xl font-black text-warm-fg mt-1">
              {loadingStaff ? '...' : staffList.length} Members
            </h3>
          </div>
        </div>

        <div className="card !bg-warm-surface border border-warm-border-warm rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-warm-success/15 flex items-center justify-center text-warm-success">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-xs text-warm-dim font-bold uppercase tracking-wider">Total Orders Today</p>
            <h3 className="text-2xl font-black text-warm-fg mt-1">
              {loadingPerformance ? '...' : totalSalesToday} Orders
            </h3>
          </div>
        </div>

        <div className="card !bg-warm-surface border border-warm-border-warm rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-500">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs text-warm-dim font-bold uppercase tracking-wider">Sales processed today</p>
            <h3 className="text-2xl font-black text-warm-fg mt-1">
              {loadingPerformance ? '...' : formatCurrency(totalRevenueToday)}
            </h3>
          </div>
        </div>
      </div>

      {/* Staff Grid */}
      {loadingStaff ? (
        <div className="p-8 text-center text-warm-dim flex items-center justify-center gap-2">
          <Loader2 className="animate-spin text-warm-accent" size={20} />
          Loading store users...
        </div>
      ) : staffList.length === 0 ? (
        <div className="p-12 text-center text-warm-muted flex flex-col items-center justify-center gap-3">
          <Users size={36} className="opacity-30" />
          <p className="text-sm font-semibold">No store users found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staffList.map((member) => {
            const performance = performanceList.find((p) => p.userId === member.id);
            
            return (
              <div 
                key={member.id} 
                className="card !bg-warm-surface border border-warm-border-warm rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200"
              >
                {/* Upper Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-display font-black text-warm-fg text-base">{member.fullName}</h3>
                      <p className="text-[10px] text-warm-muted uppercase tracking-wider mt-0.5">{member.email}</p>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                      member.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                      member.role === 'manager' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' :
                      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                    }`}>
                      {member.role}
                    </span>
                  </div>

                  {/* Performance stats processed today */}
                  <div className="p-3.5 bg-warm-bg/40 border border-warm-border-warm rounded-xl space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-warm-muted font-medium">Orders Today:</span>
                      <span className="text-warm-fg font-bold">{performance?.totalSales || 0}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-warm-muted font-medium">Revenue Today:</span>
                      <span className="text-warm-success font-black">{formatCurrency(performance?.totalRevenue || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Details */}
                <div className="mt-6 pt-4 border-t border-warm-border-warm flex flex-col gap-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-warm-muted font-semibold">
                    <Calendar size={13} />
                    Last Login: {member.lastLogin ? format(new Date(member.lastLogin), 'MMM dd, yyyy HH:mm') : 'Never'}
                  </div>

                  <button
                    onClick={() => handleOpenPinModal(member.id, member.fullName)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-warm-bg hover:bg-warm-border-warm border border-warm-border-warm text-warm-fg font-bold text-xs rounded-xl transition"
                  >
                    <Key size={13} />
                    Reset/Assign PIN
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PIN Reset Modal */}
      <Modal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        title={`Reset PIN for ${selectedStaffName}`}
        className="max-w-md"
      >
        <form onSubmit={onPinSubmit} className="space-y-4">
          <div className="p-3.5 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-xl flex items-start gap-2.5">
            <Shield className="text-yellow-600 flex-shrink-0 mt-0.5" size={16} />
            <p className="text-[11px] text-yellow-700 dark:text-yellow-300 leading-normal font-semibold">
              PIN must be exactly 4 numeric digits. Hashing is done safely in the database layer immediately upon saving.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-warm-muted uppercase tracking-wider mb-1">
              New 4-Digit PIN *
            </label>
            <input
              type="password"
              maxLength={4}
              value={pinValue}
              onChange={(e) => handlePinChange(e.target.value)}
              placeholder="e.g. 1234"
              className={`w-full bg-white dark:bg-zinc-900 border px-3 py-2 rounded-xl focus:ring-1 focus:ring-warm-accent transition text-center tracking-widest text-lg font-black ${
                pinError ? 'border-red-500 focus:ring-red-500' : 'border-warm-border-warm'
              }`}
            />
            {pinError && (
              <span className="text-[10px] text-red-500 font-semibold mt-1 block">
                {pinError}
              </span>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-warm-border-warm">
            <button
              type="button"
              onClick={() => setIsPinModalOpen(false)}
              className="py-2.5 px-4 bg-warm-bg hover:bg-warm-border-warm text-warm-fg border border-warm-border-warm font-semibold text-xs rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatePinMutation.isPending}
              className="py-2.5 px-5 bg-warm-accent hover:bg-warm-accent-light text-white font-semibold text-xs rounded-xl shadow-level-2 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {updatePinMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  Saving...
                </>
              ) : (
                <>
                  Save PIN
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StaffDashboardPage;
