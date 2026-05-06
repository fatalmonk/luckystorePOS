import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { ErrorState, EmptyState, SkeletonBlock, SkeletonRow } from '../../components/PageState';
import { Users, CreditCard, FileText, UserPlus, Save, Check, ToggleLeft, ToggleRight } from 'lucide-react';
import { clsx } from 'clsx';
import { AddUserModal } from './AddUserModal';
import { AddPaymentMethodModal } from './AddPaymentMethodModal';
import { PageHeader } from '../../components/layout/PageHeader';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  cashier: 'Staff',
};

export function SettingsPage() {
  const { storeId } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'payments' | 'receipt'>('users');

  return (
    <div className="settings-container">
      <PageHeader 
        title="Settings" 
        subtitle="Manage your shop's users and configuration." 
      />

      <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
        {/* Vertical Tabs */}
        <aside style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <button
            onClick={() => setActiveTab('users')}
            className={clsx('tab-btn', activeTab === 'users' && 'active')}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)', border: 'none', textAlign: 'left', fontWeight: '600',
              backgroundColor: activeTab === 'users' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'users' ? '#000' : 'var(--text-muted)'
            }}
          >
            <Users size={18} /> Users & Roles
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={clsx('tab-btn', activeTab === 'payments' && 'active')}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)', border: 'none', textAlign: 'left', fontWeight: '600',
              backgroundColor: activeTab === 'payments' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'payments' ? '#000' : 'var(--text-muted)'
            }}
          >
            <CreditCard size={18} /> Payment Methods
          </button>
          <button
            onClick={() => setActiveTab('receipt')}
            className={clsx('tab-btn', activeTab === 'receipt' && 'active')}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)', border: 'none', textAlign: 'left', fontWeight: '600',
              backgroundColor: activeTab === 'receipt' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'receipt' ? '#000' : 'var(--text-muted)'
            }}
          >
            <FileText size={18} /> Receipt Config
          </button>
        </aside>

        {/* Tab Content */}
        <main style={{ flex: 1 }}>
          <div className="card" style={{ padding: 'var(--space-8)' }}>
            {activeTab === 'users' && <UsersSettings storeId={storeId} />}
            {activeTab === 'payments' && <PaymentsSettings storeId={storeId} />}
            {activeTab === 'receipt' && <ReceiptSettings storeId={storeId} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function UsersSettings({ storeId }: { storeId: string }) {
  const { tenantId } = useAuth();
  const [showAddUser, setShowAddUser] = useState(false);
  const { data: users, isLoading, isError, refetch } = useQuery({
    queryKey: ['settings-users', storeId],
    queryFn: () => api.settings.getUsers(storeId),
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700' }}>Users & Roles</h2>
        <button
          className="button-primary"
          onClick={() => setShowAddUser(true)}
          style={{ padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary)', color: '#000', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}
        >
          <UserPlus size={18} /> Add User
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
          <tr>
            <th style={{ paddingBottom: 'var(--space-3)' }}>Full Name</th>
            <th style={{ paddingBottom: 'var(--space-3)' }}>Email</th>
            <th style={{ paddingBottom: 'var(--space-3)' }}>Role</th>
            <th style={{ paddingBottom: 'var(--space-3)' }}>Last Login</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array(3).fill(0).map((_, i) => <SkeletonRow key={i} cols={4} />)
          ) : isError ? (
            <tr>
              <td colSpan={4}>
                <ErrorState message="Failed to load users." onRetry={() => refetch()} />
              </td>
            </tr>
          ) : users?.length === 0 ? (
            <tr>
              <td colSpan={4}>
                <EmptyState
                  icon={<Users size={48} />}
                  title="No users yet"
                  description="Add your first team member to get started."
                  action={<button className="button-primary" onClick={() => setShowAddUser(true)}><UserPlus size={18} /> Add User</button>}
                />
              </td>
            </tr>
          ) : (
            users?.map((u: any) => (
              <tr key={u.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <td style={{ padding: 'var(--space-4) 0', fontWeight: '600' }}>{u.full_name || u.name || '—'}</td>
                <td style={{ padding: 'var(--space-4) 0' }}>{u.email || '—'}</td>
                <td style={{ padding: 'var(--space-4) 0' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '12px', fontSize: 'var(--font-size-xs)', fontWeight: '700',
                    backgroundColor: u.role === 'admin' ? 'rgba(251, 191, 36, 0.15)' : u.role === 'manager' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                    color: u.role === 'admin' ? 'var(--color-primary-hover)' : u.role === 'manager' ? 'var(--color-success)' : 'var(--text-muted)',
                    textTransform: 'uppercase'
                  }}>{ROLE_LABELS[u.role] || u.role}</span>
                </td>
                <td style={{ padding: 'var(--space-4) 0', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                  {u.last_login || u.last_login_at ? new Date(u.last_login || u.last_login_at).toLocaleDateString('en-GB') : 'Never'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <AddUserModal
        isOpen={showAddUser}
        storeId={storeId}
        tenantId={tenantId}
        onClose={() => setShowAddUser(false)}
      />
    </div>
  );
}

function PaymentsSettings({ storeId }: { storeId: string }) {
  const [showAddMethod, setShowAddMethod] = useState(false);
  const queryClient = useQueryClient();
  const { data: payments, isLoading, isError, refetch: refetchPayments } = useQuery({
    queryKey: ['settings-payments', storeId],
    queryFn: () => api.settings.getPaymentMethods(storeId),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.settings.togglePaymentMethod(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-payments'] });
    },
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700' }}>Payment Methods</h2>
        <button
          className="button-primary"
          onClick={() => setShowAddMethod(true)}
          style={{ padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary)', color: '#000', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}
        >
          <CreditCard size={18} /> Add Method
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {isLoading ? (
          <SkeletonBlock className="h-[200px] w-full" />
        ) : isError ? (
          <ErrorState message="Failed to load payment methods." onRetry={() => refetchPayments()} />
        ) : payments?.length === 0 ? (
          <EmptyState
            icon={<CreditCard size={48} />}
            title="No payment methods"
            description="Add your first payment method to start accepting payments."
            action={<button className="button-primary" onClick={() => setShowAddMethod(true)}><CreditCard size={18} /> Add Method</button>}
          />
        ) : (
          payments?.map((pm: any) => (
            <div key={pm.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)' }}>
                  <CreditCard size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: '700' }}>{pm.name}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{pm.type?.replace('_', ' ')}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <button
                  onClick={() => toggleMutation.mutate({ id: pm.id, isActive: !pm.is_active })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-1) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: pm.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                    border: 'none',
                    cursor: 'pointer',
                    color: pm.is_active ? 'var(--color-success)' : 'var(--text-muted)',
                    fontWeight: '600',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  {pm.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  {pm.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <AddPaymentMethodModal
        isOpen={showAddMethod}
        storeId={storeId}
        onClose={() => setShowAddMethod(false)}
      />
    </div>
  );
}

function ReceiptSettings({ storeId }: { storeId: string }) {
  const queryClient = useQueryClient();
  const { data: config, isLoading, isError, refetch: refetchConfig } = useQuery({
    queryKey: ['settings-receipt', storeId],
    queryFn: () => api.settings.getReceiptConfig(storeId),
  });

  const [formData, setFormData] = useState<any>({
    store_name: '',
    header_text: '',
    footer_text: ''
  });

  // Hydrate form once data is loaded
  useEffect(() => {
    if (config) {
      setFormData({
        store_name: config.store_name || '',
        header_text: config.header_text || '',
        footer_text: config.footer_text || ''
      });
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (newConfig: any) => api.settings.updateReceiptConfig(storeId, newConfig),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-receipt'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) return <SkeletonBlock className="h-[300px] w-full" />;

  if (isError) {
    return <ErrorState message="Failed to load receipt config." onRetry={() => refetchConfig()} />;
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
      <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', marginBottom: 'var(--space-6)' }}>Receipt Configuration</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div className="form-group">
          <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: 'var(--space-1)' }}>Store Name (on receipt)</label>
          <input
            type="text"
            value={formData.store_name}
            onChange={e => setFormData({...formData, store_name: e.target.value})}
            placeholder="Lucky Store"
            className="input w-full"
          />
        </div>

        <div className="form-group">
          <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: 'var(--space-1)' }}>Header Message</label>
          <textarea
            value={formData.header_text}
            onChange={e => setFormData({...formData, header_text: e.target.value})}
            placeholder="Welcome to Lucky Store!"
            className="input w-full min-h-[80px]"
          />
        </div>

        <div className="form-group">
          <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: 'var(--space-1)' }}>Footer Message</label>
          <textarea
            value={formData.footer_text}
            onChange={e => setFormData({...formData, footer_text: e.target.value})}
            placeholder="No returns without receipt. Thank you!"
            className="input w-full min-h-[80px]"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="button-primary"
          >
            {updateMutation.isPending ? 'Saving...' : <><Save size={18} /> Save Settings</>}
          </button>
          {updateMutation.isSuccess && (
            <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', fontSize: 'var(--font-size-sm)' }}>
              <Check size={16} /> Saved Successfully
            </span>
          )}
        </div>
      </div>
    </form>
  );
}