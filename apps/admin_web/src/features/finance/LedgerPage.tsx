import React, { useEffect, useState, useCallback, useMemo, useId } from 'react';
import { supabase } from '../../lib/supabase';
import type { Party, LedgerEntry } from '../../types/finance';
import { format } from 'date-fns';
import type { LucideIcon } from 'lucide-react';
import { Plus, Trash2 } from 'lucide-react';
import { ErrorState, EmptyState, SkeletonBlock, SkeletonCard } from '../../components/PageState';
import { PageHeader } from '../../components/layout/PageHeader';
import { Drawer } from '../../components/ui/Drawer';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../lib/AuthContext';
import { useNotify } from '../../components/NotificationContext';

interface TransactionItem {
  id: string;
  description: string;
  amount: string;
  item_id?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  price: number;
  mrp?: number;
}

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
  const [searchQuery, setSearchQuery] = useState('');
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  // Transaction recording state
  const [showRecordTransaction, setShowRecordTransaction] = useState(false);
  const [transactionType, setTransactionType] = useState<'debit' | 'credit'>(partyType === 'customer' ? 'credit' : 'debit');
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [transactionNote, setTransactionNote] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([{ id: '1', description: '', amount: '' }]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const { tenantId, user, storeId } = useAuth();
  const { notify } = useNotify();

  // Calculate total from items
  const totalAmount = useMemo(() => {
    return transactionItems.reduce((sum, item) => {
      const amt = parseFloat(item.amount);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
  }, [transactionItems]);

  // Reset transaction form
  const resetTransactionForm = useCallback(() => {
    setTransactionType(partyType === 'customer' ? 'credit' : 'debit');
    setTransactionDate(format(new Date(), 'yyyy-MM-dd'));
    setTransactionNote('');
    setTransactionReference('');
    setTransactionItems([{ id: String(Date.now() + Math.random()), description: '', amount: '' }]);
  }, [partyType]);

  // Handle close modal
  const handleCloseModal = useCallback(() => {
    setShowRecordTransaction(false);
    resetTransactionForm();
  }, [resetTransactionForm]);

  // Fetch inventory items when modal opens
  const fetchInventoryItems = useCallback(async () => {
    if (!storeId) return;
    setLoadingInventory(true);
    const { data, error } = await supabase
      .from('items')
      .select('id, name, sku, price, mrp')
      .eq('store_id', storeId)
      .eq('active', true)
      .order('name');
    if (!error && data) {
      setInventoryItems(data as InventoryItem[]);
    }
    setLoadingInventory(false);
  }, [storeId]);

  // Load inventory when modal opens
  useEffect(() => {
    if (showRecordTransaction) {
      fetchInventoryItems();
    }
  }, [showRecordTransaction, fetchInventoryItems]);

  // Add item from inventory
  const addInventoryItem = useCallback((item: InventoryItem) => {
    setTransactionItems(prev => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        item_id: item.id,
        description: item.name,
        amount: String(item.price || 0)
      }
    ]);
  }, []);


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

  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

  const fetchLedger = useCallback(async () => {
    if (!selectedParty) return;
    // Validate date range
    if (dateFrom && dateTo && dateFrom > dateTo) {
      notify('From date must be before To date', 'error');
      return;
    }
    let query = supabase
      .from('ledger_entries')
      .select('*')
      .eq('party_id', selectedParty.id);
    if (dateFrom) {
      query = query.gte('effective_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('effective_date', dateTo);
    }
    const { data, error } = await query.order('effective_date', { ascending: false });
    if (!error && data) {
      setLedgerEntries(data as LedgerEntry[]);
    }
  }, [selectedParty, dateFrom, dateTo, notify]);

  // Refetch ledger when date range changes
  useEffect(() => {
    if (selectedParty) {
      fetchLedger();
    }
  }, [dateFrom, dateTo, fetchLedger]);

  // compute running balances in chronological order
  const entriesWithBalance = useMemo(() => {
    if (!ledgerEntries) return [];
    const sorted = [...ledgerEntries].sort((a, b) => {
      const dateA = new Date(a.effective_date).getTime();
      const dateB = new Date(b.effective_date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      const createdA = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
      const createdB = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
      return createdA - createdB;
    });
    let balance = 0;
    const withBal = sorted.map(entry => {
      balance += balanceSign * (entry.debit_amount - entry.credit_amount);
      return { ...entry, runningBalance: balance };
    });
    return withBal.reverse();
  }, [ledgerEntries, balanceSign]);

  // CSV export function
  const exportCSV = useCallback(() => {
    if (!selectedParty || entriesWithBalance.length === 0) return;
    const escapeCsv = (val: string | number | null) => {
      const str = val?.toString() ?? '';
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const headers = ['Date', 'Reference Type', 'Reference ID', 'Debit Amount', 'Credit Amount', 'Balance'];
    const rows = entriesWithBalance.map(entry => [
      format(new Date(entry.effective_date), 'yyyy-MM-dd'),
      entry.reference_type ?? '',
      entry.reference_id ?? '',
      entry.debit_amount ?? 0,
      entry.credit_amount ?? 0,
      (entry as any).runningBalance ?? 0
    ]);
    const csvContent = '\uFEFF' + headers.map(escapeCsv).join(',') + '\n' +
      rows.map(row => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedParty.name}_ledger_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [selectedParty, entriesWithBalance]);

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


  return (
    <div className="dashboard-container">
      <PageHeader title={title} subtitle={subtitle} actions={
        <button className="button-primary" onClick={() => setShowAddParty(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
          <Plus size={18} /> Add {partyType === 'supplier' ? 'Supplier' : 'Customer'}
        </button>
      } />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-6)' }}>
        {/* Party List */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <input
            className="input w-full"
            placeholder={`Search ${partyType}s...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          {parties.length === 0 ? (
            <div className="card col-[1/-1]">
              <EmptyState
                icon={<Icon size={48} />}
                title={emptyTitle}
                description={emptyDescription}
              />
            </div>
          ) : (
            parties.filter(p => {
              const q = searchQuery.toLowerCase();
              return p.name.toLowerCase().includes(q) || (p.phone && p.phone.toLowerCase().includes(q));
            }).length === 0 ? (
              <EmptyState
                icon={<Icon size={48} />}
                title="No matches found"
                description="Try a different search term."
              />
            ) : (
              parties.filter(p => {
                const q = searchQuery.toLowerCase();
                return p.name.toLowerCase().includes(q) || (p.phone && p.phone.toLowerCase().includes(q));
              }).map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedParty(p);
                    setDateFrom(null);
                    setDateTo(null);
                    setLedgerEntries([]);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-lg)',
                    border: selectedParty?.id === p.id ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                    backgroundColor: selectedParty?.id === p.id ? 'var(--color-primary-subtle)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    boxShadow: selectedParty?.id === p.id ? 'var(--shadow-md)' : 'var(--shadow-sm)'
                  }}
                  className="card"
                >
                  <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{p.name}</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{p.phone || 'No phone'}</div>
                  <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-lg)', fontWeight: '700', color: (p.current_balance ?? 0) > 0 ? balanceColorPositive : 'var(--color-success)' }}>
                    ৳ {(p.current_balance ?? 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', marginTop: '2px' }}>
                    {balanceLabel}
                  </div>
                </button>
              ))
            )
          )}
        </div>

        {/* Ledger Detail */}
        {selectedParty ? (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Ledger Detail Header with Date Filters */}
            <div style={{
              padding: 'var(--space-4)',
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'var(--color-background-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 'var(--space-4)'
            }}>
              <div>
                <h2 style={{ fontWeight: '700', color: 'var(--text-main)' }}>{selectedParty.name}</h2>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{statementSubtitle}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--text-muted)' }}>From</label>
                  <input
                    type="date"
                    className="input"
                    style={{ width: '140px' }}
                    value={dateFrom || ''}
                    onChange={e => setDateFrom(e.target.value || null)}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--text-muted)' }}>To</label>
                  <input
                    type="date"
                    className="input"
                    style={{ width: '140px' }}
                    value={dateTo || ''}
                    onChange={e => setDateTo(e.target.value || null)}
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <button
                    type="button"
                    className="button-outline"
                    onClick={() => {
                      setDateFrom(null);
                      setDateTo(null);
                    }}
                    style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--space-1) var(--space-2)' }}
                  >
                    Clear
                  </button>
                )}
                <button
                  className="button-primary"
                  onClick={() => setShowRecordTransaction(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Plus size={16} /> Record Transaction
                </button>
                <button
                  className="button-outline"
                  onClick={() => window.print()}
                >
                  Print Statement
                </button>
                <button
                  className="button-outline"
                  onClick={exportCSV}
                  disabled={entriesWithBalance.length === 0}
                  title={entriesWithBalance.length === 0 ? 'No entries to export' : 'Export ledger to CSV'}
                >
                  Export CSV
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{
                    textAlign: 'left',
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: 'var(--color-background-subtle)',
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
                  ) : entriesWithBalance.map((entry) => (
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
                        ৳ {(entry as any).runningBalance.toLocaleString()}
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

      {/* Record Transaction Modal */}
      <Modal isOpen={showRecordTransaction} onClose={handleCloseModal} title={selectedParty ? `Record Transaction for ${selectedParty.name}` : 'Record Transaction'}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!selectedParty) return;

          // Validate items
          const validItems = transactionItems.filter(
            item => item.description.trim() && parseFloat(item.amount) > 0
          );
          if (validItems.length === 0) {
            notify('Please add at least one valid item with description and amount', 'error');
            return;
          }

          const amount = totalAmount;
          if (!amount || amount <= 0) {
            notify('Total amount must be greater than 0', 'error');
            return;
          }

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const selected = new Date(transactionDate);
          selected.setHours(0, 0, 0, 0);
          if (selected > today) {
            notify('Date cannot be in the future', 'error');
            return;
          }

          // Build notes with items breakdown
          const itemsBreakdown = validItems
            .map(item => `- ${item.description}: ৳${parseFloat(item.amount).toLocaleString()}`)
            .join('\n');
          const enhancedNotes = `Items:\n${itemsBreakdown}\nTotal: ৳${amount.toLocaleString()}${transactionNote.trim() ? '\n\n' + transactionNote.trim() : ''}`;

          setIsSubmitting(true);
          const { data, error } = await supabase.from('ledger_entries').insert([{
            tenant_id: tenantId,
            party_id: selectedParty.id,
            effective_date: transactionDate,
            reference_type: transactionType === 'debit' ? (partyType === 'customer' ? 'sale' : 'purchase') : 'payment',
            reference_id: transactionReference.trim() || null,
            debit_amount: transactionType === 'debit' ? amount : 0,
            credit_amount: transactionType === 'credit' ? amount : 0,
            notes: enhancedNotes,
            created_by: user?.id || null,
          }]).select().single();
          setIsSubmitting(false);
          if (error) {
            notify(error.message, 'error');
            return;
          }
          // Optimistic update
          const newEntry = data as LedgerEntry;
          setLedgerEntries(prev => [newEntry, ...prev].sort((a, b) => 
            new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()
          ));
          // Update party balance
          const amountChange = transactionType === 'debit' ? amount : -amount;
          setParties(prev => prev.map(p => 
            p.id === selectedParty.id 
              ? { ...p, current_balance: (p.current_balance ?? 0) + balanceSign * amountChange }
              : p
          ));
          // Reset form and close
          handleCloseModal();
          notify('Transaction recorded successfully', 'success');
        }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: 'var(--space-1)' }}>Type *</label>
            <select 
              value={transactionType} 
              onChange={e => setTransactionType(e.target.value as 'debit' | 'credit')} 
              className="input w-full"
            >
              {partyType === 'customer' ? (
                <>
                  <option value="credit">Payment Received</option>
                  <option value="debit">Sale / Invoice</option>
                </>
              ) : (
                <>
                  <option value="debit">Payment Made</option>
                  <option value="credit">Purchase / Bill</option>
                </>
              )}
            </select>
          </div>

          {/* Items Section */}
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: '4px' }}>Items</label>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Add one or more line items</p>
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-background-subtle)' }}>
                    <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--text-muted)' }}>Description</th>
                    <th style={{ padding: 'var(--space-3)', textAlign: 'right', fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--text-muted)' }}>Amount (৳)</th>
                    <th style={{ padding: 'var(--space-3)', textAlign: 'center', fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--text-muted)', width: '50px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionItems.map((item, index) => (
                    <tr key={item.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <input
                          type="text"
                          className="input w-full"
                          placeholder="Item description"
                          value={item.description}
                          onChange={e => {
                            const newItems = [...transactionItems];
                            newItems[index].description = e.target.value;
                            setTransactionItems(newItems);
                          }}
                        />
                      </td>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <input
                          type="number"
                          className="input"
                          style={{ width: '120px', textAlign: 'right' }}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          value={item.amount}
                          onChange={e => {
                            const newItems = [...transactionItems];
                            newItems[index].amount = e.target.value;
                            setTransactionItems(newItems);
                          }}
                        />
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="button-outline"
                          style={{ padding: '6px', minWidth: 'auto' }}
                          disabled={transactionItems.length <= 1}
                          onClick={() => {
                            if (transactionItems.length > 1) {
                              setTransactionItems(prev => prev.filter((_, i) => i !== index));
                            }
                          }}
                          title={transactionItems.length <= 1 ? 'Must have at least one item' : 'Remove item'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-3)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  type="button"
                  className="button-outline"
                  onClick={() => setTransactionItems(prev => [...prev, { id: String(Date.now() + Math.random()), description: '', amount: '' }])}
                >
                  + Add Item
                </button>
                {inventoryItems.length > 0 && (
                  <select
                    className="input"
                    value=""
                    onChange={e => {
                      const itemId = e.target.value;
                      if (itemId) {
                        const item = inventoryItems.find(i => i.id === itemId);
                        if (item) {
                          addInventoryItem(item);
                        }
                        e.target.value = '';
                      }
                    }}
                    style={{ minWidth: '180px' }}
                  >
                    <option value="">+ From Inventory...{loadingInventory && ' Loading...'}</option>
                    {inventoryItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} (৳{item.price})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div style={{ fontWeight: '700', fontSize: 'var(--font-size-lg)' }}>
                Total: ৳ {totalAmount.toLocaleString()}
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: 'var(--space-1)' }}>Date *</label>
            <input 
              type="date" 
              value={transactionDate} 
              onChange={e => setTransactionDate(e.target.value)} 
              className="input w-full" 
              required 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: 'var(--space-1)' }}>Reference</label>
            <input 
              type="text" 
              value={transactionReference} 
              onChange={e => setTransactionReference(e.target.value)} 
              className="input w-full" 
              placeholder="Invoice #123 or Receipt #456"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '600', marginBottom: 'var(--space-1)' }}>Notes</label>
            <textarea 
              value={transactionNote} 
              onChange={e => setTransactionNote(e.target.value)} 
              className="input w-full" 
              placeholder="Additional notes..."
              style={{ minHeight: '80px' }}
              rows={3}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <button type="button" className="button-outline" onClick={handleCloseModal}>Cancel</button>
            <button type="submit" className="button-primary" disabled={isSubmitting}>Save Transaction</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};