import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Party, LedgerEntry } from '../../types/finance';
import { format } from 'date-fns';
import type { LucideIcon } from 'lucide-react';
import { Plus } from 'lucide-react';
import { ErrorState, EmptyState, SkeletonBlock, SkeletonCard } from '../../components/PageState';
import { PageHeader } from '../../components/layout/PageHeader';
import { Drawer } from '../../components/ui/Drawer';
import { useAuth } from '../../lib/AuthContext';
import { useNotify } from '../../components/NotificationContext';

interface LedgerPageConfig {
  partyType: 'customer' | 'supplier';
  title: string;
  subtitle: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  balanceLabel: string;
  balanceColorPositive: string; // CSS variable for positive balance
  statementSubtitle: string;
  debitLabel: string;
  creditLabel: string;
  debitColor: string; // CSS variable
  creditColor: string; // CSS variable
  balanceSign: 1 | -1; // 1 = debit - credit (customer), -1 = credit - debit (supplier)
  emptyLedgerText: string;
}

export const LedgerPage: React.FC<LedgerPageConfig> = ({
  partyType,
  title,
  subtitle,
  icon: Icon,
  emptyTitle,
  emptyDescription,
  balanceLabel,
  balanceColorPositive,
  statementSubtitle,
  debitLabel,
  creditLabel,
  debitColor,
  creditColor,
  balanceSign,
  emptyLedgerText,
}) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [showAddParty, setShowAddParty] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');
  const { tenantId } = useAuth();
  const { notify } = useNotify();

  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

  const fetchParties = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from('parties')
      .select('*')
      .eq('type', partyType)
      .order('name');

    if (error) {
      setFetchError(error.message);
    } else if (data) {
      setParties(data as Party[]);
    }
    setLoading(false);
  }, [partyType]);

  const fetchLedger = async (party: Party) => {
    setSelectedParty(party);
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('party_id', party.id)
      .order('effective_date', { ascending: false });

    if (!error && data) {
      setLedgerEntries(data as LedgerEntry[]);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <header className="mb-8">
          <SkeletonBlock className="w-[300px] h-7" />
          <SkeletonBlock className="w-[280px] h-[18px] mt-2" />
        </header>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="dashboard-container">
        <PageHeader title={title} subtitle={subtitle} />
        <div className="card">
          <ErrorState message={`Failed to load ${partyType}s.`} onRetry={fetchParties} />
        </div>
      </div>
    );
  }

  const balanceAtPoint = (idx: number) =>
    ledgerEntries
      .slice(idx)
      .reduce((acc, curr) => acc + balanceSign * (curr.debit_amount - curr.credit_amount), 0);

  return (
    <div className="dashboard-container">
      <PageHeader title={title} subtitle={subtitle} actions={
        <button className="button-primary" onClick={() => setShowAddParty(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
          <Plus size={18} /> Add {partyType === 'supplier' ? 'Supplier' : 'Customer'}
        </button>
      } />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-6)' }}>
        {/* Party List */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          {parties.length === 0 ? (
            <div className="card col-[1/-1]">
              <EmptyState
                icon={<Icon size={48} />}
                title={emptyTitle}
                description={emptyDescription}
              />
            </div>
          ) : parties.map((p) => (
            <button
              key={p.id}
              onClick={() => fetchLedger(p)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                border: selectedParty?.id === p.id ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                backgroundColor: selectedParty?.id === p.id ? 'rgba(251, 191, 36, 0.08)' : 'var(--bg-card)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                boxShadow: selectedParty?.id === p.id ? 'var(--shadow-md)' : 'var(--shadow-sm)'
              }}
              className="card"
            >
              <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{p.name}</div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{p.phone || 'No phone'}</div>
              <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-lg)', fontWeight: '700', color: p.current_balance > 0 ? balanceColorPositive : 'var(--color-success)' }}>
                ৳ {p.current_balance.toLocaleString()}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginTop: '2px' }}>
                {balanceLabel}
              </div>
            </button>
          ))}
        </div>

        {/* Ledger Detail */}
        {selectedParty ? (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: 'var(--space-4)',
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'rgba(0,0,0,0.02)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontWeight: '700', color: 'var(--text-main)' }}>{selectedParty.name}</h2>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{statementSubtitle}</p>
              </div>
              <button
                className="button-outline"
                onClick={() => window.print()}
              >
                Print Statement
              </button>
            </div>

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
                    <th style={{ padding: 'var(--space-4)' }}>Date</th>
                    <th style={{ padding: 'var(--space-4)' }}>Reference</th>
                    <th style={{ padding: 'var(--space-4)', textAlign: 'right' }}>{debitLabel}</th>
                    <th style={{ padding: 'var(--space-4)', textAlign: 'right' }}>{creditLabel}</th>
                    <th style={{ padding: 'var(--space-4)', textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600', color: 'var(--text-main)', marginBottom: 'var(--space-1)' }}>{emptyLedgerText}</p>
                        <p style={{ fontSize: 'var(--font-size-sm)' }}>Transactions will appear once sales or payments are recorded.</p>
                      </td>
                    </tr>
                  ) : ledgerEntries.map((entry, idx) => (
                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: 'var(--space-4)', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                        {format(new Date(entry.effective_date), 'MMM dd, yyyy')}
                      </td>
                      <td style={{ padding: 'var(--space-4)' }}>
                        <div style={{ fontWeight: '500', color: 'var(--text-main)' }}>{entry.reference_type}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-light)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.reference_id}
                        </div>
                      </td>
                      <td style={{ padding: 'var(--space-4)', textAlign: 'right', color: debitColor, fontWeight: '600' }}>
                        {entry.debit_amount > 0 ? `৳ ${entry.debit_amount.toLocaleString()}` : '-'}
                      </td>
                      <td style={{ padding: 'var(--space-4)', textAlign: 'right', color: creditColor, fontWeight: '600' }}>
                        {entry.credit_amount > 0 ? `৳ ${entry.credit_amount.toLocaleString()}` : '-'}
                      </td>
                      <td style={{ padding: 'var(--space-4)', textAlign: 'right', fontWeight: '700', color: 'var(--text-main)' }}>
                        ৳ {balanceAtPoint(idx).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-12)',
            border: '2px dashed var(--border-color)',
            color: 'var(--text-muted)'
          }}>
            <Icon size={48} style={{ marginBottom: 'var(--space-4)', opacity: 0.2 }} />
            <p>Select a {partyType} to view their statement</p>
          </div>
        )}
      </div>

      <Drawer isOpen={showAddParty} onClose={() => setShowAddParty(false)} title={`Add ${partyType === 'supplier' ? 'Supplier' : 'Customer'}`}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!newPartyName.trim()) { notify('Name is required', 'error'); return; }
          const { data, error } = await supabase.from('parties').insert([{
            tenant_id: tenantId,
            type: partyType,
            name: newPartyName.trim(),
            phone: newPartyPhone.trim() || null,
          }]).select().single();
          if (error) { notify(error.message, 'error'); return; }
          if (data) setParties(prev => [...prev, data as Party]);
          setNewPartyName('');
          setNewPartyPhone('');
          setShowAddParty(false);
          notify(`${partyType === 'supplier' ? 'Supplier' : 'Customer'} added`, 'success');
        }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: 'var(--space-1)' }}>Name *</label>
            <input type="text" value={newPartyName} onChange={e => setNewPartyName(e.target.value)} className="input w-full" placeholder="Enter name" required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: 'var(--space-1)' }}>Phone</label>
            <input type="text" value={newPartyPhone} onChange={e => setNewPartyPhone(e.target.value)} className="input w-full" placeholder="Phone number" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <button type="button" className="button-outline" onClick={() => setShowAddParty(false)}>Cancel</button>
            <button type="submit" className="button-primary">Add {partyType === 'supplier' ? 'Supplier' : 'Customer'}</button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};