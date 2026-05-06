import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { Phone, MessageCircle, FileText, Check, AlertCircle, X, DollarSign, Users } from 'lucide-react';
import { format } from 'date-fns';
import { EmptyState, SkeletonCard, SkeletonBlock } from '../../components/PageState';
import { useDebounce } from '../../hooks/useDebounce';

type Receivable = {
  party_id: string;
  customer_name: string;
  phone: string;
  balance_due: number;
  days_overdue: number;
  last_note: string | null;
  promise_to_pay_date: string | null;
};

export const CollectionsWorkspace: React.FC = () => {
  const { tenantId, storeId } = useAuth();

  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Resolve the store's cash ledger account ID for the payment modal.
  const [cashAccountId, setCashAccountId] = useState<string | null>(null);
  const [cashAccountLoading, setCashAccountLoading] = useState(true);

  useEffect(() => {
    if (!storeId) {
      setCashAccountId(null);
      setCashAccountLoading(false);
      return;
    }
    setCashAccountLoading(true);
    supabase
      .from('ledger_accounts')
      .select('id')
      .eq('store_id', storeId)
      .eq('code', '1000_CASH')
      .maybeSingle()
      .then(({ data: acct }) => {
        setCashAccountId((acct?.id as string) ?? null);
        setCashAccountLoading(false);
      });
  }, [storeId]);

  // Modals
  const [selectedParty, setSelectedParty] = useState<Receivable | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  // Form states
  const [noteText, setNoteText] = useState('');
  const [promiseDate, setPromiseDate] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAging = useCallback(async () => {
    if (!tenantId || !storeId) return;
    setLoading(true);
    setFetchError(null);
    const { data, error } = await supabase.rpc('get_receivables_aging', {
      p_tenant_id: tenantId,
      p_store_id: storeId,
      p_search: debouncedSearch || null
    });

    if (!error && data) {
      setReceivables(data as Receivable[]);
    } else {
      setFetchError(error?.message ?? 'Failed to load receivables.');
    }
    setLoading(false);
  }, [tenantId, storeId, debouncedSearch]);

  useEffect(() => {
    fetchAging();
  }, [fetchAging]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty) return;
    setActionLoading(true);
    setActionError(null);

    const { error } = await supabase.rpc('add_followup_note', {
      p_tenant_id: tenantId,
      p_store_id: storeId,
      p_party_id: selectedParty.party_id,
      p_note_text: noteText,
      p_promise_date: promiseDate || null
    });

    setActionLoading(false);
    if (!error) {
      setNoteModalOpen(false);
      setNoteText('');
      setPromiseDate('');
      fetchAging();
    } else {
      setActionError(error.message);
    }
  };

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty || !paymentAmount) return;

    if (!cashAccountId) {
      setActionError('Cash account not configured for this store. Contact your administrator.');
      return;
    }

    setActionLoading(true);
    setActionError(null);

    const { error } = await supabase.rpc('record_customer_payment', {
      p_idempotency_key: `pay_${Date.now()}_${selectedParty.party_id}`,
      p_tenant_id: tenantId,
      p_store_id: storeId,
      p_party_id: selectedParty.party_id,
      p_amount: parseFloat(paymentAmount),
      p_payment_account_id: cashAccountId
    });

    setActionLoading(false);
    if (!error) {
      setPaymentModalOpen(false);
      setPaymentAmount('');
      fetchAging();
    } else {
      setActionError(error.message);
    }
  };

  const handleWhatsApp = async (r: Receivable) => {
    await supabase.rpc('log_customer_reminder', {
      p_tenant_id: tenantId,
      p_store_id: storeId,
      p_party_id: r.party_id,
      p_type: 'whatsapp'
    });

    const message = `Assalamu Alaikum ${r.customer_name},\nYour outstanding balance at Lucky Store is ৳${r.balance_due.toLocaleString()}.\nPlease clear dues at your earliest convenience.\nThank you.`;
    const url = `https://wa.me/${r.phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const totalReceivables = receivables.reduce((sum, r) => sum + r.balance_due, 0);
  const overdueCount = receivables.filter(r => r.days_overdue > 30).length;

  return (
    <div className="dashboard-container">
      <header style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '700', color: 'var(--text-main)' }}>Collections Workspace</h1>
        <p style={{ color: 'var(--text-muted)' }}>Track receivables and follow up with customers.</p>
      </header>

      {/* Fetch error banner */}
      {fetchError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3) var(--space-4)',
          marginBottom: 'var(--space-6)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-danger)'
        }}>
          <AlertCircle size={16} />
          <span>{fetchError}</span>
          <button onClick={fetchAging} style={{ marginLeft: 'var(--space-2)', background: 'none', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-danger)', padding: '2px 8px', fontSize: 'var(--font-size-xs)', fontWeight: '600' }}>Retry</button>
          <button onClick={() => setFetchError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="dashboard-grid" style={{ marginBottom: 'var(--space-6)' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500', color: 'var(--text-muted)' }}>Total Receivables</span>
              <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '700', color: 'var(--color-warning)' }}>৳ {totalReceivables.toLocaleString()}</span>
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500', color: 'var(--text-muted)' }}>Customers Overdue</span>
              <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '700', color: 'var(--color-danger)' }}>{overdueCount}</span>
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500', color: 'var(--text-muted)' }}>Active Promises</span>
              <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '700', color: 'var(--color-success)' }}>
                {receivables.filter(r => r.promise_to_pay_date).length}
              </span>
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '500', color: 'var(--text-muted)' }}>Accounts</span>
              <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '700', color: 'var(--text-main)' }}>{receivables.length}</span>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <input
          type="text"
          placeholder="Search by name or phone..."
          style={{
            width: '100%',
            maxWidth: '360px',
            padding: 'var(--space-2) var(--space-4)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-main)',
            outline: 'none'
          }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                textAlign: 'left',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: 'rgba(0,0,0,0.02)',
                color: 'var(--text-muted)',
                fontSize: 'var(--font-size-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <th style={{ padding: 'var(--space-4)' }}>Customer</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'right' }}>Amount Due</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'right' }}>Age (Days)</th>
                <th style={{ padding: 'var(--space-4)' }}>Promise Date</th>
                <th style={{ padding: 'var(--space-4)', maxWidth: '200px' }}>Latest Note</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-color)]">
                    <td className="p-4">
                      <SkeletonBlock className="w-[120px] h-4" />
                      <SkeletonBlock className="w-[80px] h-3 mt-1" />
                    </td>
                    <td className="p-4 text-right"><SkeletonBlock className="w-[80px] h-[18px] ml-auto" /></td>
                    <td className="p-4 text-right"><SkeletonBlock className="w-[40px] h-[18px] ml-auto" /></td>
                    <td className="p-4"><SkeletonBlock className="w-[100px] h-[14px]" /></td>
                    <td className="p-4"><SkeletonBlock className="w-[160px] h-[14px]" /></td>
                    <td className="p-4 text-right"><SkeletonBlock className="w-[120px] h-[30px] ml-auto" /></td>
                  </tr>
                ))
              ) : receivables.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<DollarSign size={48} />}
                      title="No outstanding receivables"
                      description="All customer dues are cleared."
                    />
                  </td>
                </tr>
              ) : receivables.map((r) => (
                <tr key={r.party_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: 'var(--space-4)' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{r.customer_name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{r.phone || 'No phone'}</div>
                  </td>
                  <td style={{ padding: 'var(--space-4)', textAlign: 'right', fontWeight: '700', color: 'var(--color-warning)' }}>
                    ৳ {r.balance_due.toLocaleString()}
                  </td>
                  <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: '600',
                      backgroundColor: r.days_overdue > 30 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0,0,0,0.05)',
                      color: r.days_overdue > 30 ? 'var(--color-danger)' : 'var(--text-muted)'
                    }}>
                      {r.days_overdue}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--space-4)' }}>
                    {r.promise_to_pay_date ? (
                      <div style={{ color: 'var(--color-success)', fontWeight: '500' }}>
                        {format(new Date(r.promise_to_pay_date), 'MMM dd, yyyy')}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-light)' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--space-4)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.last_note || '-'}
                  </td>
                  <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                      <button
                        onClick={() => handleWhatsApp(r)}
                        title="WhatsApp Reminder"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 'var(--space-2)',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          color: 'var(--color-success)',
                          cursor: 'pointer',
                          border: 'none',
                          transition: 'background-color var(--transition-fast)'
                        }}
                      >
                        <MessageCircle size={16} />
                      </button>
                      {r.phone && (
                        <a
                          href={`tel:${r.phone}`}
                          title="Call"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 'var(--space-2)',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            color: 'var(--color-info)',
                            transition: 'background-color var(--transition-fast)'
                          }}
                        >
                          <Phone size={16} />
                        </a>
                      )}
                      <button
                        onClick={() => { setSelectedParty(r); setActionError(null); setNoteModalOpen(true); }}
                        title="Add Note"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 'var(--space-2)',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-input)',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          border: 'none',
                          transition: 'background-color var(--transition-fast)'
                        }}
                      >
                        <FileText size={16} />
                      </button>
                      <button
                        onClick={() => { setSelectedParty(r); setActionError(null); setPaymentModalOpen(true); }}
                        title="Receive Payment"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 'var(--space-2)',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'rgba(245, 158, 11, 0.1)',
                          color: 'var(--color-warning)',
                          cursor: 'pointer',
                          border: 'none',
                          transition: 'background-color var(--transition-fast)'
                        }}
                      >
                        <Check size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note Modal */}
      {noteModalOpen && selectedParty && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(2px)'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', color: 'var(--text-main)', marginBottom: 'var(--space-2)' }}>Follow-up Note</h2>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
              Recording note for <strong style={{ color: 'var(--text-main)' }}>{selectedParty.customer_name}</strong>
            </p>

            {actionError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2) var(--space-3)',
                marginBottom: 'var(--space-4)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-danger)'
              }}>
                <AlertCircle size={14} />{actionError}
              </div>
            )}

            <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: '500', color: 'var(--text-muted)', marginBottom: 'var(--space-1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Note Details</label>
                <textarea
                  required
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'var(--space-3)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-main)',
                    outline: 'none',
                    minHeight: '96px',
                    resize: 'none'
                  }}
                  placeholder="E.g. Called, promised to pay next week..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: '500', color: 'var(--text-muted)', marginBottom: 'var(--space-1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Promise to Pay Date (Optional)</label>
                <input
                  type="date"
                  value={promiseDate}
                  onChange={(e) => setPromiseDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'var(--space-3)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', paddingTop: 'var(--space-4)' }}>
                <button
                  type="button"
                  onClick={() => { setNoteModalOpen(false); setActionError(null); }}
                  className="button-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="button-primary"
                  style={{ flex: 1, opacity: actionLoading ? 0.5 : 1 }}
                >
                  {actionLoading ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModalOpen && selectedParty && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(2px)'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', color: 'var(--text-main)', marginBottom: 'var(--space-4)' }}>Receive Payment</h2>
            <div style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-6)'
            }}>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>Outstanding Balance</div>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '700', color: 'var(--color-warning)' }}>৳ {selectedParty.balance_due.toLocaleString()}</div>
            </div>

            {actionError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2) var(--space-3)',
                marginBottom: 'var(--space-4)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-danger)'
              }}>
                <AlertCircle size={14} />{actionError}
              </div>
            )}

            <form onSubmit={handleReceivePayment} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: '500', color: 'var(--text-muted)', marginBottom: 'var(--space-1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount Received (৳)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedParty.balance_due}
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'var(--space-3)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-main)',
                    outline: 'none',
                    fontSize: 'var(--font-size-xl)',
                    fontWeight: '700'
                  }}
                  placeholder="0.00"
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', paddingTop: 'var(--space-4)' }}>
                <button
                  type="button"
                  onClick={() => { setPaymentModalOpen(false); setActionError(null); }}
                  className="button-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !cashAccountId}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-3) var(--space-4)',
                    backgroundColor: 'var(--color-success)',
                    color: '#fff',
                    fontWeight: '600',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    cursor: (actionLoading || !cashAccountId) ? 'not-allowed' : 'pointer',
                    opacity: (actionLoading || !cashAccountId) ? 0.5 : 1,
                    minHeight: '44px'
                  }}
                >
                  {actionLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};